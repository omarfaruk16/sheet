import { auth } from './firebase';

const LOCAL_SESSION_KEY = 'leafsheets_user_session';

export type LocalSessionUser = {
  id?: string;
  uid: string;
  name?: string;
  email?: string;
  role?: string;
  authProvider?: 'local' | 'firebase';
};

export type LocalSession = {
  token: string;
  user: LocalSessionUser;
};

export const setLocalSession = (session: LocalSession) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(session));
};

export const getLocalSession = (): LocalSession | null => {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(LOCAL_SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as LocalSession;
  } catch {
    localStorage.removeItem(LOCAL_SESSION_KEY);
    return null;
  }
};

export const clearLocalSession = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(LOCAL_SESSION_KEY);
};

export const getAccessToken = async (): Promise<string | null> => {
  if (typeof window === 'undefined') return null;

  if ('currentUser' in auth && auth.currentUser) {
    try {
      return await auth.currentUser.getIdToken();
    } catch {
      // Fall through to local session token.
    }
  }

  return getLocalSession()?.token || null;
};

export const getActiveUser = (): LocalSessionUser | null => {
  if (typeof window === 'undefined') return null;

  if ('currentUser' in auth && auth.currentUser) {
    return {
      uid: auth.currentUser.uid,
      name: auth.currentUser.displayName || undefined,
      email: auth.currentUser.email || undefined,
      authProvider: 'firebase',
    };
  }

  return getLocalSession()?.user || null;
};

