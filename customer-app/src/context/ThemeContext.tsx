import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, StyleSheet } from 'react-native';
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

/**
 * Re-colour a light-theme StyleSheet for dark mode.
 *
 * Screens here were written against the `colors` constants, which are the
 * *light* palette — `colors.text` is #171b16. Most call sites then override the
 * colour inline from `palette`, but not all of them did, and every miss is
 * near-black text on a near-black background: invisible. Chasing that one call
 * site at a time is how it got into this state.
 *
 * So the swap happens once, on the sheet. An inline override still wins,
 * because it is applied after this in the style array — which is why this can
 * be dropped into a screen without auditing its call sites first.
 *
 * Two rules earn their keep:
 *   - A white background is swapped only when the same style also sets a text
 *     colour we are swapping. `colors.surface` and `colors.white` are the same
 *     hex, so a white card and a white pill are indistinguishable here: a card
 *     that states its own dark text must flip both together, while a pill that
 *     only states a background is left alone, because its label is coloured by
 *     a separate style this cannot see. Cards that state no text colour are
 *     themed at the call site instead.
 *   - `ink` is left alone. It is already a dark colour, chosen deliberately —
 *     the welcome screen and the referral card want it in both themes.
 *   - Greens, yellows and reds are brand colours and keep their own light and
 *     dark values in the palette, so they are swapped by name.
 */
const BACKGROUND_PROPS = ['backgroundColor'] as const;
const BORDER_PROPS = [
  'borderColor', 'borderTopColor', 'borderBottomColor', 'borderLeftColor', 'borderRightColor',
] as const;

export function useThemedStyles<T extends Record<string, any>>(sheet: T): T {
  const { dark, palette } = useAppTheme();
  return useMemo(() => {
    if (!dark) return sheet;
    const lower = (value: unknown) => String(value ?? '').toLowerCase();
    // Keys are lowercased too. Half the palette is written with uppercase hex
    // ("#008C45"), and a map keyed on that never matches a lowercased lookup —
    // which is exactly why the greens survived the first pass unswapped.
    const map = (pairs: Array<[string, string]>) =>
      Object.fromEntries(pairs.map(([from, to]) => [from.toLowerCase(), to]));
    // Always safe: the page background is a page background in either theme.
    const backgrounds = map([
      [lightPalette.bg, palette.bg],
      [lightPalette.greenSoft, palette.greenSoft],
      [lightPalette.yellowSoft, palette.yellowSoft],
      [lightPalette.redSoft, palette.redSoft],
    ]);
    // Only alongside a text colour we are also swapping — see the note above.
    const pairedBackgrounds = map([
      [lightPalette.surface, palette.surface],
      [lightPalette.white, palette.surface],
    ]);
    const borders = map([
      [lightPalette.border, palette.border],
      [lightPalette.green, palette.green],
    ]);
    const texts = map([
      [lightPalette.text, palette.text],
      [lightPalette.textMuted, palette.textMuted],
      [lightPalette.textFaint, palette.textFaint],
      [lightPalette.green, palette.green],
      [lightPalette.greenDark, palette.greenDark],
      [lightPalette.red, palette.red],
    ]);

    const out: Record<string, any> = {};
    for (const [key, value] of Object.entries(sheet)) {
      const flat = StyleSheet.flatten(value) as Record<string, any> | undefined;
      if (!flat) { out[key] = value; continue; }
      const patched: Record<string, any> = { ...flat };
      let changed = false;
      const swapText = texts[lower(flat.color)];
      if (swapText) { patched.color = swapText; changed = true; }
      for (const prop of BACKGROUND_PROPS) {
        const swap = backgrounds[lower(flat[prop])]
          || (swapText ? pairedBackgrounds[lower(flat[prop])] : undefined);
        if (swap) { patched[prop] = swap; changed = true; }
      }
      for (const prop of BORDER_PROPS) {
        const swap = borders[lower(flat[prop])];
        if (swap) { patched[prop] = swap; changed = true; }
      }
      out[key] = changed ? patched : value;
    }
    return out as T;
  }, [sheet, dark, palette]);
}
