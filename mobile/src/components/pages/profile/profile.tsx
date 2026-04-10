import { Button } from '@/components/ui/button';
import { useRouter } from 'expo-router';
import { Text, View, ActivityIndicator } from 'react-native';
import { useAuthMe } from '@/auth';

export default function GlobalProfilePage() {
  const { user, isLoading } = useAuthMe();
  const router = useRouter();

  return (
    <View className="flex-1 bg-slate-50 px-6 pt-20 items-center justify-center gap-4">
      {isLoading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <>
          <Text className="mt-4 text-xl font-semibold text-slate-500">
            {user ? `Xush kelibsiz, ${user.fullName || 'Foydalanuvchi'}!` : "Xali login qilmagansiz"}
          </Text>
          {/* {!user && (
            <Button size='lg' onPress={() => router.push('/auth/sign-in/login')}>
              Login
            </Button>
          )} */}
        </>
      )}
    </View>
  );
}