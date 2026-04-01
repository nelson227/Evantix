import { Tabs, Redirect } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { ActivityIndicator, View } from 'react-native';
import { Colors } from '@/lib/colors';
import { Home, PenSquare, Target, BarChart3, MessageCircle } from 'lucide-react-native';

export default function TabsLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.primary[600]} />
      </View>
    );
  }

  if (!user) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary[600],
        tabBarInactiveTintColor: Colors.gray[400],
        tabBarStyle: {
          borderTopColor: Colors.gray[200],
          backgroundColor: Colors.white,
          height: 56,
          paddingBottom: 6,
        },
        headerStyle: { backgroundColor: Colors.white },
        headerTitleStyle: { fontWeight: '600', color: Colors.gray[900] },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Fil',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="new-publication"
        options={{
          title: 'Publier',
          tabBarIcon: ({ color, size }) => <PenSquare size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="goals"
        options={{
          title: 'Objectifs',
          tabBarIcon: ({ color, size }) => <Target size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Tableau',
          tabBarIcon: ({ color, size }) => <BarChart3 size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, size }) => <MessageCircle size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
