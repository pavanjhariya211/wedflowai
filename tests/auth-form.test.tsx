import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AuthForm } from '../src/auth/AuthForm';
import Home from '../app/(tabs)/index';

const mockService = {
  signIn: jest.fn(), register: jest.fn(), resetPassword: jest.fn(), resendVerification: jest.fn(), signOut: jest.fn(),
};
const mockRouter = { push: jest.fn(), replace: jest.fn() };
jest.mock('expo-router', () => ({ router: {
  push: (path: string) => mockRouter.push(path), replace: (path: string) => mockRouter.replace(path),
} }));
jest.mock('../src/auth/AuthProvider', () => ({
  useAuth: () => ({ service: mockService, session: { user: { email: 'test@example.in' } } }),
}));
jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);

beforeEach(() => { jest.resetAllMocks(); });

describe('authentication screens (mocked provider)', () => {
  test('invalid registration stays on form without contacting backend', async () => {
    await render(<AuthForm mode="register" />);
    await fireEvent.changeText(screen.getByLabelText('Email'), 'invalid');
    await fireEvent.changeText(screen.getByLabelText('Password'), 'short');
    await fireEvent.press(screen.getByRole('button', { name: 'Create account' }));
    expect(screen.getByText('Enter a valid email address.')).toBeTruthy();
    expect(screen.getByText('Use at least 12 characters.')).toBeTruthy();
    expect(mockService.register).not.toHaveBeenCalled();
  });
  test('registration without session shows verification guidance, not signed-in success', async () => {
    mockService.register.mockResolvedValueOnce({ signedIn: false });
    await render(<AuthForm mode="register" />);
    await fireEvent.changeText(screen.getByLabelText('Email'), 'test@example.in');
    await fireEvent.changeText(screen.getByLabelText('Password'), 'a long password phrase');
    await fireEvent.changeText(screen.getByLabelText('Confirm password'), 'a long password phrase');
    await fireEvent.press(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText(/Check your email for a verification link/)).toBeTruthy();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });
  test('failed sign-in displays a safe error and never navigates', async () => {
    mockService.signIn.mockRejectedValueOnce({ code: 'invalid_credentials' });
    await render(<AuthForm mode="sign-in" />);
    await fireEvent.changeText(screen.getByLabelText('Email'), 'test@example.in');
    await fireEvent.changeText(screen.getByLabelText('Password'), 'wrong');
    await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('The email or password is incorrect.')).toBeTruthy();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });
  test('successful sign-in navigates only after the service resolves', async () => {
    let resolve!: () => void;
    mockService.signIn.mockReturnValueOnce(new Promise<void>((done) => { resolve = done; }));
    await render(<AuthForm mode="sign-in" />);
    await fireEvent.changeText(screen.getByLabelText('Email'), 'test@example.in');
    await fireEvent.changeText(screen.getByLabelText('Password'), 'a password');
    await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    expect(mockRouter.replace).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled();
    await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    expect(mockService.signIn).toHaveBeenCalledTimes(1);
    await act(async () => { resolve(); });
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/'));
  });
  test('password reset uses neutral wording instead of asserting email delivery', async () => {
    mockService.resetPassword.mockResolvedValueOnce(undefined);
    await render(<AuthForm mode="forgot-password" />);
    await fireEvent.changeText(screen.getByLabelText('Email'), 'test@example.in');
    await fireEvent.press(screen.getByRole('button', { name: 'Send reset link' }));
    expect(await screen.findByText(/If an account exists for this email/)).toBeTruthy();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });
  test('Home identifies unfinished features and surfaces sign-out failure', async () => {
    mockService.signOut.mockRejectedValueOnce({ name: 'AuthRetryableFetchError' });
    await render(<Home />);
    expect(screen.getByText(/No wedding, tasks, or expenses have been created yet/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Sign out of this device' }));
    expect(await screen.findByText(/Check your connection and try again/)).toBeTruthy();
  });
});
