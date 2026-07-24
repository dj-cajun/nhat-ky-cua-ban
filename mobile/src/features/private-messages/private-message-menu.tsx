import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/theme';
import { en } from '@/i18n/en';

type Props = {
  onReport: () => void;
  onHide: () => void;
  onBlockSender: () => void;
  onReply?: () => void;
};

export function PrivateMessageMenu({ onReport, onHide, onBlockSender, onReply }: Props) {
  return (
    <View style={styles.wrap}>
      {onReply ? (
        <Pressable onPress={onReply}>
          <Text style={styles.item}>{en.messages.reply}</Text>
        </Pressable>
      ) : null}
      <Pressable onPress={onReport}>
        <Text style={styles.item}>{en.messages.report}</Text>
      </Pressable>
      <Pressable onPress={onHide}>
        <Text style={styles.item}>{en.messages.hide}</Text>
      </Pressable>
      <Pressable onPress={onBlockSender}>
        <Text style={styles.itemWarn}>{en.messages.blockSender}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 10, gap: 8 },
  item: { color: colors.muted, fontSize: 13 },
  itemWarn: { color: colors.warn, fontSize: 13 },
});
