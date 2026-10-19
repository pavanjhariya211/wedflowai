import { createHash } from 'node:crypto';
import { CryptoDigestAlgorithm, digest, getRandomValues } from 'expo-crypto';
import { installNativeAuthCrypto } from '../src/lib/native-auth-crypto';
jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  digest: jest.fn(),
  getRandomValues: jest.fn((array: Uint8Array) => array.fill(42)),
}));

describe('native PKCE crypto bridge (mocked native binding)', () => {
  test('uses native secure random and SHA-256 rather than fallback randomness/plain PKCE', async () => {
    const target = {} as Parameters<typeof installNativeAuthCrypto>[0];
    installNativeAuthCrypto(target);
    const bytes = new Uint8Array([97, 98, 99]);
    const expected = createHash('sha256').update(bytes).digest();
    jest.mocked(digest).mockResolvedValueOnce(expected.buffer.slice(expected.byteOffset, expected.byteOffset + expected.byteLength));
    const result = await target.crypto!.subtle!.digest!('SHA-256', bytes);
    expect(Buffer.from(result).toString('hex')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(digest).toHaveBeenCalledWith(CryptoDigestAlgorithm.SHA256, bytes);
    const random = new Uint8Array(16);
    target.crypto!.getRandomValues!(random);
    expect(getRandomValues).toHaveBeenCalledWith(random);
  });
  test('preserves an existing full platform implementation', () => {
    const native = { getRandomValues, subtle: { digest: jest.fn() } };
    const target = { crypto: native };
    installNativeAuthCrypto(target);
    expect(target.crypto).toBe(native);
    expect(target.crypto.subtle.digest).toBe(native.subtle.digest);
  });
  test('rejects algorithms the bridge does not implement', async () => {
    const target = {} as Parameters<typeof installNativeAuthCrypto>[0];
    installNativeAuthCrypto(target);
    await expect(target.crypto!.subtle!.digest!('SHA-1', new Uint8Array())).rejects.toThrow('SHA-256 only');
  });
});
