import Cookies from "js-cookie";

export interface AuthUser {
  userId: string;
  email: string;
  name: string;
}

const TOKEN_KEY = "hr_token";
const USER_KEY = "hr_user";

export function setAuth(token: string, user: AuthUser) {
  Cookies.set(TOKEN_KEY, token, { expires: 1 });
  Cookies.set(USER_KEY, JSON.stringify(user), { expires: 1 });
}

export function getToken(): string | undefined {
  return Cookies.get(TOKEN_KEY);
}

export function getUser(): AuthUser | null {
  const raw = Cookies.get(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function clearAuth() {
  Cookies.remove(TOKEN_KEY);
  Cookies.remove(USER_KEY);
}