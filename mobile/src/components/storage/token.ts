// storage/tokenStorage.ts
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = "auth_token";

// Token olish
export const getToken = async (): Promise<string | null> => {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    return token ?? null;
  } catch (error) {
    console.error("Token get error:", error);
    return null;
  }
};

// Token saqlash
export const saveToken = async (token: string) => {
  try {
    if (!token || typeof token !== "string") {
      throw new Error("Invalid token value");
    }
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    console.log("Token saved");
  } catch (error) {
    console.error("Token save error:", error);
    throw error;
  }
};

// Token o'chirish
export const removeToken = async () => {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    console.log("Token removed");
  } catch (error) {
    console.error("Token remove error:", error);
    throw error;
  }
};
