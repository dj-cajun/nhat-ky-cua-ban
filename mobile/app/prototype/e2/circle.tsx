import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProtoChrome } from '@/features/e2-prototype/ProtoChrome';
import { Starfield } from '@/features/e2-prototype/Starfield';
import { e2Fixtures } from '@/features/e2-prototype/fixtures';
import { e2 } from '@/features/e2-prototype/tokens';

/**
 * E2 Circle — spatial continuity from universe; friends as members, not chat rows.
 */
export default function E2CirclePrototype() {
  const { width, height } = useWindowDimensions();
  const stageH = Math.max(height * 0.48, 300);
  const circle = e2Fixtures.circles.find((c) => c.id === e2Fixtures.activeCircleId)!;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.bg}>
        <Starfield opacity={0.55} />
        <View style={styles.wash} />
        <ProtoChrome step="circle" tint={e2.circle.muted} />

        <View style={styles.header}>
          <Pressable
            onPress={() => router.push('/prototype/e2')}
            accessibilityRole="button"
            accessibilityLabel="Back to universe"
            hitSlop={10}
          >
            <Text style={styles.back}>← universe</Text>
          </Pressable>
          <Text style={styles.symbol}>{circle.symbol}</Text>
          <Text style={styles.name} accessibilityRole="header">
            {circle.name}
          </Text>
          <Text style={styles.blurb}>{circle.blurb}</Text>
        </View>

        <View style={[styles.stage, { height: stageH }]} pointerEvents="box-none">
          <View style={styles.centerRing} pointerEvents="none" />
          <Pressable
            onPress={() => router.push('/prototype/e2/my-diary')}
            accessibilityRole="button"
            accessibilityLabel="Open my diary"
            style={[
              styles.self,
              {
                left: (width - 100) * 0.5 - 28,
                top: (stageH - 90) * 0.48 - 10,
              },
            ]}
          >
            <View style={styles.selfOrb} />
            <Text style={styles.selfName}>you</Text>
          </Pressable>
          {e2Fixtures.friends.map((f) => (
            <Pressable
              key={f.id}
              onPress={() => router.push('/prototype/e2/friend-diary')}
              accessibilityRole="button"
              accessibilityLabel={`Visit ${f.displayName}'s diary`}
              style={[
                styles.friend,
                {
                  left: f.x * (width - 100),
                  top: f.y * (stageH - 90),
                },
              ]}
            >
              <View
                style={[
                  styles.friendOrb,
                  { backgroundColor: e2.circle[f.colorKey] },
                ]}
              />
              <Text style={styles.friendName}>{f.displayName}</Text>
              <Text style={styles.friendVibe}>{f.vibe}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.objects}>
          <View style={styles.object} accessibilityLabel={`Notice: ${e2Fixtures.noticeTeaser}`}>
            <Text style={styles.objectLabel}>notice</Text>
            <Text style={styles.objectValue}>{e2Fixtures.noticeTeaser}</Text>
          </View>
          <View style={styles.object} accessibilityLabel={`Board: ${e2Fixtures.boardTeaser}`}>
            <Text style={styles.objectLabel}>board</Text>
            <Text style={styles.objectValue}>{e2Fixtures.boardTeaser}</Text>
          </View>
        </View>

        <Pressable
          style={styles.cta}
          onPress={() => router.push('/prototype/e2/friend-diary')}
          accessibilityRole="button"
          accessibilityLabel="Open Minseo diary"
        >
          <Text style={styles.ctaText}>step into a friend’s today →</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: e2.circle.washEdge },
  bg: { flex: 1, backgroundColor: e2.circle.washEdge },
  wash: {
    ...StyleSheet.absoluteFill,
    backgroundColor: e2.circle.wash,
    opacity: 0.92,
  },
  header: {
    paddingHorizontal: e2.spacePad,
    marginTop: 12,
  },
  back: {
    fontFamily: e2.type.body,
    fontSize: 13,
    color: e2.circle.muted,
    marginBottom: 14,
  },
  symbol: {
    fontSize: 28,
    color: e2.circle.accent,
  },
  name: {
    marginTop: 4,
    fontFamily: e2.type.display,
    fontSize: 30,
    color: e2.circle.ink,
  },
  blurb: {
    marginTop: 6,
    fontFamily: e2.type.body,
    fontSize: 14,
    color: e2.circle.muted,
  },
  stage: {
    marginTop: 10,
    marginHorizontal: e2.spacePad,
    position: 'relative',
  },
  centerRing: {
    position: 'absolute',
    alignSelf: 'center',
    top: '28%',
    left: '18%',
    width: '64%',
    height: '52%',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: e2.circle.accentSoft,
  },
  self: {
    position: 'absolute',
    width: 72,
    alignItems: 'center',
    zIndex: 3,
  },
  selfOrb: {
    width: 48,
    height: 48,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(255,230,168,0.65)',
    backgroundColor: 'rgba(240,195,106,0.9)',
  },
  selfName: {
    marginTop: 6,
    fontFamily: e2.type.bodySemi,
    fontSize: 12,
    color: e2.circle.ink,
  },
  friend: {
    position: 'absolute',
    width: 90,
    alignItems: 'center',
    zIndex: 2,
  },
  friendOrb: {
    width: e2.orbFriend,
    height: e2.orbFriend,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  friendName: {
    marginTop: 8,
    fontFamily: e2.type.bodySemi,
    fontSize: 13,
    color: e2.circle.ink,
  },
  friendVibe: {
    marginTop: 2,
    fontFamily: e2.type.body,
    fontSize: 11,
    color: e2.circle.muted,
  },
  objects: {
    marginTop: 'auto',
    paddingHorizontal: e2.spacePad,
    flexDirection: 'row',
    gap: 10,
  },
  object: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: e2.circle.objectBorder,
    backgroundColor: e2.circle.object,
    paddingVertical: 12,
    paddingHorizontal: 12,
    minHeight: 56,
  },
  objectLabel: {
    fontFamily: e2.type.body,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: e2.circle.muted,
  },
  objectValue: {
    marginTop: 4,
    fontFamily: e2.type.bodyMed,
    fontSize: 13,
    color: e2.circle.ink,
  },
  cta: {
    marginTop: 14,
    marginBottom: 24,
    alignSelf: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  ctaText: {
    fontFamily: e2.type.bodyMed,
    fontSize: 14,
    color: e2.circle.ink,
  },
});
