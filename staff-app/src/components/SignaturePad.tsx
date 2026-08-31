import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, radius } from '../theme';

type Point = { x: number; y: number };
type Props = { onChange: (svg: string | null) => void; height?: number };

function pathData(points: Point[]) {
  if (!points.length) return '';
  return points.reduce((d, p, i) => `${d}${i ? ' L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`, '');
}

export default function SignaturePad({ onChange, height = 180 }: Props) {
  const [strokes, setStrokes] = useState<Point[][]>([]);
  const live = useRef<Point[]>([]);
  const [, redraw] = useState(0);
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (event) => { live.current = [{ x: event.nativeEvent.locationX, y: event.nativeEvent.locationY }]; redraw((n) => n + 1); },
    onPanResponderMove: (event) => { live.current.push({ x: event.nativeEvent.locationX, y: event.nativeEvent.locationY }); redraw((n) => n + 1); },
    onPanResponderRelease: () => {
      if (live.current.length < 2) { live.current = []; redraw((n) => n + 1); return; }
      setStrokes((current) => {
        const next = [...current, [...live.current]];
        const paths = next.map((stroke) => `<path d="${pathData(stroke)}" fill="none" stroke="#101828" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
        onChange(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 ${height}">${paths}</svg>`);
        return next;
      });
      live.current = []; redraw((n) => n + 1);
    },
  }), [height, onChange]);
  const clear = () => { setStrokes([]); live.current = []; onChange(null); redraw((n) => n + 1); };
  return <View style={styles.wrap}>
    <View style={[styles.canvas, { height }]} {...responder.panHandlers}>
      <Svg width="100%" height="100%" viewBox={`0 0 600 ${height}`} preserveAspectRatio="none">
        {[...strokes, live.current].map((stroke, index) => <Path key={index} d={pathData(stroke)} fill="none" stroke={colors.text} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />)}
      </Svg>
      {!strokes.length && !live.current.length ? <Text pointerEvents="none" style={styles.hint}>Sign inside this box</Text> : null}
      <View pointerEvents="none" style={styles.line} />
    </View>
    <Pressable style={styles.clear} onPress={clear}><Text style={styles.clearText}>CLEAR SIGNATURE</Text></Pressable>
  </View>;
}

const styles = StyleSheet.create({ wrap: { gap: 7 }, canvas: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, overflow: 'hidden', position: 'relative' }, hint: { position: 'absolute', alignSelf: 'center', top: '43%', color: colors.textFaint, fontSize: 12 }, line: { position: 'absolute', left: 24, right: 24, bottom: 34, borderBottomWidth: 1, borderBottomColor: '#CBD5E1' }, clear: { alignSelf: 'flex-end', paddingVertical: 5, paddingHorizontal: 4 }, clearText: { color: colors.danger, fontSize: 9.5, fontWeight: '900' } });
