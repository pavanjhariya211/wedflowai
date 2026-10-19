import 'fast-text-encoding';
import { CryptoDigestAlgorithm, digest, getRandomValues } from 'expo-crypto';

type AuthCrypto = {
  getRandomValues?: <T extends Uint8Array<ArrayBuffer> | Uint32Array<ArrayBuffer>>(values: T) => T;
  subtle?: { digest?: (algorithm: AlgorithmIdentifier, data: BufferSource) => Promise<ArrayBuffer> };
};

async function digestForPkce(algorithm: AlgorithmIdentifier, data: BufferSource): Promise<ArrayBuffer> {
  const name = typeof algorithm === 'string' ? algorithm : algorithm.name;
  if (name.toUpperCase() !== 'SHA-256') throw new Error('The native auth bridge supports SHA-256 only.');
  return digest(CryptoDigestAlgorithm.SHA256, data);
}

// Supabase's PKCE implementation consumes these two WebCrypto operations.
// Bridge missing native APIs to Expo's OS-backed crypto, preserving any complete
// platform implementation. This is deliberately not a full WebCrypto polyfill.
export function installNativeAuthCrypto(target: { crypto?: AuthCrypto }) {
  if (!target.crypto) Object.defineProperty(target, 'crypto', { value: {}, configurable: true });
  const crypto = target.crypto!;
  if (!crypto.getRandomValues) Object.defineProperty(crypto, 'getRandomValues', { value: getRandomValues });
  if (!crypto.subtle) Object.defineProperty(crypto, 'subtle', { value: { digest: digestForPkce } });
  else if (!crypto.subtle.digest) Object.defineProperty(crypto.subtle, 'digest', { value: digestForPkce });
}
