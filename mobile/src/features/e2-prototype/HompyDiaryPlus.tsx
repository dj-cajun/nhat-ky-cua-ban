import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SceneArt, type SceneVariant } from '@/features/e2-prototype/SceneArt';
import { EnterFade } from '@/features/space-ui/EnterFade';
import { hompy } from '@/constants/hompy-theme';

type Props = {
  backLabel: string;
  onBack: () => void;
  ownerName: string;
  mood: string;
  sentence: string;
  music: string;
  photoLabel: string;
  sceneVariant: SceneVariant;
  isMine?: boolean;
  onPressScene?: () => void;
  writeHint?: string;
  showTomato?: boolean;
  onTomato?: () => void;
  focusHint?: string | null;
  footer?: ReactNode;
};

/**
 * Prototype mirror of product diary: pastel mini-hompy base + scene strip.
 */
export function HompyDiaryPlus({
  backLabel,
  onBack,
  ownerName,
  mood,
  sentence,
  music,
  photoLabel,
  sceneVariant,
  isMine,
  onPressScene,
  writeHint,
  showTomato,
  onTomato,
  focusHint,
  footer,
}: Props) {
  return (
    <View style={styles.shell}>
      <View style={styles.canvas}>
        <Pressable onPress={onBack} accessibilityRole="button" style={styles.backRow} hitSlop={8}>
          <Text style={styles.backText}>← {backLabel}</Text>
        </Pressable>

        <EnterFade translateY={10}>
          <Pressable
            onPress={onPressScene}
            disabled={!onPressScene}
            accessibilityRole={onPressScene ? 'button' : 'summary'}
            style={styles.sceneCard}
          >
            <View style={styles.sceneArt}>
              <SceneArt variant={sceneVariant} />
              <View style={styles.sceneScrim} />
              <Text style={styles.sceneLabel}>{photoLabel}</Text>
            </View>
            <Text style={styles.sceneSentence}>{sentence}</Text>
          </Pressable>
        </EnterFade>

        <EnterFade delayMs={80}>
          <View style={styles.profileBox}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{ownerName.slice(0, 1)}</Text>
            </View>
            <View style={styles.profileMeta}>
              <Text style={styles.name}>{ownerName}</Text>
              <Text style={styles.mood}>{mood}</Text>
            </View>
            {isMine ? (
              <Pressable style={styles.editBtn} onPress={onPressScene}>
                <Text style={styles.editBtnText}>edit today</Text>
              </Pressable>
            ) : null}
          </View>
          <View style={styles.todayBox}>
            <Text style={styles.todayLabel}>Today I…</Text>
            <Text style={styles.todayText}>{sentence}</Text>
          </View>
        </EnterFade>

        <EnterFade delayMs={140} style={styles.grid2}>
          <View style={[styles.panel, styles.mint]}>
            <Text style={styles.panelTitle}>week</Text>
            <Text style={styles.panelBody}>S · M · T · W · T · F · S</Text>
            <Text style={styles.panelHint}>mini calendar</Text>
          </View>
          <View style={[styles.panel, styles.peach]}>
            <Text style={styles.panelTitle}>mini album</Text>
            <View style={styles.albumFrame} />
            <Text style={styles.panelHint}>today’s frame</Text>
          </View>
        </EnterFade>

        <EnterFade delayMs={200}>
          <View style={styles.boardBox}>
            <Text style={styles.boardTitle}>boards</Text>
            <Text style={styles.boardLine}>guestbook · free board · circle</Text>
            <Pressable style={styles.music} accessibilityRole="button">
              <Text style={styles.musicText}>♪ {music}</Text>
            </Pressable>
            {showTomato ? (
              <Pressable style={styles.tomato} onPress={onTomato} accessibilityRole="button">
                <Text style={styles.tomatoText}>focus room</Text>
              </Pressable>
            ) : null}
            {focusHint ? <Text style={styles.focusHint}>{focusHint}</Text> : null}
          </View>
        </EnterFade>

        {writeHint ? <Text style={styles.writeHint}>{writeHint}</Text> : null}
        {footer}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: hompy.table,
    padding: 8,
  },
  canvas: {
    flex: 1,
    borderWidth: 2,
    borderColor: hompy.pencilBold,
    backgroundColor: hompy.canvas,
    borderRadius: 4,
    padding: 8,
    gap: 8,
  },
  backRow: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 4 },
  backText: { fontSize: 12, fontWeight: '700', color: hompy.ink },
  sceneCard: {
    borderWidth: 1.5,
    borderColor: '#6A4050',
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#3A2430',
  },
  sceneArt: {
    width: '100%',
    aspectRatio: 1.55,
    justifyContent: 'flex-end',
    padding: 12,
  },
  sceneScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '42%',
    backgroundColor: 'rgba(10,8,12,0.38)',
  },
  sceneLabel: {
    zIndex: 2,
    color: '#F8EDE8',
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  sceneSentence: {
    padding: 12,
    color: '#F4EFE6',
    fontStyle: 'italic',
    fontSize: 14,
    lineHeight: 20,
    backgroundColor: 'rgba(20,16,18,0.55)',
  },
  profileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    backgroundColor: hompy.blush,
    borderWidth: 1.5,
    borderColor: hompy.blushInk,
    borderRadius: 4,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 4,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: hompy.blushInk,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: hompy.ink },
  profileMeta: { flex: 1, minWidth: 0 },
  name: { fontSize: 15, fontWeight: '700', color: hompy.ink },
  mood: { marginTop: 2, fontSize: 11, color: hompy.muted },
  editBtn: {
    borderWidth: 1.5,
    borderColor: hompy.hard,
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 4,
    minHeight: 34,
    justifyContent: 'center',
  },
  editBtnText: { fontSize: 10, fontWeight: '700', color: hompy.ink },
  todayBox: {
    marginTop: 8,
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1.5,
    borderColor: hompy.blushInk,
    borderRadius: 4,
  },
  todayLabel: { fontSize: 10, fontWeight: '700', color: hompy.muted, marginBottom: 4 },
  todayText: { fontSize: 13, color: hompy.ink, lineHeight: 18 },
  grid2: { flexDirection: 'row', gap: 8 },
  panel: {
    flex: 1,
    minHeight: 120,
    borderWidth: 1.5,
    borderRadius: 4,
    padding: 8,
  },
  mint: { backgroundColor: hompy.mint, borderColor: hompy.mintInk },
  peach: { backgroundColor: hompy.peach, borderColor: hompy.peachInk },
  panelTitle: { fontSize: 10, fontWeight: '700', color: hompy.muted, marginBottom: 6 },
  panelBody: { fontSize: 11, color: hompy.ink },
  panelHint: { marginTop: 8, fontSize: 10, color: hompy.muted },
  albumFrame: {
    width: 56,
    height: 56,
    borderWidth: 1.5,
    borderColor: hompy.peachInk,
    borderRadius: 4,
    backgroundColor: '#fff',
    alignSelf: 'center',
    marginTop: 8,
  },
  boardBox: {
    padding: 10,
    backgroundColor: hompy.lavender,
    borderWidth: 1.5,
    borderColor: hompy.lavenderInk,
    borderRadius: 4,
    gap: 8,
  },
  boardTitle: { fontSize: 10, fontWeight: '700', color: hompy.muted },
  boardLine: { fontSize: 12, color: hompy.ink },
  music: {
    borderWidth: 1.5,
    borderColor: hompy.hard,
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 4,
    minHeight: 40,
    justifyContent: 'center',
  },
  musicText: { fontSize: 12, fontWeight: '600', color: hompy.ink },
  tomato: {
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderColor: '#D46A5C',
    backgroundColor: 'rgba(212,106,92,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    minHeight: 36,
    justifyContent: 'center',
  },
  tomatoText: { fontSize: 11, fontWeight: '700', color: hompy.ink },
  focusHint: { fontSize: 11, color: '#8A4A40' },
  writeHint: { marginTop: 4, fontSize: 12, color: hompy.muted },
});
