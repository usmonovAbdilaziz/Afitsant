// storage/userStorage.ts
import * as SecureStore from 'expo-secure-store';

const USER_KEY = 'user_info';

// User info saqlash
export const saveUserInfo = async (user: unknown) => {
  try {
    const serializedUser = JSON.stringify(user);

    if (!serializedUser) {
      throw new Error('Invalid user info value');
    }

    await SecureStore.setItemAsync(USER_KEY, serializedUser);
    console.log('User info saved');
  } catch (error) {
    console.error('Error saving user info:', error);
    throw error;
  }
};

// User info olish
export const getUserInfo = async (): Promise<object | null> => {
  try {
    const json = await SecureStore.getItemAsync(USER_KEY);
    return json ? JSON.parse(json) : null;
  } catch (error) {
    console.error('Error getting user info:', error);
    return null;
  }
};

// User info o'chirish (logout)
export const removeUserInfo = async () => {
  try {
    await SecureStore.deleteItemAsync(USER_KEY);
    console.log('User info removed');
  } catch (error) {
    console.error('Error removing user info:', error);
    throw error;
  }
};
