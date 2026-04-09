import { Pressable, Text, View } from 'react-native';
import './global.css';
import { ThemeProvider } from '@/providers/theme-provider';
import { Link } from 'expo-router';

export default function App() {
  return (
    <ThemeProvider>
      <View className="flex-1 items-center justify-center bg-white dark:bg-black px-4">
        <Text className="text-2xl font-bold text-black dark:text-white">
          Home page
        </Text>

        <Link href="/login" asChild>
          <Pressable className="mt-4 rounded-xl bg-blue-500 px-4 py-3">
            <Text className="text-white font-semibold">Login ga o‘tish</Text>
          </Pressable>
        </Link>
      </View>
    </ThemeProvider>
  );
}
