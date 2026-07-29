import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/theme';
import { useMessages } from '@/i18n';
type Props = {
  isMine: boolean;
  onDelete?: () => void;
  onReport: () => void;
  onHide: () => void;
  onBlockAuthor: () => void;
};

export function AnonymousPostMenu({
  isMine,
  onDelete,
  onReport,
  onHide,
  onBlockAuthor,
}: Props) {
  const t = useMessages();
  return (
    <View style={styles.wrap}>
      {isMine ? (
        <>
          <Pressable onPress={onDelete}>
            <Text style={styles.item}>{t.aliasBoard.delete}</Text>
          </Pressable>
          <Pressable onPress={onReport}>
            <Text style={styles.item}>{t.aliasBoard.report}</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Pressable onPress={onReport}>
            <Text style={styles.item}>{t.aliasBoard.report}</Text>
          </Pressable>
          <Pressable onPress={onHide}>
            <Text style={styles.item}>{t.aliasBoard.hide}</Text>
          </Pressable>
          <Pressable onPress={onBlockAuthor}>
            <Text style={styles.itemWarn}>{t.aliasBoard.blockAuthor}</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 8, gap: 6 },
  item: { color: colors.muted, fontSize: 12 },
  itemWarn: { color: colors.warn, fontSize: 12 },
});
