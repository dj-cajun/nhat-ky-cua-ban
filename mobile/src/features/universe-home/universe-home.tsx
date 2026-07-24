import { useNavigation } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Modal,
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
import { useMessages } from '@/i18n';
import { INTRO_HANDOFF, type IntroMode } from './handoff';
import { IntroPlayer } from './intro-player';
import { markIntroSeen, resolveIntroMode } from './intro-policy';
import {
  isUniverseTabReturn,
  markUniverseTabBlurred,
} from './session-visit';
import { UniverseScene3D } from './universe-scene';

type Props = {
  profile: Profile;
  circles: CircleSummary[];
  canCreate: boolean;
  onPressSelf: () => void;
  onPressCircle: (id: string) => void;
  onCreateCircle: () => void;
  forceFallback?: boolean;
  onIntroPlayingChange?: (playing: boolean) => void;
};

/**
 * Fullscreen intro Modal (MP4) → crossfade → universe home.
 */
export function UniverseHome({
  profile,
  circles,
  canCreate,
  onPressSelf,
  onPressCircle,
  onCreateCircle,
  forceFallback,
  onIntroPlayingChange,
}: Props) {
  const t = useMessages();
  const navigation = useNavigation();
  const { width, height } = useWindowDimensions();
  const [mode, setMode] = useState<IntroMode | null>(null);
  const [revealProfile, setRevealProfile] = useState(false);
  const [revealPlanets, setRevealPlanets] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const [introKey, setIntroKey] = useState(0);

  const introOp = useSharedValue(1);
  const sceneOp = useSharedValue(0);

  const showIntro = mode === 'full' || mode === 'short';
  const introPlaying = Boolean(showIntro && !introDone);

  useEffect(() => {
    onIntroPlayingChange?.(introPlaying);
  }, [introPlaying, onIntroPlayingChange]);

  // Real tab blur only (not Strict Mode remount)
  useEffect(() => {
    const unsub = navigation.addListener('blur', () => {
      markUniverseTabBlurred();
    });
    return unsub;
  }, [navigation]);

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

  // Resolve once on mount — tab-return only after a real blur
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const resolved = await resolveIntroMode({
        isTabReturn: isUniverseTabReturn(),
      });
      if (cancelled) return;
      applyMode(resolved);
    })();
    return () => {
      cancelled = true;
    };
  }, [applyMode]);

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
    introOp.value = 0;
    sceneOp.value = 1;
    setTimeout(() => setRevealProfile(true), 80);
    setTimeout(
      () => setRevealPlanets(true),
      INTRO_HANDOFF.profileFadeSec * 1000 + 120,
    );
  }, [introOp, sceneOp]);

  const introStyle = useAnimatedStyle(() => ({
    opacity: introOp.value,
  }));

  const sceneStyle = useAnimatedStyle(() => ({
    opacity: sceneOp.value,
  }));

  const modalW = Math.max(width, 1);
  const modalH = Math.max(height, 1);

  return (
    <View style={[styles.root, { backgroundColor: INTRO_HANDOFF.spaceBg }]}>
      <Animated.View
        style={[StyleSheet.absoluteFill, sceneStyle]}
        pointerEvents={introPlaying ? 'none' : 'auto'}
      >
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

      <Modal
        visible={introPlaying}
        animationType="none"
        transparent={false}
        statusBarTranslucent
        presentationStyle="fullScreen"
        supportedOrientations={['portrait']}
      >
        <View
          style={[
            styles.modalRoot,
            { width: modalW, height: modalH, backgroundColor: INTRO_HANDOFF.spaceBg },
          ]}
        >
          <Animated.View style={[StyleSheet.absoluteFill, sceneStyle]} pointerEvents="none">
            <UniverseScene3D
              profile={profile}
              circles={circles}
              revealProfile={false}
              revealPlanets={false}
              onPressSelf={() => {}}
              onPressCircle={() => {}}
              forceFallback={forceFallback}
            />
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, introStyle]}>
            {mode === 'full' || mode === 'short' ? (
              <IntroPlayer
                key={introKey}
                width={modalW}
                height={modalH}
                mode={mode}
                onNearEnd={startCrossfade}
                onEnded={finishIntro}
              />
            ) : null}
          </Animated.View>
        </View>
      </Modal>

      {!introPlaying ? (
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

          {/* Profile lives on the center sphere — avoid overlay chips that steal taps. */}
        </SafeAreaView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  modalRoot: { flex: 1, overflow: 'hidden' },
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
});
