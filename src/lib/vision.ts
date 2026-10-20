// Reading a photo of the space you are in.
//
// The model's job here is PERCEPTION ONLY: it looks at a photo and reports
// what equipment is visible and what the space allows. It never names an
// exercise and never designs a session. Everything it returns is validated
// against the app's own vocabulary and then handed to the same deterministic
// engine as every other session, so the level, equipment and safety rules —
// including the pain route — still apply exactly as they always do.
//
// Anything the model returns that is not in the vocabulary below is dropped,
// on the same principle as the storage layer: unrecognised input degrades to a
// safe default rather than being trusted.

import Anthropic from '@anthropic-ai/sdk';
import {
  EQUIPMENT_IDS,
  EquipmentId,
  PLACE_IDS,
  PlaceId,
  SpaceConstraints,
  SpaceNeed
} from '../types';

/** What a photo told us. Constraints only — never exercises. */
export interface SpaceScan {
  equipment: EquipmentId[];
  /** The closest matching place, when one is recognisable. */
  place: PlaceId | null;
  constraints: SpaceConstraints;
  /** One short line describing what was seen, shown back for confirmation. */
  summary: string;
}

export type ScanFailure =
  | 'no-key'
  | 'auth'
  | 'rate-limit'
  | 'offline'
  | 'unreadable'
  | 'declined'
  | 'error';

export type ScanResult =
  | {ok: true; scan: SpaceScan}
  | {ok: false; reason: ScanFailure; message: string};

/** Perception only. The vocabulary is fixed and the model is told to stay in it. */
const SYSTEM = `You look at a photograph of the space someone is about to exercise in, and report what is there.

You are a perception step, not a coach. Never name, invent or suggest an exercise, a workout or a number of repetitions. Another system chooses the movements.

Report only:
- equipment: items you can clearly SEE in the photo. Use "bodyweight" when there is no equipment. Use "full-gym" only for a real gym floor with racks or machines. Do not guess at things that might be in a cupboard.
- place: the closest match to where this looks like, or null if none fits.
- space: "floor" if there is clear room to lie down, "standing" if there is room to stand and move the arms, "seated" if there is barely room to stand up.
- discreet: true if other people are visibly around, so movements should not look unusual.
- quiet: true if this looks like somewhere that impact or thudding would disturb someone — a hotel room, an upstairs flat, a shared office.
- summary: one short sentence, under twenty words, describing what you see.

Be conservative. Listing equipment that is not there is worse than listing nothing: it leads to someone being asked to use a dumbbell they do not have.`;

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['equipment', 'place', 'space', 'discreet', 'quiet', 'summary'],
  properties: {
    equipment: {
      type: 'array',
      items: {type: 'string', enum: EQUIPMENT_IDS}
    },
    place: {type: ['string', 'null'], enum: [...PLACE_IDS, null]},
    space: {type: 'string', enum: ['seated', 'standing', 'floor']},
    discreet: {type: 'boolean'},
    quiet: {type: 'boolean'},
    summary: {type: 'string'}
  }
} as const;

export type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';

/** Narrows whatever the model returned to the app's own vocabulary. */
export function parseScan(value: unknown): SpaceScan | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;

  const equipment = Array.isArray(raw.equipment)
    ? raw.equipment.filter((item): item is EquipmentId =>
        typeof item === 'string' && (EQUIPMENT_IDS as string[]).includes(item)
      )
    : [];

  const space: SpaceNeed =
    raw.space === 'seated' || raw.space === 'standing' || raw.space === 'floor'
      ? raw.space
      : // The cautious default: assume no room to lie down.
        'standing';

  const place =
    typeof raw.place === 'string' && (PLACE_IDS as string[]).includes(raw.place)
      ? (raw.place as PlaceId)
      : null;

  return {
    // Bodyweight is always available, whatever the photo shows.
    equipment: equipment.length ? Array.from(new Set(['bodyweight' as EquipmentId, ...equipment])) : ['bodyweight'],
    place,
    constraints: {
      space,
      discreet: raw.discreet === true,
      quiet: raw.quiet === true
    },
    summary: typeof raw.summary === 'string' ? raw.summary.slice(0, 200) : ''
  };
}

export async function scanSpacePhoto(options: {
  /** Base64 image data, without a data: prefix. */
  base64: string;
  mediaType: ImageMediaType;
  apiKey: string;
  /** What the person said they want from today, in their own words. */
  goal?: string;
}): Promise<ScanResult> {
  const {base64, mediaType, apiKey, goal} = options;

  if (!apiKey.trim()) {
    return {ok: false, reason: 'no-key', message: 'No API key is set.'};
  }

  // The key belongs to the person and never leaves their device except to
  // Anthropic. There is no server of ours in this path.
  const client = new Anthropic({apiKey, dangerouslyAllowBrowser: true});

  try {
    const response = await client.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 512,
      // A perception task: low effort is the right spend here.
      output_config: {effort: 'low', format: {type: 'json_schema', schema: SCHEMA}},
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: [
            {type: 'image', source: {type: 'base64', media_type: mediaType, data: base64}},
            {
              type: 'text',
              text: goal
                ? `What is in this space? For context, today they want to: ${goal.slice(0, 200)}`
                : 'What is in this space?'
            }
          ]
        }
      ]
    });

    // A policy decline arrives as a 200 with no usable content.
    if (response.stop_reason === 'refusal') {
      return {
        ok: false,
        reason: 'declined',
        message: 'The photo could not be analysed. Choose where you are instead.'
      };
    }

    const text = response.content.find(block => block.type === 'text');
    if (!text || text.type !== 'text') {
      return {ok: false, reason: 'unreadable', message: 'No readable answer came back.'};
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text.text);
    } catch {
      return {ok: false, reason: 'unreadable', message: 'The answer was not readable.'};
    }

    const scan = parseScan(parsed);
    if (!scan) {
      return {ok: false, reason: 'unreadable', message: 'The answer was not readable.'};
    }

    return {ok: true, scan};
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return {ok: false, reason: 'auth', message: 'That API key was not accepted.'};
    }
    if (error instanceof Anthropic.RateLimitError) {
      return {ok: false, reason: 'rate-limit', message: 'Rate limited. Try again in a moment.'};
    }
    if (error instanceof Anthropic.APIConnectionError) {
      return {ok: false, reason: 'offline', message: 'Could not reach the service. You may be offline.'};
    }
    if (error instanceof Anthropic.APIError) {
      return {ok: false, reason: 'error', message: `The service returned an error (${error.status}).`};
    }
    return {ok: false, reason: 'error', message: 'Something went wrong reading the photo.'};
  }
}
