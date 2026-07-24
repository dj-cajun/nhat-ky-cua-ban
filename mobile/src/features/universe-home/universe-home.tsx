import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { CircleSummary, Profile } from '@/types/domain';
import { colors } from '@/constants/theme';
import { useMessages } from '@/i18n';
import { INTRO_HANDOFF, type IntroMode } from './handoff';
import { IntroPlayer } from './intro-player';
import { markIntroSeen, resolveIntroMode } from './intro-policy';
import { consumeUniverseVisitKind } from './session-visit';
import { UniverseScene3D } from './universe-scene';

const KEY_FORCE = 'your-diary-universe-intro-force-once';

type Props = {
  profile: Profile;
  circles: CircleSummary[];
  canCreate: boolean;
  onPressSelf: () => void;
  onPressCircle: (id: string) => void;
  onCreateCircle: () => void;
  /** Prefer 2D glow spheres (no GL). */
  forceFallback?: boolean;
};

/**
 * Intro (video or synthetic) → crossfade → 3D (or 2D fallback) universe home.
 */
export function UniverseHome({
  profile,
  circles,
  canCreate,
  onPressSelf,
  onPressCircle,
  onCreateCircle,
  forceFallback,
}: Props) {
  const t = useMessages();
  const { width, height } = useWindowDimensions();
  const [mode, setMode] = useState<IntroMode | null>(null);
  const [revealProfile, setRevealProfile] = useState(false);
  const [revealPlanets, setRevealPlanets] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const [introKey, setIntroKey] = useState(0);

  const introOp = useSharedValue(1);
  const sceneOp = useSharedValue(0);

  const applyMode = useCallback(
    (resolved: IntroMode) => {
      setMode(resolved);
      if (resolved === 'none') {
        introOp.value = 0;
        sceneOp.value = 1;
        setIntroDone(true);
        setRevealProfile(true);
        setRevealPlanets(true);
      } else {
        introOp.value = 1;
        sceneOp.value = 0;
        setIntroDone(false);
        setRevealProfile(false);
        setRevealPlanets(false);
        setIntroKey((k) => k + 1);
      }
    },
    [introOp, sceneOp],
  );

  useEffect(() => {
    let cancelled = false;
    const visit = consumeUniverseVisitKind();
    void (async () => {
      const resolved = await resolveIntroMode({ isTabReturn: visit === 'tab-return' });
      if (cancelled) return;
      applyMode(resolved);
    })();
    return () => {
      cancelled = true;
    };
  }, [applyMode]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        try {
          const force = await AsyncStorage.getItem(KEY_FORCE);
          if (force !== '1' || cancelled) return;
          const resolved = await resolveIntroMode({ isTabReturn: false });
          if (cancelled) return;
          applyMode(resolved);
        } catch {
          /* ignore */
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [applyMode]),
  );

  const startCrossfade = useCallback(() => {
    introOp.value = withTiming(0, {
      duration: INTRO_HANDOFF.crossfadeDurationSec * 1000,
      easing: Easing.inOut(Easing.quad),
    });
    sceneOp.value = withTiming(1, {
      duration: INTRO_HANDOFF.crossfadeDurationSec * 1000,
      easing: Easing.inOut(Easing.quad),
    });
  }, [introOp, sceneOp]);

  const finishIntro = useCallback(() => {
    setIntroDone(true);
    void markIntroSeen();
    setTimeout(() => setRevealProfile(true), 80);
    setTimeout(
      () => setRevealPlanets(true),
      INTRO_HANDOFF.profileFadeSec * 1000 + 120,
    );
  }, []);

  const introStyle = useAnimatedStyle(() => ({
    opacity: introOp.value,
  }));

  const sceneStyle = useAnimatedStyle(() => ({
    opacity: sceneOp.value,
  }));

  const showIntro = mode === 'full' || mode === 'short';

  return (
    <View style={[styles.root, { backgroundColor: INTRO_HANDOFF.spaceBg }]}>
      <Animated.View style={[StyleSheet.absoluteFill, sceneStyle]} pointerEvents="box-none">
        {mode != null ? (
          <UniverseScene3D
            profile={profile}
            circles={circles}
            revealProfile={revealProfile}
            revealPlanets={revealPlanets}
            onPressSelf={onPressSelf}
            onPressCircle={onPressCircle}
            forceFallback={forceFallback}
          />
        ) : null}
      </Animated.View>

      {showIntro && !introDone ? (
        <Animated.View style={[StyleSheet.absoluteFill, introStyle]} pointerEvents="none">
          <IntroPlayer
            key={introKey}
            width={width}
            height={height}
            mode={mode}
            onNearEnd={startCrossfade}
            onEnded={finishIntro}
          />
        </Animated.View>
      ) : null}

      <SafeAreaView style={styles.chrome} pointerEvents="box-none">
        <View style={styles.header} pointerEvents="box-none">
          <View>
            <Text style={styles.brand}>{t.universe.brand}</Text>
            <Text style={styles.title}>{t.universe.title}</Text>
          </View>
          <Pressable
            style={styles.avatar}
            onPress={onPressSelf}
            accessibilityRole="button"
            accessibilityLabel={profile.displayName}
          >
            <Text style={styles.avatarText}>{profile.displayName.slice(0, 1)}</Text>
          </Pressable>
        </View>

        {circles.length === 0 && introDone ? (
          <View style={styles.emptyWrap} pointerEvents="box-none">
            <Text style={styles.emptyTitle}>{t.universe.emptyTitle}</Text>
            <Text style={styles.emptySub}>{t.universe.emptySub}</Text>
            {canCreate ? (
              <Pressable
                style={styles.create}
                onPress={onCreateCircle}
                accessibilityRole="button"
                accessibilityLabel={t.universe.createCircle}
              >
                <Text style={styles.createText}>{t.universe.createCircle}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {circles.length > 0 && canCreate && introDone ? (
          <Pressable
            style={styles.createFab}
            onPress={onCreateCircle}
            accessibilityRole="button"
            accessibilityLabel={t.universe.createCircle}
          >
            <Text style={styles.createText}>{t.universe.createCircle}</Text>
          </Pressable>
        ) : null}

        {revealProfile ? (
          <Pressable
            style={styles.nameChip}
            onPress={onPressSelf}
            accessibilityRole="button"
            accessibilityLabel={profile.displayName}
          >
            <Text style={styles.nameChipText}>{profile.displayName}</Text>
          </Pressable>
        ) : null}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  chrome: { ...StyleSheet.absoluteFill, padding: 16, justifyContent: 'space-between' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { color: 'rgba(255,230,168,0.85)', fontSize: 12, letterSpacing: 0.6 },
  title: { fontSize: 20, fontWeight: '600', color: '#F7F4EF', marginTop: 2 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(240,195,106,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255,230,168,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700' },
  emptyWrap: { alignItems: 'center', marginBottom: 48 },
  emptyTitle: { color: '#F7F4EF', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  emptySub: { color: 'rgba(247,244,239,0.7)', fontSize: 13, marginTop: 8, textAlign: 'center' },
  create: {
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,230,168,0.35)',
    backgroundColor: 'rgba(20,16,12,0.55)',
    paddingVertical: 14,
    paddingHorizontal: 18,
    minHeight: 44,
  },
  createFab: {
    alignSelf: 'center',
    marginBottom: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,230,168,0.35)',
    backgroundColor: 'rgba(20,16,12,0.55)',
    paddingVertical: 14,
    paddingHorizontal: 18,
    minHeight: 44,
  },
  createText: { color: '#F7F4EF', fontSize: 14, textAlign: 'center' },
  nameChip: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: '38%',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(20,16,12,0.45)',
  },
  nameChipText: { color: colors.bg, fontSize: 13, fontWeight: '600' },
});
