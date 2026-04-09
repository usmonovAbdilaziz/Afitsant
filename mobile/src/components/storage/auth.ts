import { removeToken, saveToken } from "@/components/storage/token";
import { removeUserInfo, saveUserInfo } from "@/components/storage/userInfo";

export const clearAuthStorage = async () => {
  await removeToken();
  await removeUserInfo();
};

export const replaceAuthStorage = async (token: unknown, user: unknown) => {
  if (!token || typeof token !== "string") {
    throw new Error("Login response did not include a valid token");
  }

  if (!user || typeof user !== "object" || Array.isArray(user)) {
    throw new Error("Login response did not include valid user info");
  }

  await clearAuthStorage();
  await saveToken(token);
  await saveUserInfo(user);
};
