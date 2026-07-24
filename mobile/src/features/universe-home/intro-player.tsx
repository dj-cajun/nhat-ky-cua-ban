import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { INTRO_HANDOFF } from './handoff';
import { getIntroVideoSource } from './intro-asset';
import { SyntheticSunBirth } from './synthetic-sun-birth';

/**
 * Full/short intro layer: bundled MP4 when present, else synthetic sun birth.
 * Calls onNearEnd at crossfadeStart (or short midpoint), onEnded when finished.
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
  const source = mode === 'full' ? getIntroVideoSource() : null;

  if (source == null) {
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

  return (
    <BundledIntroVideo
      source={source}
      width={width}
      height={height}
      onNearEnd={onNearEnd}
      onEnded={onEnded}
    />
  );
}

function BundledIntroVideo({
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
