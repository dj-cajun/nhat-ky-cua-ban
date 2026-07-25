import { Pressable, StyleSheet, Text, View } from 'react-native';
import { hompy } from '@/constants/hompy-theme';

const PREVIEW_SLOTS = 3;

export type HompyBoardPreviewLine = {
  id: string;
  authorLabel: string;
  body: string;
};

export type HompyBoardSection = {
  key: string;
  title: string;
  titleTone: 'circle' | 'guestbook' | 'free';
  lines: HompyBoardPreviewLine[];
  empty: string;
  visible: boolean;
  onOpen: () => void;
};

type Props = {
  sections: HompyBoardSection[];
  locale: string;
};

function truncateLine(text: string, maxLen = 42): string {
  const line = text.replace(/\s+/g, ' ').trim();
  if (line.length <= maxLen) return line;
  return `${line.slice(0, maxLen)}…`;
}

function buildSlots(lines: HompyBoardPreviewLine[]): (HompyBoardPreviewLine | null)[] {
  return Array.from({ length: PREVIEW_SLOTS }, (_, i) => lines[i] ?? null);
}

/**
 * School / Cyworld-style stacked board previews (title + 3 rows each).
 */
export function HompyBoardStack({ sections, locale }: Props) {
  const visible = sections.filter((s) => s.visible);
  if (visible.length === 0) {
    return (
      <Text style={styles.fallbackEmpty}>
        {locale === 'ko' ? '아직 볼 수 있는 게시판이 없어요.' : 'No boards to show yet.'}
      </Text>
    );
  }

  return (
    <View style={styles.stack}>
      {visible.map((section, index) => {
        const slots = buildSlots(section.lines);
        return (
          <View
            key={section.key}
            style={[styles.section, index > 0 ? styles.sectionDivider : null]}
          >
            <Pressable
              onPress={section.onOpen}
              accessibilityRole="button"
              style={[styles.titleRow, titleToneStyle(section.titleTone)]}
            >
              <Text style={styles.titleText} numberOfLines={1}>
                {section.title}
              </Text>
              <Text style={styles.cue} accessibilityElementsHidden>
                ›
              </Text>
            </Pressable>
            {slots.map((line, slotIndex) => {
              if (!line) {
                return (
                  <View key={`${section.key}-empty-${slotIndex}`} style={styles.postRow}>
                    {section.lines.length === 0 && slotIndex === 0 ? (
                      <Text style={styles.emptyHint} numberOfLines={1}>
                        {section.empty}
                      </Text>
                    ) : null}
                  </View>
                );
              }
              return (
                <Pressable
                  key={line.id}
                  onPress={section.onOpen}
                  accessibilityRole="button"
                  style={styles.postRow}
                >
                  <Text style={styles.author} numberOfLines={1}>
                    {line.authorLabel}
                  </Text>
                  <Text style={styles.body} numberOfLines={1}>
                    {truncateLine(line.body)}
                  </Text>
                  <Text style={styles.paw} accessibilityElementsHidden>
                    ·
                  </Text>
                </Pressable>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

function titleToneStyle(tone: HompyBoardSection['titleTone']) {
  switch (tone) {
    case 'circle':
      return styles.titleCircle;
    case 'guestbook':
      return styles.titleGuestbook;
    case 'free':
      return styles.titleFree;
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  stack: {
    gap: 0,
  },
  section: {
    paddingBottom: 2,
  },
  sectionDivider: {
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(74,63,85,0.22)',
    borderStyle: 'dotted',
    paddingTop: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 28,
    paddingHorizontal: 8,
    gap: 4,
    borderRadius: 6,
  },
  titleCircle: {
    backgroundColor: 'rgba(229,248,232,0.65)',
  },
  titleGuestbook: {
    backgroundColor: 'rgba(255,243,224,0.7)',
  },
  titleFree: {
    backgroundColor: 'rgba(255,232,240,0.65)',
  },
  titleText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: hompy.ink,
  },
  cue: {
    fontSize: 12,
    color: hompy.soft,
    opacity: 0.55,
  },
  postRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 22,
    paddingHorizontal: 8,
    gap: 6,
  },
  author: {
    maxWidth: 72,
    fontSize: 10,
    fontWeight: '700',
    color: hompy.soft,
  },
  body: {
    flex: 1,
    fontSize: 11,
    color: hompy.ink,
  },
  paw: {
    fontSize: 10,
    color: hompy.soft,
    opacity: 0.4,
  },
  emptyHint: {
    fontSize: 10,
    color: hompy.soft,
  },
  fallbackEmpty: {
    fontSize: 10,
    color: hompy.soft,
    paddingHorizontal: 4,
  },
});
