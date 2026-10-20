// Loading the two typefaces.
//
// Only the weights the system actually uses are bundled: six files rather
// than the fifty each family ships with.

import {useFonts} from 'expo-font';
// Imported per weight rather than from the package index: the index re-exports
// every weight and italic each family ships, which pulled 7 MB of unused font
// files into the bundle.
import {Fraunces_600SemiBold} from '@expo-google-fonts/fraunces/600SemiBold';
import {Fraunces_700Bold} from '@expo-google-fonts/fraunces/700Bold';
import {InterTight_400Regular} from '@expo-google-fonts/inter-tight/400Regular';
import {InterTight_500Medium} from '@expo-google-fonts/inter-tight/500Medium';
import {InterTight_600SemiBold} from '@expo-google-fonts/inter-tight/600SemiBold';
import {InterTight_700Bold} from '@expo-google-fonts/inter-tight/700Bold';

export const FONT_MAP = {
  Fraunces_600SemiBold,
  Fraunces_700Bold,
  InterTight_400Regular,
  InterTight_500Medium,
  InterTight_600SemiBold,
  InterTight_700Bold
};

/** True once the typefaces are ready, or once loading them has failed. */
export function useAppFonts(): boolean {
  const [loaded, error] = useFonts(FONT_MAP);
  // A font that will not load must not hold the app shut; the system fallback
  // is ugly but usable, and a blank screen is neither.
  return loaded || Boolean(error);
}
