import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Line } from 'react-native-svg';
import { ProtoChrome } from '@/features/e2-prototype/ProtoChrome';
import { Starfield } from '@/features/e2-prototype/Starfield';
import {
  e2Fixtures,
  membersByTier,
  type SpatialMember,
} from '@/features/e2-prototype/fixtures';
import { e2 } from '@/features/e2-prototype/tokens';

function polar(
  cx: number,
  cy: number,
  radiusPx: number,
  angleDeg: number,
): { x: number; y: number } {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + Math.cos(rad) * radiusPx, y: cy + Math.sin(rad) * radiusPx };
}

function closeOrbSize(m: SpatialMember): number {
  if (m.depth === 'front') return e2.orbCloseFront;
  if (m.depth === 'back') return e2.orbCloseBack;
  return e2.orbClose;
}

/**
 * E2.1 Universe — private spatial hierarchy.
 * Close friends = large colored orbs (manual pick). Distant = small dots.
 * Size/distance communicate private emphasis, never engagement scores.
 */
export default function E2UniversePrototype() {
  const { width, height } = useWindowDimensions();
  const stageH = Math.max(height * 0.64, 400);
  const stageW = width - e2.spacePad * 2;
  const cx = stageW / 2;
  const cy = stageH * 0.48;
  const maxR = Math.min(stageW, stageH) * 0.46;

  const close = useMemo(() => membersByTier('close'), []);
  const near = useMemo(() => membersByTier('near'), []);
  const distant = useMemo(() => membersByTier('distant'), []);
  const [focusId, setFocusId] = useState<string | null>(null);
  const focusedMember = useMemo(
    () => e2Fixtures.members.find((m) => m.id === focusId) ?? null,
    [focusId],
  );

  const visitDiary = (_m: SpatialMember) => {
    setFocusId(null);
    router.push('/prototype/e2/friend-diary');
  };

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
          <Text style={styles.tagline}>nearness you chose — private to you</Text>
        </View>

        <View style={[styles.stage, { height: stageH }]}>
          <Svg width={stageW} height={stageH} style={StyleSheet.absoluteFill}>
            {close.map((m) => {
              const p = polar(cx, cy, m.radius * maxR, m.angleDeg);
              const bright = focusId === null;
              return (
                <Line
                  key={`link-${m.id}`}
                  x1={cx}
                  y1={cy}
                  x2={p.x}
                  y2={p.y}
                  stroke={bright ? e2.linkFaint : 'rgba(215,222,234,0.06)'}
                  strokeWidth={1}
                />
              );
            })}
            {focusedMember && focusedMember.tier !== 'close'
              ? (() => {
                  const r =
                    focusedMember.tier === 'distant'
                      ? Math.min(focusedMember.radius, 0.55)
                      : focusedMember.radius;
                  const p = polar(cx, cy, r * maxR, focusedMember.angleDeg);
                  return (
                    <Line
                      x1={cx}
                      y1={cy}
                      x2={p.x}
                      y2={p.y}
                      stroke={e2.linkFocus}
                      strokeWidth={1.4}
                    />
                  );
                })()
              : null}
          </Svg>

          {/* Distant clusters first (behind) */}
          {distant.map((m) => {
            const pulled = focusId === m.id;
            const p = polar(
              cx,
              cy,
              (pulled ? Math.min(m.radius, 0.55) : m.radius) * maxR,
              m.angleDeg,
            );
            const size = pulled ? e2.orbNear + 6 : e2.orbDistant;
            return (
              <Pressable
                key={m.id}
                onPress={() => setFocusId(pulled ? null : m.id)}
                accessibilityRole="button"
                accessibilityLabel={
                  pulled
                    ? `${m.displayName}, dismiss focus`
                    : `Focus distant member in ${m.circleName}`
                }
                style={[
                  styles.node,
                  {
                    left: p.x - size / 2,
                    top: p.y - size / 2,
                    width: size,
                    height: size,
                    borderRadius: size,
                    backgroundColor: pulled ? '#B8C2D4' : m.color,
                    opacity: focusId && !pulled ? 0.35 : 0.85,
                    zIndex: pulled ? 8 : 1,
                  },
                ]}
              />
            );
          })}

          {near.map((m) => {
            const active = focusId === m.id;
            const p = polar(cx, cy, m.radius * maxR, m.angleDeg);
            const size = active ? e2.orbNear + 8 : e2.orbNear;
            return (
              <Pressable
                key={m.id}
                onPress={() => setFocusId(active ? null : m.id)}
                accessibilityRole="button"
                accessibilityLabel={`${m.displayName}, near member`}
                style={[
                  styles.node,
                  {
                    left: p.x - size / 2,
                    top: p.y - size / 2,
                    width: size,
                    height: size,
                    borderRadius: size,
                    backgroundColor: active ? '#C5D0E0' : m.color,
                    zIndex: 3,
                    opacity: focusId && !active ? 0.4 : 1,
                  },
                ]}
              />
            );
          })}

          {close.map((m) => {
            const p = polar(cx, cy, m.radius * maxR, m.angleDeg);
            const size = closeOrbSize(m);
            return (
              <Pressable
                key={m.id}
                onPress={() => visitDiary(m)}
                accessibilityRole="button"
                accessibilityLabel={`${m.displayName}, close friend, open diary`}
                style={[
                  styles.closeWrap,
                  {
                    left: p.x - size / 2 - 8,
                    top: p.y - size / 2 - 4,
                    width: size + 16,
                    zIndex: m.depth === 'front' ? 7 : m.depth === 'back' ? 4 : 6,
                    opacity: focusId ? 0.45 : 1,
                  },
                ]}
              >
                <View
                  style={[
                    styles.closeOrb,
                    {
                      width: size,
                      height: size,
                      borderRadius: size,
                      backgroundColor: m.color,
                      shadowOpacity: m.depth === 'front' ? 0.45 : 0.25,
                    },
                  ]}
                />
                <Text style={styles.closeName}>{m.displayName}</Text>
              </Pressable>
            );
          })}

          <View
            style={[
              styles.selfOrbWrap,
              { left: cx - e2.orbSelf / 2, top: cy - e2.orbSelf / 2 },
            ]}
            accessibilityLabel="Your presence at the center of the universe"
          >
            <View style={styles.selfGlow} />
            <View style={styles.selfOrb}>
              <Text style={styles.selfMark}>◎</Text>
            </View>
            <Text style={styles.selfLabel}>{e2Fixtures.me.presenceLabel}</Text>
          </View>

          {focusedMember && focusedMember.tier !== 'close' ? (
            <View
              style={styles.focusCard}
              accessibilityRole="summary"
              accessibilityLabel="Focused member preview"
            >
              <Text style={styles.focusName}>{focusedMember.displayName}</Text>
              <Text style={styles.focusMeta}>
                {focusedMember.circleName}
                {focusedMember.hasDiaryToday ? ' · diary today' : ' · quiet today'}
              </Text>
              <Pressable
                style={styles.focusBtn}
                onPress={() => visitDiary(focusedMember)}
                accessibilityRole="button"
                accessibilityLabel={`Visit ${focusedMember.displayName} diary`}
              >
                <Text style={styles.focusBtnText}>visit diary</Text>
              </Pressable>
              <Pressable
                onPress={() => setFocusId(null)}
                accessibilityRole="button"
                accessibilityLabel="Close focus"
              >
                <Text style={styles.focusDismiss}>return to place</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        <Text style={styles.privacy}>{e2Fixtures.privacyNote}</Text>

        <Pressable
          style={styles.secondary}
          onPress={() => router.push('/prototype/e2/circle')}
          accessibilityRole="button"
          accessibilityLabel="Open circle room view"
        >
          <Text style={styles.secondaryText}>open a circle room →</Text>
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
    marginTop: 12,
  },
  brand: {
    fontFamily: e2.type.display,
    fontSize: 32,
    color: e2.brand.wordmark,
    letterSpacing: -0.5,
  },
  tagline: {
    marginTop: 6,
    fontFamily: e2.type.body,
    fontSize: 14,
    color: e2.brand.whisper,
  },
  stage: {
    marginTop: 4,
    marginHorizontal: e2.spacePad,
    position: 'relative',
  },
  node: {
    position: 'absolute',
  },
  closeWrap: {
    position: 'absolute',
    alignItems: 'center',
  },
  closeOrb: {
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.28)',
    shadowColor: '#000',
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  closeName: {
    marginTop: 6,
    fontFamily: e2.type.bodyMed,
    fontSize: 12,
    color: e2.brand.wordmark,
  },
  selfOrbWrap: {
    position: 'absolute',
    width: e2.orbSelf,
    alignItems: 'center',
    zIndex: 10,
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
  focusCard: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(244,239,230,0.22)',
    backgroundColor: 'rgba(14,21,38,0.92)',
    padding: 16,
    zIndex: 20,
  },
  focusName: {
    fontFamily: e2.type.display,
    fontSize: 22,
    color: e2.brand.wordmark,
  },
  focusMeta: {
    marginTop: 4,
    fontFamily: e2.type.body,
    fontSize: 13,
    color: e2.brand.whisper,
  },
  focusBtn: {
    marginTop: 14,
    alignSelf: 'flex-start',
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: e2.self.orbCore,
    justifyContent: 'center',
  },
  focusBtnText: {
    fontFamily: e2.type.bodySemi,
    fontSize: 14,
    color: '#3A2E18',
  },
  focusDismiss: {
    marginTop: 12,
    fontFamily: e2.type.body,
    fontSize: 13,
    color: e2.brand.whisper,
  },
  privacy: {
    marginHorizontal: e2.spacePad,
    marginTop: 4,
    fontFamily: e2.type.body,
    fontSize: 11,
    lineHeight: 15,
    color: 'rgba(215,222,234,0.45)',
  },
  secondary: {
    marginTop: 8,
    marginBottom: 22,
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
