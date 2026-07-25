import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProtoChrome } from '@/features/e2-prototype/ProtoChrome';
import { Starfield } from '@/features/e2-prototype/Starfield';
import { e2Fixtures } from '@/features/e2-prototype/fixtures';
import { e2 } from '@/features/e2-prototype/tokens';

/**
 * E2 Universe Home — I am the center; circles float as places, not menu buttons.
 */
export default function E2UniversePrototype() {
  const { width, height } = useWindowDimensions();
  const stageH = Math.max(height * 0.62, 380);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.bg}>
        <Starfield />
        <View style={styles.wash} />
        <ProtoChrome step="universe" />

        <View style={styles.brandBlock}>
          <Text
            style={styles.brand}
            accessibilityRole="header"
            accessibilityLabel={`${e2Fixtures.brand}, my universe`}
          >
            {e2Fixtures.brand}
          </Text>
          <Text style={styles.tagline}>your quiet orbit</Text>
        </View>

        <View style={[styles.stage, { height: stageH }]}>
          {e2Fixtures.circles.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => router.push('/prototype/e2/circle')}
              accessibilityRole="button"
              accessibilityLabel={`Open circle ${c.name}`}
              style={[
                styles.circleOrb,
                {
                  left: c.x * (width - 96),
                  top: c.y * (stageH - 96),
                },
              ]}
            >
              <View style={styles.circleSymbol}>
                <Text style={styles.circleSymbolText}>{c.symbol}</Text>
              </View>
              <Text style={styles.circleName}>{c.name}</Text>
            </Pressable>
          ))}

          <View
            style={[
              styles.selfOrbWrap,
              { left: width / 2 - e2.orbSelf / 2, top: stageH * 0.46 - e2.orbSelf / 2 },
            ]}
            accessibilityLabel="Your presence at the center of the universe"
          >
            <View style={styles.selfGlow} />
            <View style={styles.selfOrb}>
              <Text style={styles.selfMark}>◎</Text>
            </View>
            <Text style={styles.selfLabel}>{e2Fixtures.me.presenceLabel}</Text>
          </View>
        </View>

        <Pressable
          style={styles.secondary}
          onPress={() => router.push('/prototype/e2/circle')}
          accessibilityRole="button"
          accessibilityLabel="Enter Brooklyn Friends circle"
        >
          <Text style={styles.secondaryText}>enter a circle nearby</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: e2.space.void },
  bg: { flex: 1, backgroundColor: e2.space.void },
  wash: {
    ...StyleSheet.absoluteFill,
    backgroundColor: e2.space.deep,
    opacity: 0.55,
  },
  brandBlock: {
    paddingHorizontal: e2.spacePad,
    marginTop: 18,
  },
  brand: {
    fontFamily: e2.type.display,
    fontSize: 34,
    color: e2.brand.wordmark,
    letterSpacing: -0.5,
  },
  tagline: {
    marginTop: 6,
    fontFamily: e2.type.body,
    fontSize: 15,
    color: e2.brand.whisper,
  },
  stage: {
    marginTop: 8,
    marginHorizontal: e2.spacePad,
    position: 'relative',
  },
  selfOrbWrap: {
    position: 'absolute',
    width: e2.orbSelf,
    alignItems: 'center',
    zIndex: 5,
  },
  selfGlow: {
    position: 'absolute',
    width: e2.orbSelf + 36,
    height: e2.orbSelf + 36,
    borderRadius: 999,
    backgroundColor: e2.self.orbGlow,
    top: -18,
  },
  selfOrb: {
    width: e2.orbSelf,
    height: e2.orbSelf,
    borderRadius: 999,
    backgroundColor: e2.self.orbCore,
    borderWidth: 2,
    borderColor: e2.self.orbRim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selfMark: {
    fontSize: 28,
    color: '#6A5430',
  },
  selfLabel: {
    marginTop: 8,
    fontFamily: e2.type.bodyMed,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: e2.self.label,
  },
  circleOrb: {
    position: 'absolute',
    width: e2.orbCircle + 24,
    alignItems: 'center',
    zIndex: 2,
  },
  circleSymbol: {
    width: e2.orbCircle,
    height: e2.orbCircle,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: e2.circle.accentSoft,
    borderWidth: 1,
    borderColor: e2.circle.accent,
  },
  circleSymbolText: {
    fontSize: 26,
    color: e2.circle.ink,
  },
  circleName: {
    marginTop: 6,
    fontFamily: e2.type.bodyMed,
    fontSize: 12,
    color: e2.brand.whisper,
    textAlign: 'center',
  },
  secondary: {
    marginTop: 'auto',
    marginBottom: 28,
    alignSelf: 'center',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  secondaryText: {
    fontFamily: e2.type.body,
    fontSize: 14,
    color: e2.brand.whisper,
    textDecorationLine: 'underline',
    textDecorationColor: 'rgba(244,239,230,0.35)',
  },
});
