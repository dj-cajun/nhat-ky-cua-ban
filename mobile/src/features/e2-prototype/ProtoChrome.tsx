import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { e2 } from './tokens';

type Step = 'universe' | 'circle' | 'friend' | 'mine';

const STEPS: { id: Step; href: string; label: string }[] = [
  { id: 'universe', href: '/prototype/e2', label: 'Universe' },
  { id: 'circle', href: '/prototype/e2/circle', label: 'Circle' },
  { id: 'friend', href: '/prototype/e2/friend-diary', label: 'Friend' },
  { id: 'mine', href: '/prototype/e2/my-diary', label: 'Mine' },
];

/** Minimal prototype rail — review navigation, not product chrome. */
export function ProtoChrome({
  step,
  tint = e2.brand.whisper,
}: {
  step: Step;
  tint?: string;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { paddingTop: Math.max(insets.top, 10) }]}>
      <View style={styles.row}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Leave E2 prototype"
          hitSlop={12}
        >
          <Text style={[styles.exit, { color: tint }]}>Exit prototype</Text>
        </Pressable>
        <Text style={[styles.badge, { color: tint }]}>E2 static</Text>
      </View>
      <View style={styles.steps} accessibilityRole="tablist">
        {STEPS.map((s) => {
          const on = s.id === step;
          return (
            <Pressable
              key={s.id}
              onPress={() => router.push(s.href as never)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${s.label} screen`}
              style={[styles.step, on && styles.stepOn]}
            >
              <Text style={[styles.stepText, { color: tint }, on && styles.stepTextOn]}>
                {s.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: e2.spacePad,
    zIndex: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 36,
  },
  exit: {
    fontFamily: e2.type.bodyMed,
    fontSize: 13,
  },
  badge: {
    fontFamily: e2.type.body,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    opacity: 0.8,
  },
  steps: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 6,
  },
  step: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(244,239,230,0.18)',
    minHeight: 32,
    justifyContent: 'center',
  },
  stepOn: {
    borderColor: 'rgba(244,239,230,0.55)',
    backgroundColor: 'rgba(244,239,230,0.1)',
  },
  stepText: {
    fontFamily: e2.type.body,
    fontSize: 12,
    opacity: 0.7,
  },
  stepTextOn: {
    fontFamily: e2.type.bodySemi,
    opacity: 1,
  },
});
