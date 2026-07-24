import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/theme';
import { en } from '@/i18n/en';

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
  return (
    <View style={styles.wrap}>
      {isMine ? (
        <>
          <Pressable onPress={onDelete}>
            <Text style={styles.item}>{en.aliasBoard.delete}</Text>
          </Pressable>
          <Pressable onPress={onReport}>
            <Text style={styles.item}>{en.aliasBoard.report}</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Pressable onPress={onReport}>
            <Text style={styles.item}>{en.aliasBoard.report}</Text>
          </Pressable>
          <Pressable onPress={onHide}>
            <Text style={styles.item}>{en.aliasBoard.hide}</Text>
          </Pressable>
          <Pressable onPress={onBlockAuthor}>
            <Text style={styles.itemWarn}>{en.aliasBoard.blockAuthor}</Text>
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
