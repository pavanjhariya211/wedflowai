import * as SecureStore from 'expo-secure-store';
import { processLock } from '@supabase/supabase-js';
import { createSessionStorage } from './secure-storage';

export const authStorage = createSessionStorage(SecureStore);
export const authLock = processLock;
