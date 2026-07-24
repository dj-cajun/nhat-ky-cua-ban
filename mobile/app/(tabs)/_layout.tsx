import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { colors } from '@/constants/theme';
import { useMessages } from '@/i18n';
function TabLabel({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 11, color: focused ? colors.ink : colors.soft, fontWeight: focused ? '700' : '500' }}>
      {label}
    </Text>
  );
}

export default function TabsLayout() {
  const t = useMessages();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.line,
        },
        tabBarActiveTintColor: colors.ink,
      }}
    >
      <Tabs.Screen
        name="universe"
        options={{
          title: t.tabs.universe,
          tabBarLabel: ({ focused }) => <TabLabel label={t.tabs.universe} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: t.tabs.notifications,
          tabBarLabel: ({ focused }) => (
            <TabLabel label={t.tabs.notifications} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="my-diary"
        options={{
          title: t.tabs.diary,
          tabBarLabel: ({ focused }) => <TabLabel label={t.tabs.diary} focused={focused} />,
        }}
      />
    </Tabs>
  );
}
