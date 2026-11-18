import { authApi, onUnauthorized, type User } from "../api/api";
import { clearPageCache, flushAll, openPage } from "../editor/editor";
import { createStore } from "../store/store";

export const userStore = createStore<User | null | undefined>(undefined);

onUnauthorized(() => {
  clearPageCache();
  userStore.set(null);
});

export async function loadUser() {
  try {
    userStore.set((await authApi.me()).user);
  } catch {
    userStore.set(null);
  }
}

export async function loginUser(email: string, password: string) {
  const { user } = await authApi.login(email, password);
  userStore.set(user);
}

export async function requestSignupOtp(email: string, password: string) {
  return authApi.signup(email, password);
}

export async function verifySignupOtp(email: string, code: string) {
  const { user } = await authApi.verifySignup(email, code);
  userStore.set(user);
}

export async function signOut() {
  await flushAll();
  await openPage(null);
  clearPageCache();
  await authApi.logout();
  userStore.set(null);
}
