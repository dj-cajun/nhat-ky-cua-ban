import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Line } from 'react-native-svg';
import { BreathingView } from '@/features/space-ui/BreathingView';
import { SpatialDot } from '@/features/space-ui/SpatialDot';
import { spaceMotion } from '@/features/space-ui/space-motion';
import type { CircleSummary, Profile } from '@/types/domain';
import {
  addCloseFriend,
  getCloseFriendIds,
  removeCloseFriend,
} from './close-friends.store';
import { INTRO_HANDOFF } from './handoff';
import { resolveLiveHandoffLayout, resolveSettleScale } from './handoff-layout';
import { buildSpatialNodes, type SpatialNode } from './spatial-members';

export type UniverseGraphFriend = {
  userId: string;
  displayName: string;
  circleId: string;
};

const SPACE = {
  void: '#070B14',
  linkFaint: 'rgba(215,222,234,0.14)',
  linkFocus: 'rgba(232,199,138,0.55)',
  ink: '#F4EFE6',
  whisper: 'rgba(244,239,230,0.62)',
  card: 'rgba(14,21,38,0.92)',
  cardBorder: 'rgba(244,239,230,0.22)',
};

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + Math.cos(rad) * r, y: cy + Math.sin(rad) * r };
}

function closeSize(n: SpatialNode) {
  if (n.depth === 'front') return 64;
  if (n.depth === 'back') return 48;
  return 56;
}

/**
 * E3/E4 Universe — private spatial hierarchy + intentional presence motion.
 * Close friends are manually selected locally; never engagement-ranked.
 */
export function FallbackUniverse({
  profile,
  circles,
  friends = [],
  revealProfile,
  revealPlanets,
  onPressSelf,
  onPressCircle,
  onPressFriend,
  animateSettle = true,
}: {
  profile: Profile;
  circles: CircleSummary[];
  friends?: UniverseGraphFriend[];
  revealProfile: boolean;
  revealPlanets: boolean;
  onPressSelf: () => void;
  onPressCircle: (id: string) => void;
  onPressFriend?: (userId: string) => void;
  animateSettle?: boolean;
}) {
  const { width, height } = useWindowDimensions();
  const layout = resolveLiveHandoffLayout(width, height);
  const { diameter, left, top, cxPx, cyPx } = layout;
  const settleScale = resolveSettleScale(width, height);
  const maxR = Math.min(width, height) * 0.42;

  const selfScale = useSharedValue(revealProfile && !animateSettle ? settleScale : 1);
  const diagramOp = useSharedValue(0);
  const focusCardOp = useSharedValue(0);
  const [closeIds, setCloseIds] = useState<string[]>([]);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [breathing, setBreathing] = useState(!animateSettle && revealProfile);

  useEffect(() => {
    void getCloseFriendIds().then(setCloseIds);
  }, []);

  useEffect(() => {
    if (revealProfile) {
      setBreathing(false);
      if (animateSettle) {
        selfScale.value = withTiming(settleScale, {
          duration: INTRO_HANDOFF.settleDurationSec * 1000,
          easing: Easing.out(Easing.quad),
        });
        const id = setTimeout(
          () => setBreathing(true),
          INTRO_HANDOFF.settleDurationSec * 1000 + 80,
        );
        return () => clearTimeout(id);
      }
      selfScale.value = settleScale;
      setBreathing(true);
    } else {
      selfScale.value = 1;
      setBreathing(false);
    }
  }, [revealProfile, animateSettle, settleScale, selfScale]);

  useEffect(() => {
    diagramOp.value = revealPlanets
      ? withTiming(1, { duration: 750, easing: Easing.out(Easing.cubic) })
      : 0;
    if (!revealPlanets) setFocusId(null);
  }, [revealPlanets, diagramOp]);

  useEffect(() => {
    const show = Boolean(focusId);
    focusCardOp.value = withTiming(show ? 1 : 0, {
      duration: spaceMotion.focusCardMs,
      easing: Easing.out(Easing.cubic),
    });
  }, [focusId, focusCardOp]);

  const nodes = useMemo(
    () => buildSpatialNodes(friends, closeIds),
    [friends, closeIds],
  );
  const focused = useMemo(
    () => nodes.find((n) => n.userId === focusId) ?? null,
    [nodes, focusId],
  );
  const closeNodes = nodes.filter((n) => n.tier === 'close');
  const nearNodes = nodes.filter((n) => n.tier === 'near');
  const distantNodes = nodes.filter((n) => n.tier === 'distant');

  const visit = useCallback(
    (userId: string) => {
      setFocusId(null);
      if (onPressFriend) onPressFriend(userId);
    },
    [onPressFriend],
  );

  const keepNear = useCallback(async (userId: string) => {
    const next = await addCloseFriend(userId);
    setCloseIds(next);
    setFocusId(null);
  }, []);

  const releaseNear = useCallback(async (userId: string) => {
    const next = await removeCloseFriend(userId);
    setCloseIds(next);
  }, []);

  const selfStyle = useAnimatedStyle(() => ({
    transform: [{ scale: selfScale.value }],
  }));
  const diagramStyle = useAnimatedStyle(() => ({
    opacity: diagramOp.value,
  }));
  const focusCardStyle = useAnimatedStyle(() => ({
    opacity: focusCardOp.value,
    transform: [{ translateY: (1 - focusCardOp.value) * 12 }],
  }));

  const glowPad = 0.12;
  const hit = diameter * (1 + glowPad * 2);
  const avatar = Math.max(28, diameter * 0.32);
  const circleName = (id: string) => circles.find((c) => c.id === id)?.name ?? 'Circle';

  return (
    <View style={[styles.root, { width, height, backgroundColor: SPACE.void }]}>
      <StarField width={width} height={height} />

      <Animated.View
        style={[StyleSheet.absoluteFill, diagramStyle, { pointerEvents: 'box-none' }]}
      >
        <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
          {closeNodes.map((n) => {
            const p = polar(cxPx, cyPx, n.radius * maxR, n.angleDeg);
            return (
              <Line
                key={`link-${n.userId}`}
                x1={cxPx}
                y1={cyPx}
                x2={p.x}
                y2={p.y}
                stroke={focusId ? 'rgba(215,222,234,0.06)' : SPACE.linkFaint}
                strokeWidth={1}
              />
            );
          })}
          {focused && focused.tier !== 'close'
            ? (() => {
                const r =
                  focused.tier === 'distant'
                    ? Math.min(focused.radius, 0.55)
                    : focused.radius;
                const p = polar(cxPx, cyPx, r * maxR, focused.angleDeg);
                return (
                  <Line
                    x1={cxPx}
                    y1={cyPx}
                    x2={p.x}
                    y2={p.y}
                    stroke={SPACE.linkFocus}
                    strokeWidth={1.4}
                  />
                );
              })()
            : null}
        </Svg>

        {distantNodes.map((n) => {
          const pulled = focusId === n.userId;
          const home = polar(cxPx, cyPx, n.radius * maxR, n.angleDeg);
          const focus = polar(cxPx, cyPx, Math.min(n.radius, 0.55) * maxR, n.angleDeg);
          return (
            <SpatialDot
              key={n.userId}
              homeX={home.x}
              homeY={home.y}
              focusX={focus.x}
              focusY={focus.y}
              homeSize={9}
              focusSize={28}
              color={n.color}
              focusColor="#B8C2D4"
              focused={pulled}
              dimmed={Boolean(focusId && !pulled)}
              zIndex={pulled ? 8 : 1}
              enabled={revealPlanets}
              accessibilityLabel={
                pulled ? `${n.displayName}, dismiss` : `Focus ${n.displayName}`
              }
              onPress={() => setFocusId(pulled ? null : n.userId)}
            />
          );
        })}

        {nearNodes.map((n) => {
          const active = focusId === n.userId;
          const home = polar(cxPx, cyPx, n.radius * maxR, n.angleDeg);
          return (
            <SpatialDot
              key={n.userId}
              homeX={home.x}
              homeY={home.y}
              focusX={home.x}
              focusY={home.y}
              homeSize={22}
              focusSize={30}
              color={n.color}
              focusColor="#C5D0E0"
              focused={active}
              dimmed={Boolean(focusId && !active)}
              zIndex={3}
              enabled={revealPlanets}
              accessibilityLabel={n.displayName}
              onPress={() => setFocusId(active ? null : n.userId)}
            />
          );
        })}

        {closeNodes.map((n) => {
          const p = polar(cxPx, cyPx, n.radius * maxR, n.angleDeg);
          const size = closeSize(n);
          return (
            <Pressable
              key={n.userId}
              onPress={() => visit(n.userId)}
              onLongPress={() => void releaseNear(n.userId)}
              accessibilityRole="button"
              accessibilityLabel={`${n.displayName}, close friend, open diary`}
              style={[
                styles.closeWrap,
                {
                  left: p.x - size / 2 - 8,
                  top: p.y - size / 2 - 4,
                  width: size + 16,
                  zIndex: n.depth === 'front' ? 7 : n.depth === 'back' ? 4 : 6,
                  opacity: focusId ? 0.45 : 1,
                  pointerEvents: revealPlanets ? 'auto' : 'none',
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
                    backgroundColor: n.color,
                  },
                ]}
              >
                <Text style={styles.closeLetter}>{n.displayName.slice(0, 1)}</Text>
              </View>
              <Text style={styles.closeName} numberOfLines={1}>
                {n.displayName}
              </Text>
            </Pressable>
          );
        })}
      </Animated.View>

      <Animated.View
        style={[
          styles.sphereWrap,
          {
            left: left - diameter * glowPad,
            top: top - diameter * glowPad,
            width: hit,
            height: hit,
            zIndex: 20,
          },
          selfStyle,
        ]}
      >
        <BreathingView active={breathing && revealPlanets} style={styles.sphereHit}>
          <Pressable
            onPress={onPressSelf}
            style={styles.sphereHit}
            accessibilityRole="button"
            accessibilityLabel={profile.displayName}
            testID="universe-self-sphere"
          >
            <View
              style={[
                styles.glow,
                {
                  width: hit,
                  height: hit,
                  borderRadius: hit / 2,
                  backgroundColor: INTRO_HANDOFF.sphere.glow,
                  pointerEvents: 'none',
                },
              ]}
            />
            <View
              style={[
                styles.sphere,
                {
                  width: diameter,
                  height: diameter,
                  borderRadius: diameter / 2,
                  backgroundColor: INTRO_HANDOFF.sphere.color,
                  pointerEvents: 'none',
                },
              ]}
            >
              <View
                style={[
                  styles.highlight,
                  {
                    width: diameter * 0.35,
                    height: diameter * 0.18,
                    borderRadius: diameter * 0.1,
                  },
                ]}
              />
              {revealProfile ? (
                <View style={styles.profile}>
                  <View
                    style={[
                      styles.avatar,
                      { width: avatar, height: avatar, borderRadius: avatar / 2 },
                    ]}
                  >
                    <Text style={[styles.avatarText, { fontSize: avatar * 0.42 }]}>
                      {profile.displayName.slice(0, 1)}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.name,
                      {
                        fontSize: Math.max(10, diameter * 0.07),
                        maxWidth: diameter * 0.75,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {profile.displayName}
                  </Text>
                </View>
              ) : null}
            </View>
          </Pressable>
        </BreathingView>
      </Animated.View>

      {revealPlanets && focused && focused.tier !== 'close' ? (
        <Animated.View
          style={[styles.focusCard, focusCardStyle]}
          accessibilityRole="summary"
          pointerEvents="box-none"
        >
          <Text style={styles.focusName}>{focused.displayName}</Text>
          <Text style={styles.focusMeta}>{circleName(focused.circleId)} · same circle</Text>
          <Pressable
            style={styles.focusBtn}
            onPress={() => visit(focused.userId)}
            accessibilityRole="button"
          >
            <Text style={styles.focusBtnText}>visit diary</Text>
          </Pressable>
          {closeIds.length < 3 && !closeIds.includes(focused.userId) ? (
            <Pressable
              onPress={() => void keepNear(focused.userId)}
              accessibilityRole="button"
              style={styles.focusSecondary}
            >
              <Text style={styles.focusSecondaryText}>keep near me (private)</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={() => setFocusId(null)} accessibilityRole="button">
            <Text style={styles.focusDismiss}>return to place</Text>
          </Pressable>
        </Animated.View>
      ) : null}

      {revealPlanets && circles.length > 0 ? (
        <View style={styles.circleDock} pointerEvents="box-none">
          {circles.slice(0, 4).map((c) => (
            <Pressable
              key={c.id}
              onPress={() => onPressCircle(c.id)}
              accessibilityRole="button"
              accessibilityLabel={`Open ${c.name} circle room`}
              style={styles.circleChip}
            >
              <Text style={styles.circleChipSymbol}>{c.symbol}</Text>
              <Text style={styles.circleChipName} numberOfLines={1}>
                {c.name}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function StarField({ width, height }: { width: number; height: number }) {
  const stars = useMemo(
    () =>
      Array.from({ length: 42 }, (_, i) => ({
        key: i,
        left: (i * 97) % width,
        top: (i * 53) % height,
        size: 1 + (i % 2),
        opacity: 0.14 + (i % 5) * 0.05,
      })),
    [width, height],
  );
  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
      {stars.map((s) => (
        <View
          key={s.key}
          style={{
            position: 'absolute',
            left: s.left,
            top: s.top,
            width: s.size,
            height: s.size,
            borderRadius: s.size,
            backgroundColor: '#fff',
            opacity: s.opacity,
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { overflow: 'hidden' },
  closeWrap: { position: 'absolute', alignItems: 'center' },
  closeOrb: {
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeLetter: { color: '#1A1410', fontWeight: '700', fontSize: 16 },
  closeName: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '500',
    color: SPACE.ink,
    maxWidth: 72,
    textAlign: 'center',
  },
  sphereWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sphereHit: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: { position: 'absolute', opacity: 0.22 },
  sphere: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    boxShadow: `0 6px 18px ${INTRO_HANDOFF.sphere.glow}80`,
    elevation: 10,
  },
  highlight: {
    position: 'absolute',
    top: '18%',
    left: '22%',
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  profile: { alignItems: 'center', paddingHorizontal: 8 },
  avatar: {
    backgroundColor: 'rgba(42, 36, 48, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarText: { color: '#fff', fontWeight: '700' },
  name: { marginTop: 6, color: '#2A2430', fontWeight: '700' },
  focusCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 88,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: SPACE.cardBorder,
    backgroundColor: SPACE.card,
    padding: 16,
    zIndex: 30,
  },
  focusName: { fontSize: 22, fontWeight: '600', color: SPACE.ink },
  focusMeta: { marginTop: 4, fontSize: 13, color: SPACE.whisper },
  focusBtn: {
    marginTop: 14,
    alignSelf: 'flex-start',
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: '#F7E7C8',
    justifyContent: 'center',
  },
  focusBtnText: { fontSize: 14, fontWeight: '700', color: '#3A2E18' },
  focusSecondary: { marginTop: 10, minHeight: 36, justifyContent: 'center' },
  focusSecondaryText: { fontSize: 13, color: SPACE.ink, textDecorationLine: 'underline' },
  focusDismiss: { marginTop: 10, fontSize: 13, color: SPACE.whisper },
  circleDock: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    zIndex: 25,
  },
  circleChip: {
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(244,239,230,0.22)',
    backgroundColor: 'rgba(14,21,38,0.72)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: 160,
  },
  circleChipSymbol: { color: SPACE.whisper, fontSize: 13 },
  circleChipName: { color: SPACE.ink, fontSize: 12, fontWeight: '600', maxWidth: 110 },
});
