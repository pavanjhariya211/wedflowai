import { validateAuthForm, validateNewPassword } from '../src/auth/validation';

describe('authentication input validation', () => {
  test('requires an email and password before sign in', () => {
    expect(validateAuthForm('sign-in', { email: 'bad', password: '', confirmPassword: '' })).toEqual({
      email: 'Enter a valid email address.', password: 'Enter your password.',
    });
  });
  test('does not apply new-password policy to an existing account', () => {
    expect(validateAuthForm('sign-in', { email: ' user@example.in ', password: 'old', confirmPassword: '' })).toEqual({});
  });
  test('registration rejects short and mismatched passwords', () => {
    expect(validateAuthForm('register', { email: 'user@example.in', password: 'short', confirmPassword: 'different' }))
      .toEqual({ password: 'Use at least 12 characters.', confirmPassword: 'Passwords do not match.' });
  });
  test('reset email does not require a password', () => {
    expect(validateAuthForm('forgot-password', { email: 'user@example.in', password: '', confirmPassword: '' })).toEqual({});
  });
  test('accepts long passphrases and does not trim password whitespace', () => {
    expect(validateNewPassword('a memorable phrase ', 'a memorable phrase ')).toEqual({});
    expect(validateNewPassword('a memorable phrase ', 'a memorable phrase')).toHaveProperty('confirmPassword');
  });
  test('caps new passwords before sending a request', () => {
    expect(validateNewPassword('x'.repeat(129), 'x'.repeat(129))).toHaveProperty('password');
  });
});
