import { Tabs } from 'expo-router';

export default function RootLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: { backgroundColor: '#1a1a1a', borderTopColor: '#2a2a2a' },
      tabBarActiveTintColor: '#3a5fcd',
      tabBarInactiveTintColor: '#888',
    }}>
      <Tabs.Screen name="index" options={{ title: '🗳️ Polls' }} />
      <Tabs.Screen name="sports" options={{ title: '🏅 Sports' }} />
    </Tabs>
  );
}