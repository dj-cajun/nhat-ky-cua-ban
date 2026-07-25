import { Asset } from 'expo-asset';
import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { createElement, useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { INTRO_HANDOFF } from './handoff';
import { getIntroVideoSource } from './intro-asset';
import { SyntheticSunBirth } from './synthetic-sun-birth';

/**
 * Full/short intro: prefers bundled MP4 on every platform.
 * Web uses an HTML <video>; native uses expo-video. Falls back to synthetic.
 */
export function IntroPlayer({
  width,
  height,
  mode,
  onNearEnd,
  onEnded,
}: {
  width: number;
  height: number;
  mode: 'full' | 'short';
  onNearEnd: () => void;
  onEnded: () => void;
}) {
  const moduleId = mode === 'full' ? getIntroVideoSource() : null;

  if (moduleId == null) {
    return (
      <SyntheticSunBirth
        width={width}
        height={height}
        short={mode === 'short'}
        onNearEnd={onNearEnd}
        onEnded={onEnded}
      />
    );
  }

  if (Platform.OS === 'web') {
    return (
      <WebIntroVideo
        moduleId={moduleId}
        width={width}
        height={height}
        onNearEnd={onNearEnd}
        onEnded={onEnded}
      />
    );
  }

  return (
    <NativeIntroVideo
      source={moduleId}
      width={width}
      height={height}
      onNearEnd={onNearEnd}
      onEnded={onEnded}
    />
  );
}

function WebIntroVideo({
  moduleId,
  width,
  height,
  onNearEnd,
  onEnded,
}: {
  moduleId: number;
  width: number;
  height: number;
  onNearEnd: () => void;
  onEnded: () => void;
}) {
  const [uri, setUri] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const nearFired = useRef(false);
  const endedFired = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const asset = Asset.fromModule(moduleId);
        await asset.downloadAsync();
        if (cancelled) return;
        const next = asset.localUri ?? asset.uri;
        if (!next) throw new Error('no uri');
        setUri(next);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [moduleId]);

  useEffect(() => {
    const failSafe = setTimeout(() => {
      if (endedFired.current) return;
      endedFired.current = true;
      if (!nearFired.current) {
        nearFired.current = true;
        onNearEnd();
      }
      onEnded();
    }, (INTRO_HANDOFF.durationSec + 2) * 1000);
    return () => clearTimeout(failSafe);
  }, [onNearEnd, onEnded]);

  if (failed) {
    return (
      <SyntheticSunBirth
        width={width}
        height={height}
        onNearEnd={onNearEnd}
        onEnded={onEnded}
      />
    );
  }

  if (!uri) {
    return <View style={[styles.root, { width, height, backgroundColor: INTRO_HANDOFF.spaceBg }]} />;
  }

  return createElement('video', {
    src: uri,
    autoPlay: true,
    muted: true,
    playsInline: true,
    controls: false,
    style: {
      width,
      height,
      objectFit: 'cover',
      backgroundColor: INTRO_HANDOFF.spaceBg,
      display: 'block',
    },
    onTimeUpdate: (e: { currentTarget: HTMLVideoElement }) => {
      const t = e.currentTarget.currentTime;
      if (!nearFired.current && t >= INTRO_HANDOFF.crossfadeStartSec) {
        nearFired.current = true;
        onNearEnd();
      }
    },
    onEnded: () => {
      if (endedFired.current) return;
      endedFired.current = true;
      if (!nearFired.current) {
        nearFired.current = true;
        onNearEnd();
      }
      onEnded();
    },
    onError: () => setFailed(true),
  });
}

function NativeIntroVideo({
  source,
  width,
  height,
  onNearEnd,
  onEnded,
}: {
  source: number;
  width: number;
  height: number;
  onNearEnd: () => void;
  onEnded: () => void;
}) {
  const nearFired = useRef(false);
  const endedFired = useRef(false);

  const player = useVideoPlayer(source, (p) => {
    p.loop = false;
    p.muted = true;
    p.timeUpdateEventInterval = 0.1;
    p.play();
  });

  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    if (!nearFired.current && currentTime >= INTRO_HANDOFF.crossfadeStartSec) {
      nearFired.current = true;
      onNearEnd();
    }
  });

  useEventListener(player, 'playToEnd', () => {
    if (endedFired.current) return;
    endedFired.current = true;
    if (!nearFired.current) {
      nearFired.current = true;
      onNearEnd();
    }
    onEnded();
  });

  useEffect(() => {
    const failSafe = setTimeout(() => {
      if (endedFired.current) return;
      endedFired.current = true;
      if (!nearFired.current) {
        nearFired.current = true;
        onNearEnd();
      }
      onEnded();
    }, (INTRO_HANDOFF.durationSec + 1.5) * 1000);
    return () => clearTimeout(failSafe);
  }, [onNearEnd, onEnded]);

  return (
    <View style={[styles.root, { width, height, backgroundColor: INTRO_HANDOFF.spaceBg }]}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
        allowsPictureInPicture={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { overflow: 'hidden' },
});
