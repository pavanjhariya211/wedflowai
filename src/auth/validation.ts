export type AuthMode = 'sign-in' | 'register' | 'forgot-password';
export type AuthFields = { email: string; password: string; confirmPassword: string };
export type AuthErrors = Partial<Record<keyof AuthFields, string>>;

export function validateAuthForm(mode: AuthMode, fields: AuthFields): AuthErrors {
  const errors: AuthErrors = {};
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim()) || fields.email.trim().length > 254) {
    errors.email = 'Enter a valid email address.';
  }
  if (mode === 'sign-in' && !fields.password) errors.password = 'Enter your password.';
  if (mode === 'register') Object.assign(errors, validateNewPassword(fields.password, fields.confirmPassword));
  return errors;
}

export function validateNewPassword(password: string, confirmation: string): AuthErrors {
  const errors: AuthErrors = {};
  if (password.length < 12) errors.password = 'Use at least 12 characters.';
  else if (password.length > 128) errors.password = 'Use no more than 128 characters.';
  if (password !== confirmation) errors.confirmPassword = 'Passwords do not match.';
  return errors;
}
