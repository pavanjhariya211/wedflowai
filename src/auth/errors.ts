// Do not render raw backend errors: they can contain implementation details.
export function friendlyAuthError(error: unknown): string {
  const value = error as { code?: string; name?: string; status?: number } | null;
  if (value?.name === 'AuthRetryableFetchError' || value?.name === 'TypeError') {
    return 'We could not reach the sign-in service. Check your connection and try again.';
  }
  switch (value?.code) {
    case 'invalid_credentials': return 'The email or password is incorrect.';
    case 'email_not_confirmed': return 'Verify your email before signing in. You can request a new link below.';
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit': return 'Too many attempts. Wait a little before trying again.';
    case 'weak_password': return 'Choose a stronger password with at least 12 characters.';
    case 'same_password': return 'Choose a password different from your current password.';
    case 'otp_expired':
    case 'flow_state_expired':
    case 'flow_state_not_found': return 'This link has expired or was opened on a different device. Request a new link in the app.';
    case 'signup_disabled': return 'New registrations are currently unavailable.';
    default: return 'This request could not be completed. Please try again.';
  }
}
