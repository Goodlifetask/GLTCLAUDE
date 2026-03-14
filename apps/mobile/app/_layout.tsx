import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { setupNotifications } from '../services/notifications/setup';
import { setupGeofencing } from '../services/location/geofencing';
import { AuthGate } from '../components/AuthGate';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:   60 * 1000,
      retry:       1,
      gcTime:      10 * 60 * 1000,
    },
    mutations: {
      retry: 0,
    },
  },
});

export default function RootLayout() {
  const [fontsLoaded] = Font.useFonts({
    'Outfit-Bold':    require('../assets/fonts/Outfit-Bold.ttf'),
    'Outfit-Black':   require('../assets/fonts/Outfit-Black.ttf'),
    'DMSans-Regular': require('../assets/fonts/DMSans-Regular.ttf'),
    'DMSans-Medium':  require('../assets/fonts/DMSans-Medium.ttf'),
    'DMSans-SemiBold':require('../assets/fonts/DMSans-SemiBold.ttf'),
    'DMSans-Bold':    require('../assets/fonts/DMSans-Bold.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
      setupNotifications();
      setupGeofencing();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthGate>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)"  options={{ animation: 'fade' }} />
              <Stack.Screen name="(tabs)"  options={{ animation: 'none' }} />
              <Stack.Screen
                name="reminder/[id]"
                options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
              />
              <Stack.Screen
                name="reminder/new"
                options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
              />
            </Stack>
          </AuthGate>
          <StatusBar style="auto" />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
