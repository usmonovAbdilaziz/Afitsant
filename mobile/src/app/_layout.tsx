import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QrProvider } from '@/providers/qr-camera';

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <QrProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(tab)" />
            <Stack.Screen 
              name="auth/sign-in/login" 
              options={{ 
                presentation: 'transparentModal',
                animation: 'slide_from_bottom' 
              }} 
            />
          </Stack>
        </QrProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
