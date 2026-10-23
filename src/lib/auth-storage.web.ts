import { navigatorLock } from '@supabase/supabase-js';
import { createBrowserStorage } from './browser-storage';

export const authStorage = createBrowserStorage(() =>
  typeof window === 'undefined' ? null : window.localStorage);
// Coordinate refresh across tabs using the browser's Web Locks API.
export const authLock = navigatorLock;
