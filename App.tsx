import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator, Alert, AppState, Pressable, SafeAreaView, ScrollView,
  StatusBar, StyleSheet, Text, TextInput, View
} from 'react-native';
import {AppData, CheckIn, defaultCheckIn, defaultProfile, emptyData, Equipment, Focus, Goal, Level, Profile, WorkoutLog, WorkoutPlan} from './src/types';
import {makePlan,formatSeconds} from './src/lib/planner';
import {getProgress,localDateKey} from './src/lib/progress';
import {loadData,saveData} from './src/lib/storage';

type Tab = 'today' | 'explore' | 'progress' | 'settings';
const C = {
  page:'#F5F7F2', ink:'#19352A', deep:'#172E26', white:'#FFFFFF', muted:'#708076',
  line:'#E2E9E2', green:'#A5E8C0', greenLight:'#DDF5E7', lime:'#E2ECBA', orange:'#F4E6D9',
  subtle:'#ECF1EB', orangeDark:'#995D3A'
};
const FOCUS: {id:Focus;icon:string;label:string;detail:string}[] = [
  {id:'balanced',icon:'⚡',label:'Everyday strength',detail:'A little of everything'},
  {id:'calisthenics',icon:'◈',label:'Calisthenics',detail:'Strong with what you have'},
  {id:'running',icon:'↗',label:'Run + walk',detail:'Endurance at your own pace'},
  {id:'mobility',icon:'✳',label:'Mobility',detail:'Feel better in your body'},
  {id:'mindful',icon:'☼',label:'Mindful reset',detail:'Breathe and reconnect'}
];

function Button({title,onPress,outline=false,disabled=false,small=false}: {
  title:string;onPress:()=>void;outline?:boolean;disabled?:boolean;small?:boolean
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} disabled={disabled}
    style={({pressed})=>[s.button,outline&&s.buttonOutline,small&&s.buttonSmall,disabled&&{opacity:0.5},pressed&&{opacity:0.8}]}>
    <Text style={[s.buttonText,outline&&{color:C.ink},small&&{fontSize:13}]}>{title}</Text>
  </Pressable>;
}
function Chip<T extends string|number>({label,value,selected,onPress}: {
  label:string;value:T;selected:boolean;onPress:(value:T)=>void
}) {
  return <Pressable accessibilityRole="button" accessibilityState={{selected}} onPress={()=>onPress(value)}
    style={({pressed})=>[s.chip,selected&&s.chipSelected,pressed&&{opacity:0.7}]}>
    <Text style={[s.chipText,selected&&s.chipTextSelected]}>{label}</Text>
  </Pressable>;
}
function GroupLabel({children}: {children:React.ReactNode}) {return <Text style={s.groupLabel}>{children}</Text>;}
function MiniLabel({children}: {children:React.ReactNode}) {return <Text style={s.miniLabel}>{children}</Text>;}
function SectionTitle({title,subtitle}:{title:string;subtitle?:string}) {
  return <View style={{marginTop:26,marginBottom:13}}><Text style={s.sectionTitle}>{title}</Text>{subtitle&&<Text style={s.sectionSubtitle}>{subtitle}</Text>}</View>;
}
function Card({children,style}:{children:React.ReactNode;style?:object}) {return <View style={[s.card,style]}>{children}</View>;}
function OptionRow({label,subtitle,active,onPress,icon}: {label:string;subtitle:string;active:boolean;onPress:()=>void;icon?:string}) {
  return <Pressable accessibilityRole="button" accessibilityState={{selected:active}} onPress={onPress}
    style={[s.optionRow,active&&s.optionSelected]}>
    {icon&&<Text style={s.optionIcon}>{icon}</Text>}
    <View style={{flex:1}}><Text style={s.optionTitle}>{label}</Text><Text style={s.optionSubtitle}>{subtitle}</Text></View>
    <Text style={[s.radio,active&&s.radioSelected]}>{active?'✓':''}</Text>
  </Pressable>;
}
function minutesLabel(m:number){return `${m} MIN`}

export default function App() {
  const [loaded,setLoaded]=useState(false);
  const [data,setData]=useState<AppData>(emptyData);
  const [draft,setDraft]=useState<Profile>(defaultProfile);
  const [checkIn,setCheckIn]=useState<CheckIn>(defaultCheckIn);
  const [tab,setTab]=useState<Tab>('today');
  const [activePlan,setActivePlan]=useState<WorkoutPlan|null>(null);
  const [index,setIndex]=useState(0);
  const [remaining,setRemaining]=useState(0);
  const [elapsed,setElapsed]=useState(0);
  const [playing,setPlaying]=useState(false);
  const [completePlan,setCompletePlan]=useState<WorkoutPlan|null>(null);
  const [savedPartial,setSavedPartial]=useState(false);
  const isCommitting=useRef(false);

  useEffect(()=>{let alive=true;loadData().then(stored=>{if(alive){setData(stored);if(stored.profile)setDraft(stored.profile);setLoaded(true);}});return()=>{alive=false;};},[]);
  useEffect(()=>{if(loaded)saveData(data).catch(()=>Alert.alert('Save unavailable','Your progress could not be saved on this device.'));},[data,loaded]);
  // Avoid running the timer silently in the background.
  useEffect(()=>{const listener=AppState.addEventListener('change',next=>{if(next!=='active')setPlaying(false);});return()=>listener.remove();},[]);
  useEffect(()=>{if(!playing||!activePlan)return;const timer=setInterval(()=>{setRemaining(x=>Math.max(0,x-1));setElapsed(x=>x+1);},1000);return()=>clearInterval(timer);},[playing,activePlan]);

  const profile=data.profile||defaultProfile;
  const plan=useMemo(()=>makePlan(checkIn,profile),[checkIn,profile]);
  const progress=useMemo(()=>getProgress(data.history),[data.history]);
  const today=localDateKey(new Date());
  const todayDone=data.history.some(x=>x.finished&&localDateKey(new Date(x.completedAt))===today);

  const updateCheckIn=<K extends keyof CheckIn>(key:K,value:CheckIn[K])=>setCheckIn(prev=>({...prev,[key]:value}));
  const saveProfile=()=>{
    if(!data.profile){
      const initialFocus:Focus=draft.goal==='strength'?'calisthenics':draft.goal==='endurance'?'running':draft.goal==='mobility'?'mobility':'balanced';
      setCheckIn(prev=>({...prev,focus:initialFocus}));
    }
    setData(prev=>({...prev,profile:draft}));setTab('today');
  };
  const startSession=(selectedPlan:WorkoutPlan)=>{
    isCommitting.current=false;setCompletePlan(null);setSavedPartial(false);
    setActivePlan(selectedPlan);setIndex(0);setRemaining(selectedPlan.steps[0].seconds);
    setElapsed(0);setPlaying(false);
  };
  const recordSession=useCallback((finished:boolean)=>{
    if(!activePlan||isCommitting.current)return;
    isCommitting.current=true;
    setPlaying(false);
    const countedAsComplete = finished && elapsed >= Math.ceil(activePlan.minutes * 60 * 0.7);
    const log:WorkoutLog={
      id:`session-${Date.now()}-${Math.round(Math.random()*99999)}`,completedAt:new Date().toISOString(),
      planTitle:activePlan.title,focus:activePlan.intent,plannedMinutes:activePlan.minutes,
      completedSeconds:Math.min(elapsed,activePlan.minutes*60),finished:countedAsComplete,
      energy:checkIn.energy,mood:checkIn.mood
    };
    setData(prev=>({...prev,history:[...prev.history,log]}));
    setSavedPartial(!countedAsComplete);setCompletePlan(activePlan);setActivePlan(null);
  },[activePlan,elapsed,checkIn.energy,checkIn.mood]);
  const advance=useCallback(()=>{
    if(!activePlan)return;
    if(index>=activePlan.steps.length-1){recordSession(true);return;}
    const next=index+1;setIndex(next);setRemaining(activePlan.steps[next].seconds);
  },[activePlan,index,recordSession]);
  useEffect(()=>{if(activePlan&&remaining===0){advance();}},[activePlan,remaining,advance]);
  const exitSession=()=>{
    setPlaying(false);
    Alert.alert('Leave this session?','Your partial activity can be saved, but it will not count toward completed sessions.',[
      {text:'Keep going',style:'cancel'},
      {text:'Discard',style:'destructive',onPress:()=>{setActivePlan(null);setTab('today');}},
      {text:'Save partial',onPress:()=>recordSession(false)}
    ]);
  };

  if(!loaded) return <SafeAreaView style={s.loading}><ActivityIndicator color={C.ink} size="large"/><Text style={s.loadingText}>Finding your rhythm...</Text></SafeAreaView>;

  if(!data.profile) return <SafeAreaView style={s.root}><StatusBar barStyle="dark-content" backgroundColor={C.page}/>
    <ScrollView contentContainerStyle={s.onboardContainer} keyboardShouldPersistTaps="handled">
      <Text style={s.brand}>steady<Text style={{color:'#6BAE82'}}>.</Text></Text>
      <Text style={s.eyebrow}>WELCOME TO YOUR DAILY MOVEMENT PRACTICE</Text>
      <Text style={s.onboardTitle}>Progress starts by <Text style={{color:'#69A77D'}}>showing up.</Text></Text>
      <Text style={s.onboardDesc}>Strength, movement and mindfulness—built around the day you actually have. No perfection required.</Text>
      <View style={s.onboardForm}>
        <GroupLabel>What should we call you? (optional)</GroupLabel>
        <TextInput placeholder="Your first name" placeholderTextColor="#98A69B" value={draft.displayName}
          onChangeText={displayName=>setDraft(p=>({...p,displayName:displayName.slice(0,30)}))} style={s.input}
          autoCapitalize="words" accessibilityLabel="Your first name"/>
        <GroupLabel>Your main goal</GroupLabel>
        <View style={s.wrap}>
          {([['consistency','Build consistency'],['strength','Get stronger'],['endurance','Build endurance'],['mobility','Move more freely']] as [Goal,string][]).map(([value,label])=>
            <Chip key={value} label={label} value={value} selected={draft.goal===value} onPress={goal=>setDraft(p=>({...p,goal}))}/>)}
        </View>
        <GroupLabel>Where are you starting?</GroupLabel>
        <View style={s.wrap}>{([['beginner','Starting out'],['intermediate','Active already']] as [Level,string][]).map(([value,label])=>
          <Chip key={value} label={label} value={value} selected={draft.level===value} onPress={level=>setDraft(p=>({...p,level}))}/>)}</View>
        <GroupLabel>Your available equipment</GroupLabel>
        <View style={s.wrap}>{([['none','Bodyweight'],['mat','Mat'],['dumbbells','Dumbbells']] as [Equipment,string][]).map(([value,label])=>
          <Chip key={value} label={label} value={value} selected={draft.equipment===value} onPress={equipment=>setDraft(p=>({...p,equipment}))}/>)}</View>
        <GroupLabel>Movement days per week</GroupLabel>
        <View style={s.wrap}>{([2,3,4,5,6]).map(value=><Chip key={value} label={`${value} days`} value={value} selected={draft.weeklyTarget===value} onPress={weeklyTarget=>setDraft(p=>({...p,weeklyTarget}))}/>)}</View>
        <Button title="Begin your practice  →" onPress={saveProfile}/>
        <Text style={s.smallMuted}>Your answers and sessions are saved on this device. No account, cloud sync or location tracking.</Text>
      </View>
    </ScrollView>
  </SafeAreaView>;

  if(activePlan){
    const step=activePlan.steps[index];
    const fraction=activePlan.steps.length?((index+Math.max(0,(step.seconds-remaining)/step.seconds))/activePlan.steps.length):0;
    return <SafeAreaView style={[s.root,{backgroundColor:C.deep}]}><StatusBar barStyle="light-content" backgroundColor={C.deep}/>
      <View style={s.sessionWrap}>
        <View style={s.sessionTop}><Pressable onPress={exitSession} accessibilityRole="button" accessibilityLabel="Exit workout" style={s.sessionExit}><Text style={s.sessionExitText}>✕</Text></Pressable>
          <Text style={s.sessionStepCount}>STEP {index+1} OF {activePlan.steps.length}</Text><Text style={{color:C.green,fontSize:12,fontWeight:'700'}}>{step.phase.toUpperCase()}</Text></View>
        <View style={s.sessionTrack}><View style={[s.sessionTrackFill,{width:`${fraction*100}%` as `${number}%`}]}/></View>
        <View style={s.sessionMain}>
          <Text style={s.sessionEyebrow}>{activePlan.title}</Text>
          <Text style={s.sessionTitle}>{step.title}</Text>
          <Text style={s.timer}>{formatSeconds(remaining)}</Text>
          <Text style={s.sessionHint}>Move at your pace. Rest whenever you need.</Text>
          <Text style={s.sessionInstruction}>{step.instruction}</Text>
          <View style={s.cuesBox}>{step.cues.map((cue,i)=><Text key={i} style={s.cuesText}>✓  {cue}</Text>)}</View>
        </View>
        <View style={s.sessionBottom}>
          {index<activePlan.steps.length-1&&<Text style={s.nextText}>UP NEXT  ·  {activePlan.steps[index+1].title}</Text>}
          <Pressable style={s.timerButton} onPress={()=>setPlaying(p=>!p)} accessibilityRole="button" accessibilityLabel={playing?'Pause timer':'Start timer'}>
            <Text style={s.timerButtonText}>{playing?'Ⅱ  Pause':'▶  '+(elapsed===0?'Start':'Resume')}</Text></Pressable>
          <View style={s.sessionActions}><Pressable style={s.sessionMinorButton} onPress={()=>{setPlaying(false);setRemaining(step.seconds);}}><Text style={s.sessionMinorText}>↺  Restart step</Text></Pressable>
            <Pressable style={s.sessionMinorButton} onPress={advance}><Text style={s.sessionMinorText}>{index===activePlan.steps.length-1?'Finish  →':'Next step  →'}</Text></Pressable></View>
          <Text style={s.sessionDisclaimer}>Pause if anything feels painful, dizzying, or unsafe. Timer pauses when you leave the app.</Text>
        </View>
      </View>
    </SafeAreaView>;
  }

  if(completePlan){return <SafeAreaView style={s.root}><StatusBar barStyle="dark-content" backgroundColor={C.page}/>
    <View style={s.completeWrap}>
      <View style={s.completeSymbol}><Text style={{fontSize:64}}>{savedPartial?'🌿':'✳'}</Text></View>
      <MiniLabel>{savedPartial?'MOVEMENT MATTERS':'YOU SHOWED UP'}</MiniLabel>
      <Text style={s.completeTitle}>{savedPartial?'A little still counts.':'That was enough.'}</Text>
      <Text style={s.completeSubtitle}>{savedPartial?'Your partial activity was saved. It does not count toward completed sessions.':'You completed '+completePlan.title+'. Keep this feeling, not the pressure.'}</Text>
      <View style={[s.card,{width:'100%',marginVertical:24}]}><Text style={s.completeStat}>{`${Math.max(1,Math.round(elapsed/60))} min`}</Text><Text style={s.completeStatLabel}>time spent for yourself</Text></View>
      <Button title="Back to my day  →" onPress={()=>{setCompletePlan(null);setTab('today');}}/>
    </View>
  </SafeAreaView>}

  return <SafeAreaView style={s.root}><StatusBar barStyle="dark-content" backgroundColor={C.page}/>
    <View style={s.content}>
      <ScrollView contentContainerStyle={s.pageContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={s.pageTop}><Text style={s.brand}>steady<Text style={{color:'#75B88B'}}>.</Text></Text><Text style={s.pageTopDate}>{new Date().toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'})}</Text></View>
        {tab==='today'&&<>
          <Text style={s.eyebrow}>MAKE MOVEMENT A PRACTICE</Text>
          <Text style={s.pageHeadline}>Good {new Date().getHours()<12?'morning':new Date().getHours()<18?'afternoon':'evening'}{profile.displayName?`, ${profile.displayName}`:''}<Text style={{color:'#70AA82'}}>.</Text></Text>
          <Text style={s.lead}>You don't have to do everything. Just your next good thing.</Text>
          <View style={s.hero}>
            <View style={s.heroOrb}/>
            <Text style={s.heroEyebrow}>{todayDone?'TODAY IS A WIN':'YOUR PRACTICE THIS WEEK'}</Text>
            <Text style={s.heroNumber}>{progress.weekDays}<Text style={s.heroDenom}> / {profile.weeklyTarget}</Text></Text>
            <Text style={s.heroLabel}>movement days complete</Text>
            <View style={s.weekDots}>{progress.chart.map((day,i)=><View key={day.key} style={s.weekDotCol}>
              <View style={[s.weekDot,day.done&&s.weekDotDone]}><Text style={[s.weekDotGlyph,day.done&&{color:C.deep}]}>{day.done?'✓':'·'}</Text></View>
              <Text style={s.weekDay}>{day.day}</Text>
            </View>)}</View>
          </View>
          <SectionTitle title="How are you today?" subtitle="A quick check-in helps keep your movement realistic."/>
          <Card>
            <GroupLabel>ENERGY</GroupLabel><View style={s.wrap}>{([['low','Low energy'],['okay','Doing okay'],['high','Feeling good']] as [CheckIn['energy'],string][]).map(([v,l])=><Chip key={v} value={v} label={l} selected={checkIn.energy===v} onPress={value=>updateCheckIn('energy',value)}/>)}</View>
            <GroupLabel>MOOD</GroupLabel><View style={s.wrap}>{([['calm','Calm'],['neutral','Neutral'],['stressed','Stressed']] as [CheckIn['mood'],string][]).map(([v,l])=><Chip key={v} value={v} label={l} selected={checkIn.mood===v} onPress={value=>updateCheckIn('mood',value)}/>)}</View>
            <GroupLabel>SORENESS</GroupLabel><View style={s.wrap}>{([['none','Fresh'],['mild','Some'],['high','Very sore']] as [CheckIn['soreness'],string][]).map(([v,l])=><Chip key={v} value={v} label={l} selected={checkIn.soreness===v} onPress={value=>updateCheckIn('soreness',value)}/>)}</View>
            <Pressable onPress={()=>updateCheckIn('pain',!checkIn.pain)} accessibilityRole="checkbox" accessibilityState={{checked:checkIn.pain}} style={s.checkboxRow}>
              <View style={[s.checkbox,checkIn.pain&&s.checkboxChecked]}><Text style={{color:C.deep,fontWeight:'900'}}>{checkIn.pain?'✓':''}</Text></View>
              <Text style={[s.checkboxLabel,{flex:1}]}>I'm currently experiencing pain or an injury</Text>
            </Pressable>
          </Card>
          <SectionTitle title="Make some space" subtitle="How much time is actually yours?"/>
          <View style={s.wrap}>{([10,20,40] as CheckIn['minutes'][]).map(value=><Chip key={value} value={value} label={`${value} minutes`} selected={checkIn.minutes===value} onPress={minutes=>updateCheckIn('minutes',minutes)}/>)}</View>
          <SectionTitle title="What sounds good?"/>
          <View style={s.focusGrid}>{FOCUS.map(f=><Pressable key={f.id} onPress={()=>updateCheckIn('focus',f.id)} accessibilityRole="button" accessibilityState={{selected:checkIn.focus===f.id}} style={[s.focusCard,checkIn.focus===f.id&&s.focusCardSelected]}>
            <Text style={s.focusIcon}>{f.icon}</Text><Text style={s.focusTitle}>{f.label}</Text><Text style={s.focusSubtitle}>{f.detail}</Text>
            {checkIn.focus===f.id&&<Text style={s.focusCheck}>✓ Selected</Text>}
          </Pressable>)}</View>
          <SectionTitle title="Today's movement" subtitle="A plan you can adapt—never a test you have to pass."/>
          <View style={s.planCard}>
            <View style={s.planTagRow}><Text style={s.planTag}>{plan.adjustedForRecovery?'ADJUSTED FOR REST':'MADE FOR TODAY'}</Text><Text style={s.planMinutes}>{minutesLabel(plan.minutes)}</Text></View>
            <Text style={s.planTitle}>{plan.title}</Text><Text style={s.planDesc}>{plan.description}</Text>
            <View style={s.planMetrics}><Text style={s.planMetric}>◷  {plan.minutes} minutes</Text><Text style={s.planMetric}>✳  {plan.steps.length} guided steps</Text></View>
            <Button title="Start this session  →" onPress={()=>startSession(plan)}/>
          </View>
          <Text style={s.safetyCopy}>For general wellness, not medical treatment. Stop if movement causes pain or unusual symptoms.</Text>
        </>}
        {tab==='explore'&&<>
          <MiniLabel>MOVE YOUR WAY</MiniLabel><Text style={s.pageHeadline}>Every way to<Text style={{color:'#70AA82'}}> show up.</Text></Text><Text style={s.lead}>Pick a direction. Your energy check-in will still guide the intensity.</Text>
          <SectionTitle title="Choose your practice" subtitle="Plans are time-based, flexible, and beginner-aware."/>
          {FOCUS.map((f,i)=><Pressable key={f.id} onPress={()=>{updateCheckIn('focus',f.id);setTab('today');}} style={[s.browseCard,{backgroundColor:i%2===0?C.white:C.subtle}]}>
            <Text style={s.browseIcon}>{f.icon}</Text><View style={{flex:1}}><Text style={s.browseTitle}>{f.label}</Text><Text style={s.browseDesc}>{f.detail}</Text></View><Text style={s.browseArrow}>→</Text>
          </Pressable>)}
          <SectionTitle title="Our approach"/>
          <Card><Text style={s.copyTitle}>Build a practice, not a punishment.</Text>
            <Text style={s.copyBody}>Every session has a mindful entry point. Move when your body is ready, take recovery seriously, and let progress come from sustainable repetition.</Text>
            <Text style={s.copyBody}>Running guidance is time-based and does not track GPS, pace, or distance. Bodyweight training is self-paced and not a substitute for hands-on instruction.</Text></Card>
        </>}
        {tab==='progress'&&<>
          <MiniLabel>YOUR MOMENTUM</MiniLabel><Text style={s.pageHeadline}>Show up. <Text style={{color:'#70AA82'}}>It adds up.</Text></Text><Text style={s.lead}>Progress is more than a streak. It is the evidence that you keep returning.</Text>
          <View style={s.statsGrid}><View style={s.statBox}><Text style={s.statValue}>{progress.totalSessions}</Text><Text style={s.statLabel}>completed sessions</Text></View><View style={s.statBox}><Text style={s.statValue}>{progress.totalMinutes}</Text><Text style={s.statLabel}>minutes moved</Text></View>
            <View style={s.statBox}><Text style={s.statValue}>{progress.streak}</Text><Text style={s.statLabel}>consecutive days</Text></View><View style={s.statBox}><Text style={s.statValue}>{progress.weekDays}/{profile.weeklyTarget}</Text><Text style={s.statLabel}>weekly movement days</Text></View></View>
          <SectionTitle title="This week" subtitle={`${progress.minutesThisWeek} minutes across ${progress.weekSessions} completed sessions.`}/>
          <Card><View style={s.weekProgressRow}>{progress.chart.map((day,i)=><View key={day.key} style={s.weekProgressCol}><View style={[s.progressDay,day.done&&s.progressDayDone]}><Text style={[s.progressDayText,day.done&&{color:C.deep}]}>{day.done?'✓':''}</Text></View><Text style={s.weekProgressLabel}>{['M','T','W','T','F','S','S'][i]}</Text></View>)}</View>
            <Text style={s.progressFoot}>A missed day is information, not failure. Your next session is a fresh start.</Text></Card>
          <SectionTitle title="Recent sessions"/>
          {progress.lastFive.length===0?<Card><Text style={s.emptyTitle}>Your story starts here.</Text><Text style={s.copyBody}>Complete your first session and you'll see it on this page.</Text><Button title="Plan my first session  →" onPress={()=>setTab('today')} outline/></Card>
            :progress.lastFive.map(log=><View key={log.id} style={s.logRow}><View style={s.logIcon}><Text style={{fontSize:20}}>✓</Text></View><View style={{flex:1}}><Text style={s.logTitle}>{log.planTitle}</Text><Text style={s.logSubtitle}>{new Date(log.completedAt).toLocaleDateString()} · {log.focus}</Text></View><Text style={s.logMinutes}>{Math.round(log.completedSeconds/60)}m</Text></View>)}
        </>}
        {tab==='settings'&&<>
          <MiniLabel>YOUR PRACTICE, YOUR WAY</MiniLabel><Text style={s.pageHeadline}>Make it <Text style={{color:'#70AA82'}}>yours.</Text></Text><Text style={s.lead}>Adjust your goals without resetting what you've built.</Text>
          <SectionTitle title="Name"/>
          <TextInput value={draft.displayName} onChangeText={displayName=>setDraft(p=>({...p,displayName:displayName.slice(0,30)}))} style={s.input} placeholder="First name (optional)" placeholderTextColor={C.muted}/>
          <SectionTitle title="Primary goal"/>
          <View style={s.wrap}>{([['consistency','Be consistent'],['strength','Get stronger'],['endurance','Build endurance'],['mobility','Stay mobile']] as [Goal,string][]).map(([value,label])=><Chip key={value} value={value} label={label} selected={draft.goal===value} onPress={goal=>setDraft(p=>({...p,goal}))}/>)}</View>
          <SectionTitle title="Experience"/>
          <View style={s.wrap}>{([['beginner','Starting out'],['intermediate','Active already']] as [Level,string][]).map(([value,label])=><Chip key={value} value={value} label={label} selected={draft.level===value} onPress={level=>setDraft(p=>({...p,level}))}/>)}</View>
          <SectionTitle title="Equipment"/>
          <View style={s.wrap}>{([['none','Bodyweight'],['mat','Mat'],['dumbbells','Dumbbells']] as [Equipment,string][]).map(([value,label])=><Chip key={value} value={value} label={label} selected={draft.equipment===value} onPress={equipment=>setDraft(p=>({...p,equipment}))}/>)}</View>
          <SectionTitle title="Weekly goal"/>
          <View style={s.wrap}>{[2,3,4,5,6].map(value=><Chip key={value} value={value} label={`${value} days`} selected={draft.weeklyTarget===value} onPress={weeklyTarget=>setDraft(p=>({...p,weeklyTarget}))}/>)}</View>
          <View style={{height:20}}/><Button title="Save preferences" onPress={saveProfile}/>
          <SectionTitle title="Your privacy"/>
          <Card><Text style={s.copyTitle}>Private by design.</Text><Text style={s.copyBody}>In this MVP, workouts and preferences are stored unencrypted on this device. Nothing is sent to a server. There is no login or cloud backup. Uninstalling the app may erase your data.</Text></Card>
          <Pressable onPress={()=>Alert.alert('Erase local history?','This deletes your completed sessions on this device and cannot be undone.',[
            {text:'Cancel',style:'cancel'},{text:'Erase',style:'destructive',onPress:()=>setData(prev=>({...prev,history:[]}))}
          ])} style={s.eraseButton}><Text style={s.eraseText}>Erase workout history</Text></Pressable>
        </>}
        <View style={{height:32}}/>
      </ScrollView>
      <View style={s.tabBar}>{([['today','⌂','Today'],['explore','◈','Explore'],['progress','▥','Progress'],['settings','⚙','Settings']] as [Tab,string,string][]).map(([v,icon,label])=><Pressable key={v} accessibilityRole="tab" accessibilityState={{selected:tab===v}} onPress={()=>{if(v==='settings')setDraft(profile);setTab(v)}} style={s.tabItem}>
        <Text style={[s.tabIcon,tab===v&&s.tabIconActive]}>{icon}</Text><Text style={[s.tabLabel,tab===v&&s.tabLabelActive]}>{label}</Text>
      </Pressable>)}</View>
    </View>
  </SafeAreaView>;
}

const s=StyleSheet.create({
  root:{flex:1,backgroundColor:C.page},loading:{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:C.page},loadingText:{color:C.muted,marginTop:18},
  content:{flex:1,width:'100%',maxWidth:600,alignSelf:'center'},pageContent:{paddingHorizontal:24,paddingTop:18,paddingBottom:24},
  brand:{fontSize:33,letterSpacing:-2.2,fontWeight:'900',color:C.deep},pageTop:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:28},pageTopDate:{fontSize:12,fontWeight:'700',color:C.muted},
  eyebrow:{fontSize:10,letterSpacing:2,fontWeight:'800',color:'#668A74',marginBottom:9},miniLabel:{fontSize:11,letterSpacing:1.9,fontWeight:'900',color:'#649375',marginBottom:14},
  pageHeadline:{fontSize:37,fontWeight:'900',letterSpacing:-1.65,color:C.deep,lineHeight:43},lead:{fontSize:15,color:C.muted,lineHeight:23,marginTop:9,marginBottom:21},
  hero:{backgroundColor:C.deep,borderRadius:25,padding:24,overflow:'hidden',marginTop:10},heroOrb:{width:195,height:195,borderRadius:99,backgroundColor:'#2A4D3D',position:'absolute',right:-40,top:-67},
  heroEyebrow:{fontSize:11,fontWeight:'800',color:C.green,letterSpacing:1.5},heroNumber:{fontSize:53,fontWeight:'900',color:C.white,marginTop:6,letterSpacing:-2},heroDenom:{fontSize:23,color:'#9BB4A5'},heroLabel:{fontSize:13,color:'#CAD8D0',marginTop:-3},
  weekDots:{flexDirection:'row',justifyContent:'space-between',marginTop:23},weekDotCol:{alignItems:'center',gap:8},weekDot:{width:30,height:30,borderWidth:1,borderColor:'#547061',borderRadius:15,alignItems:'center',justifyContent:'center'},weekDotDone:{backgroundColor:C.green,borderColor:C.green},weekDotGlyph:{fontSize:19,color:'#7A9D87'},weekDay:{fontSize:11,color:'#AEC5B6',fontWeight:'700'},
  sectionTitle:{fontSize:22,fontWeight:'800',color:C.deep,letterSpacing:-0.6},sectionSubtitle:{fontSize:13,color:C.muted,marginTop:4,lineHeight:20},
  card:{backgroundColor:C.white,borderRadius:21,padding:19,borderWidth:1,borderColor:C.line},groupLabel:{fontSize:10,fontWeight:'900',color:'#62796D',letterSpacing:1.2,marginBottom:11,marginTop:14},
  wrap:{flexDirection:'row',flexWrap:'wrap',gap:9},chip:{paddingHorizontal:14,paddingVertical:11,borderWidth:1,borderColor:'#D8E2D9',backgroundColor:C.white,borderRadius:999},chipSelected:{backgroundColor:C.greenLight,borderColor:'#9ACDAC'},chipText:{fontSize:12,color:'#51675A',fontWeight:'700'},chipTextSelected:{color:C.deep},
  checkboxRow:{flexDirection:'row',alignItems:'center',marginTop:21,marginBottom:4,gap:10},checkbox:{width:22,height:22,borderColor:'#A3BAA8',borderWidth:1.5,borderRadius:6,alignItems:'center',justifyContent:'center'},checkboxChecked:{backgroundColor:C.green,borderColor:C.green},checkboxLabel:{fontSize:12,color:C.muted,lineHeight:18},
  focusGrid:{flexDirection:'row',flexWrap:'wrap',gap:11},focusCard:{width:'48%',flexGrow:1,minHeight:126,borderRadius:19,backgroundColor:C.white,borderWidth:1,borderColor:C.line,padding:16},focusCardSelected:{backgroundColor:C.greenLight,borderColor:'#84B994'},focusIcon:{fontSize:24,color:C.ink,marginBottom:10,fontWeight:'900'},focusTitle:{fontSize:13,fontWeight:'800',color:C.deep},focusSubtitle:{fontSize:11,color:C.muted,marginTop:4,lineHeight:15},focusCheck:{fontSize:10,fontWeight:'900',color:'#397950',marginTop:10},
  planCard:{padding:22,backgroundColor:C.lime,borderRadius:25},planTagRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},planTag:{fontSize:10,fontWeight:'900',color:'#567151',letterSpacing:1},planMinutes:{fontSize:11,fontWeight:'900',color:C.deep},planTitle:{fontSize:32,fontWeight:'900',color:C.deep,letterSpacing:-1,marginTop:19},planDesc:{fontSize:13,color:'#4A6354',lineHeight:21,marginTop:11},planMetrics:{flexDirection:'row',gap:16,flexWrap:'wrap',marginVertical:20},planMetric:{fontSize:11,color:C.deep,fontWeight:'700'},
  button:{backgroundColor:C.deep,justifyContent:'center',alignItems:'center',borderRadius:15,paddingVertical:17,paddingHorizontal:18},buttonOutline:{backgroundColor:C.white,borderWidth:1,borderColor:'#94B79F'},buttonSmall:{paddingVertical:10},buttonText:{color:C.white,fontWeight:'800',fontSize:14},safetyCopy:{fontSize:11,color:C.muted,marginTop:12,lineHeight:17},
  tabBar:{height:70,flexDirection:'row',backgroundColor:'#FEFFFC',borderTopWidth:1,borderTopColor:C.line,justifyContent:'space-around',paddingTop:8,paddingBottom:8},tabItem:{flex:1,alignItems:'center',justifyContent:'center',gap:4},tabIcon:{fontSize:22,color:'#91A599',fontWeight:'800'},tabIconActive:{color:C.deep},tabLabel:{fontSize:10,color:'#91A599',fontWeight:'700'},tabLabelActive:{color:C.deep,fontWeight:'900'},
  onboardContainer:{paddingHorizontal:24,paddingTop:25,paddingBottom:60,maxWidth:600,width:'100%',alignSelf:'center'},onboardTitle:{fontSize:48,fontWeight:'900',lineHeight:52,letterSpacing:-2,color:C.deep,marginTop:18},onboardDesc:{fontSize:16,color:C.muted,lineHeight:24,marginTop:14},onboardForm:{marginTop:18,gap:5},input:{backgroundColor:C.white,borderRadius:13,paddingHorizontal:16,paddingVertical:14,borderWidth:1,borderColor:C.line,fontSize:15,color:C.ink},smallMuted:{fontSize:11,color:C.muted,lineHeight:17,textAlign:'center',marginTop:15},
  browseCard:{flexDirection:'row',alignItems:'center',gap:15,padding:19,borderRadius:20,borderWidth:1,borderColor:C.line,marginBottom:10},browseIcon:{fontSize:30,fontWeight:'800',width:44,textAlign:'center',color:C.ink},browseTitle:{fontSize:16,fontWeight:'800',color:C.ink},browseDesc:{fontSize:12,marginTop:4,color:C.muted},browseArrow:{fontSize:22,color:'#578366'},copyTitle:{fontSize:18,fontWeight:'800',color:C.deep,marginBottom:11},copyBody:{fontSize:13,lineHeight:21,color:C.muted,marginBottom:12},
  statsGrid:{flexDirection:'row',flexWrap:'wrap',gap:12,marginTop:8},statBox:{backgroundColor:C.white,borderWidth:1,borderColor:C.line,width:'47%',flexGrow:1,borderRadius:20,padding:18,minHeight:119},statValue:{fontSize:34,fontWeight:'900',color:C.deep,letterSpacing:-1},statLabel:{fontSize:12,color:C.muted,marginTop:5,lineHeight:17},
  weekProgressRow:{flexDirection:'row',justifyContent:'space-between'},weekProgressCol:{alignItems:'center',gap:8},progressDay:{backgroundColor:C.subtle,width:32,height:32,borderRadius:16,alignItems:'center',justifyContent:'center'},progressDayDone:{backgroundColor:C.green},progressDayText:{fontSize:16,color:C.muted},weekProgressLabel:{fontSize:11,color:C.muted,fontWeight:'700'},progressFoot:{marginTop:18,color:C.muted,fontSize:12,lineHeight:18},
  emptyTitle:{fontSize:18,fontWeight:'800',color:C.deep,marginBottom:6},logRow:{paddingVertical:13,flexDirection:'row',alignItems:'center',borderBottomWidth:1,borderBottomColor:C.line,gap:12},logIcon:{width:42,height:42,borderRadius:14,backgroundColor:C.greenLight,alignItems:'center',justifyContent:'center'},logTitle:{fontSize:14,fontWeight:'800',color:C.deep},logSubtitle:{fontSize:12,color:C.muted,marginTop:4},logMinutes:{fontSize:15,fontWeight:'900',color:C.deep},
  eraseButton:{padding:17,marginTop:23,alignItems:'center'},eraseText:{fontSize:13,fontWeight:'800',color:'#9B5947'},
  sessionWrap:{flex:1,paddingHorizontal:24,paddingTop:20,paddingBottom:15,maxWidth:600,width:'100%',alignSelf:'center'},sessionTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},sessionExit:{width:37,height:37,backgroundColor:'#2B4A3B',borderRadius:18,alignItems:'center',justifyContent:'center'},sessionExitText:{color:C.white,fontSize:17},sessionStepCount:{fontSize:11,color:'#B7CABF',fontWeight:'800',letterSpacing:1},
  sessionTrack:{height:5,borderRadius:8,backgroundColor:'#345243',marginTop:23,overflow:'hidden'},sessionTrackFill:{height:'100%',backgroundColor:C.green,borderRadius:8},
  sessionMain:{flex:1,justifyContent:'center'},sessionEyebrow:{fontSize:11,color:C.green,fontWeight:'800',letterSpacing:1.3,marginBottom:15},sessionTitle:{fontSize:42,fontWeight:'900',letterSpacing:-1.4,color:C.white,lineHeight:47},timer:{fontSize:80,fontWeight:'800',color:C.green,letterSpacing:-3,marginVertical:12},sessionHint:{fontSize:12,color:'#BAD0BE'},sessionInstruction:{fontSize:16,color:'#E8F1EA',lineHeight:24,marginTop:24},cuesBox:{marginTop:23,backgroundColor:'#264636',borderRadius:17,padding:17,gap:8},cuesText:{fontSize:13,color:'#CCE7D3'},
  sessionBottom:{gap:12},nextText:{fontSize:12,color:'#B7CDBD',textAlign:'center',marginBottom:8,fontWeight:'700'},timerButton:{padding:18,backgroundColor:C.green,borderRadius:16,alignItems:'center'},timerButtonText:{fontSize:18,fontWeight:'900',color:C.deep},sessionActions:{flexDirection:'row',justifyContent:'space-between'},sessionMinorButton:{paddingVertical:13,paddingHorizontal:7},sessionMinorText:{fontSize:13,color:'#CCDFCF',fontWeight:'700'},sessionDisclaimer:{fontSize:10,lineHeight:16,color:'#8FAB98',textAlign:'center'},
  completeWrap:{flex:1,justifyContent:'center',alignItems:'center',padding:30},completeSymbol:{backgroundColor:C.greenLight,width:120,height:120,borderRadius:60,alignItems:'center',justifyContent:'center',marginBottom:38},completeTitle:{fontSize:38,letterSpacing:-1.5,fontWeight:'900',color:C.deep,textAlign:'center'},completeSubtitle:{fontSize:16,lineHeight:24,color:C.muted,textAlign:'center',marginTop:15},completeStat:{fontSize:39,color:C.deep,fontWeight:'900',textAlign:'center'},completeStatLabel:{fontSize:12,color:C.muted,textAlign:'center',marginTop:4},
  optionRow:{flexDirection:'row',alignItems:'center',gap:12,padding:14,borderWidth:1,borderColor:C.line,borderRadius:14,marginBottom:9},optionSelected:{backgroundColor:C.greenLight,borderColor:C.green},optionIcon:{fontSize:25},optionTitle:{fontSize:14,fontWeight:'800',color:C.deep},optionSubtitle:{fontSize:12,color:C.muted},radio:{width:24,height:24,borderRadius:12,borderWidth:1,borderColor:C.muted,textAlign:'center'},radioSelected:{backgroundColor:C.green,borderColor:C.green}
});
