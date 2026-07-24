import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/theme';
import { useMessages } from '@/i18n';
type Props = {
  onReport: () => void;
  onHide: () => void;
  onBlockSender: () => void;
  onReply?: () => void;
};

export function PrivateMessageMenu({ onReport, onHide, onBlockSender, onReply }: Props) {
  const t = useMessages();
  return (
    <View style={styles.wrap}>
      {onReply ? (
        <Pressable onPress={onReply}>
          <Text style={styles.item}>{t.messages.reply}</Text>
        </Pressable>
      ) : null}
      <Pressable onPress={onReport}>
        <Text style={styles.item}>{t.messages.report}</Text>
      </Pressable>
      <Pressable onPress={onHide}>
        <Text style={styles.item}>{t.messages.hide}</Text>
      </Pressable>
      <Pressable onPress={onBlockSender}>
        <Text style={styles.itemWarn}>{t.messages.blockSender}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 10, gap: 8 },
  item: { color: colors.muted, fontSize: 13 },
  itemWarn: { color: colors.warn, fontSize: 13 },
});
