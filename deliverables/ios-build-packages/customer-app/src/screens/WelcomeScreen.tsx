import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, ImageBackground, FlatList, Pressable, useWindowDimensions, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '../theme';
import { IMG } from '../img';

// First-launch marketing carousel — mirrors the website hero messaging.
const SLIDES = [
  {
    img: IMG.onboardTruck,
    lines: [{ text: 'We Ship', color: colors.white }, { text: 'Anything & Everything', color: '#37d183' }],
    body: 'From the UK & Ireland to Zimbabwe.\nFast. Secure. Reliable.',
  },
  {
    img: IMG.onboardShip,
    lines: [{ text: 'Safe & Secure', color: '#37d183' }, { text: 'Shipping', color: colors.white }],
    body: 'Your items are handled with care and delivered safely to your doorstep.',
  },
  {
    img: IMG.onboardBoxes,
    lines: [{ text: 'Big or Small,', color: colors.white }, { text: 'We Ship It All!', color: colors.yellow }],
    body: "From household items to business goods, we've got you covered.",
  },
];

export default function WelcomeScreen({ onDone }: { onDone: (startAuth: boolean) => void }) {
  const { width, height } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const listRef = useRef<FlatList>(null);
  const last = page === SLIDES.length - 1;

  const next = () => {
    if (last) { onDone(true); return; }
    // Update state directly — momentum-scroll events don't fire for
    // programmatic scrolls on web.
    const target = page + 1;
    setPage(target);
    listRef.current?.scrollToIndex({ index: target, animated: true });
  };

  return (
    <View style={styles.root}>
      <FlatList
        ref={listRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item }) => (
          <ImageBackground source={item.img} style={{ width, height }} resizeMode="cover">
            <View style={styles.shade} />
            <SafeAreaView style={styles.slideContent}>
              <Image source={IMG.logo} style={styles.logo} resizeMode="contain" />
              <View style={{ flex: 1 }} />
              <View style={styles.textBlock}>
                {item.lines.map((l: { text: string; color: string }) => (
                  <Text key={l.text} style={[styles.headline, { color: l.color }]}>{l.text}</Text>
                ))}
                <Text style={styles.body}>{item.body}</Text>
              </View>
            </SafeAreaView>
          </ImageBackground>
        )}
      />

      <SafeAreaView style={styles.footer} edges={['bottom']}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === page && styles.dotOn]} />
          ))}
        </View>
        <View style={styles.footerRow}>
          {!last ? (
            <>
              <Pressable onPress={() => onDone(false)} hitSlop={10} style={styles.skipBtn}>
                <Text style={styles.skipText}>SKIP</Text>
              </Pressable>
              <Pressable onPress={next} style={styles.nextBtn}>
                <Text style={styles.nextText}>NEXT</Text>
              </Pressable>
            </>
          ) : (
            <Pressable onPress={next} style={[styles.nextBtn, styles.getStarted]}>
              <Text style={styles.nextText}>GET STARTED</Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  shade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(6, 14, 9, 0.45)' },
  slideContent: { flex: 1, padding: spacing.xl },
  logo: { width: 72, height: 72, alignSelf: 'flex-start' },
  textBlock: { paddingBottom: 120 },
  headline: { fontSize: 32, fontWeight: '900', lineHeight: 38 },
  body: { color: '#e7ece8', fontSize: 15, lineHeight: 22, marginTop: 12, maxWidth: 300 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.xl, paddingTop: 0 },
  dots: { flexDirection: 'row', gap: 7, marginBottom: spacing.lg },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.35)' },
  dotOn: { backgroundColor: colors.yellow, width: 20 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  skipBtn: { paddingVertical: 12, paddingHorizontal: 4 },
  skipText: { color: '#d4dbd5', fontWeight: '800', fontSize: 13, letterSpacing: 1 },
  nextBtn: { backgroundColor: colors.green, borderRadius: radius.pill, paddingVertical: 13, paddingHorizontal: 34 },
  getStarted: { flex: 1, alignItems: 'center' },
  nextText: { color: colors.white, fontWeight: '800', fontSize: 14, letterSpacing: 1 },
});
