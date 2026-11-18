import { authApi, onUnauthorized, type User } from "../api/api";
import { flush, openPage } from "../editor/editor";
import { createStore } from "../store/store";

export const userStore = createStore<User | null | undefined>(undefined);

onUnauthorized(() => userStore.set(null));

export async function loadUser() {
  try {
    userStore.set((await authApi.me()).user);
  } catch {
    userStore.set(null);
  }
}

export async function signIn(mode: "login" | "signup", email: string, password: string) {
  const { user } = await (mode === "login" ? authApi.login(email, password) : authApi.signup(email, password));
  userStore.set(user);
}

export async function signOut() {
  await flush();
  await openPage(null);
  await authApi.logout();
  userStore.set(null);
}
