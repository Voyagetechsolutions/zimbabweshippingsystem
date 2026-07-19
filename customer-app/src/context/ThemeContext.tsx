import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemePreference='light'|'dark'|'system';
const darkPalette={bg:'#08110c',surface:'#101b14',border:'#26362b',ink:'#f4f7f4',text:'#f1f5f2',textMuted:'#a9b6ac',textFaint:'#728076',green:'#20b86a',greenDark:'#54d68f',greenSoft:'#163824',yellow:'#FFCB05',yellowSoft:'#3b3211',red:'#ef625c',redSoft:'#3a1717',white:'#ffffff'};
const lightPalette={bg:'#f7f8f7',surface:'#ffffff',border:'#e6e8e6',ink:'#10130F',text:'#171b16',textMuted:'#5f675e',textFaint:'#9aa199',green:'#008C45',greenDark:'#06622F',greenSoft:'#e8f5ee',yellow:'#FFCB05',yellowSoft:'#fff8e0',red:'#DE3831',redSoft:'#fdeceb',white:'#ffffff'};
type Value={preference:ThemePreference;dark:boolean;palette:typeof lightPalette;setPreference:(value:ThemePreference)=>Promise<void>};
const Context=createContext<Value|undefined>(undefined);
export function ThemeProvider({children}:{children:React.ReactNode}){const [preference,setValue]=useState<ThemePreference>('system');const [system,setSystem]=useState(Appearance.getColorScheme());
  useEffect(()=>{AsyncStorage.getItem('customer-theme').then((v)=>{if(v==='light'||v==='dark'||v==='system')setValue(v);});const sub=Appearance.addChangeListener(({colorScheme})=>setSystem(colorScheme));return()=>sub.remove();},[]);
  const setPreference=useCallback(async(value:ThemePreference)=>{setValue(value);await AsyncStorage.setItem('customer-theme',value);},[]);const dark=preference==='dark'||(preference==='system'&&system==='dark');const value=useMemo(()=>({preference,dark,palette:dark?darkPalette:lightPalette,setPreference}),[preference,dark,setPreference]);return <Context.Provider value={value}>{children}</Context.Provider>}
export function useAppTheme(){const value=useContext(Context);if(!value)throw new Error('useAppTheme requires ThemeProvider');return value;}
