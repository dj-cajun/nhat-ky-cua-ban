import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';
import { en } from '@/i18n/en';

export default function CircleMembersScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>{en.circle.members}</Text>
      <Text style={styles.sub}>{en.circle.membersSub}</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  title: { fontSize: 20, fontWeight: '600', color: colors.ink },
  sub: { marginTop: 8, color: colors.muted },
});
