import { useCallback, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Me } from '@/api/authApi';
import { getToken, removeToken } from '@/components/storage/token';
import { saveUserInfo, removeUserInfo } from '@/components/storage/userInfo';
import { useRouter } from 'expo-router';

export const useAuthMe = () => {
  const router = useRouter();

  const { data: user, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) {
        throw new Error('No token found');
      }

      const response = await Me();
      
      // Save user to storage whenever fetched successfully
      if (response && response.user) {
        await saveUserInfo(response.user);
        return response.user;
      }
      
      throw new Error('User data not found');
    },
    // Don't auto-retry on failure to avoid multiple unauthorized requests
    retry: false,
    staleTime: 1000 * 60 * 5, // Cache user data for 5 minutes
  });

  // Handle unauthorized or API errors by logging out and redirecting
  useEffect(() => {
    if (error) {
       const clearAuthAndRedirect = async () => {
         await removeToken();
         await removeUserInfo();
         router.replace('/auth/sign-in/login');
       };
       clearAuthAndRedirect();
    }
  }, [error, router]);

  // Re-check authentication when screen is focused (upon page visit)
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const verifyAuthOnFocus = async () => {
        const token = await getToken();
        if (isActive) {
          if (!token) {
            await removeToken();
            await removeUserInfo();
            router.replace('/auth/sign-in/login');
          } else {
            // Trigger refetching or rely on cache if within staleTime
            refetch();
          }
        }
      };

      verifyAuthOnFocus();

      return () => {
        isActive = false;
      };
    }, [refetch, router])
  );

  return {
    user,
    isLoading: isLoading || isFetching,
    error,
    refetch,
    isAuthenticated: !!user && !error,
  };
};
