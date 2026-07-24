import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { colors } from '@/constants/theme';
import { en } from '@/i18n/en';

function TabLabel({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 11, color: focused ? colors.ink : colors.soft, fontWeight: focused ? '700' : '500' }}>
      {label}
    </Text>
  );
}

export default function TabsLayout() {
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
          title: en.tabs.universe,
          tabBarLabel: ({ focused }) => <TabLabel label={en.tabs.universe} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: en.tabs.notifications,
          tabBarLabel: ({ focused }) => (
            <TabLabel label={en.tabs.notifications} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="my-diary"
        options={{
          title: en.tabs.diary,
          tabBarLabel: ({ focused }) => <TabLabel label={en.tabs.diary} focused={focused} />,
        }}
      />
    </Tabs>
  );
}
