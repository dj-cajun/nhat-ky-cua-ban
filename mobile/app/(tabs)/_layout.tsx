import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { colors } from '@/constants/theme';

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
          title: '내 우주',
          tabBarLabel: ({ focused }) => <TabLabel label="내 우주" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: '알림',
          tabBarLabel: ({ focused }) => <TabLabel label="알림" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="my-diary"
        options={{
          title: '다이어리',
          tabBarLabel: ({ focused }) => <TabLabel label="다이어리" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
