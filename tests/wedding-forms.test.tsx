import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { WeddingForm } from '../src/wedding/WeddingForm';
import { JoinForm } from '../src/wedding/JoinForm';
import Timeline from '../app/(tabs)/timeline';
const mockService = { create: jest.fn(), accept: jest.fn() };
const mockReload = jest.fn();
const mockDone = jest.fn();
jest.mock('expo-crypto', () => ({ randomUUID: () => 'fixed-request-id' }));
jest.mock('../src/auth/AuthProvider', () => ({ useAuth: () => ({ session: { user: { id: 'viewer' } } }) }));
jest.mock('expo-router', () => ({ useFocusEffect: () => undefined }));
jest.mock('../src/wedding/WeddingProvider', () => ({ useWedding: () => ({
  service: mockService, reload: mockReload, loading: false, error: '',
  wedding: { id: 'wedding', main_date: '2027-12-12' }, ceremonies: [],
  spaces: [{ id: 'scope', name: 'Our family', kind: 'family', can_edit: false, can_manage: false }],
}) }));
jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);
beforeEach(() => { jest.resetAllMocks(); mockReload.mockResolvedValue(undefined); });
async function enterWedding() {
  await fireEvent.changeText(screen.getByLabelText('Your display name'), 'Planner');
  await fireEvent.changeText(screen.getByLabelText('Wedding name'), 'Our wedding');
  await fireEvent.changeText(screen.getByLabelText('Wedding date'), '12/12/2027');
  await fireEvent.changeText(screen.getByLabelText('Planning start date'), '19/10/2026');
}
test('invalid onboarding prevents a server request', async () => {
  await render(<WeddingForm onDone={mockDone} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Create wedding' }));
  expect(screen.getByText('Enter a wedding name (up to 120 characters).')).toBeTruthy();
  expect(mockService.create).not.toHaveBeenCalled();
});
test('valid onboarding persists then reloads the returned workspace', async () => {
  mockService.create.mockResolvedValueOnce('created-wedding');
  await render(<WeddingForm onDone={mockDone} />);
  await enterWedding();
  await fireEvent.press(screen.getByRole('button', { name: 'Create wedding' }));
  await waitFor(() => expect(mockDone).toHaveBeenCalled());
  expect(mockService.create).toHaveBeenCalledWith('fixed-request-id', expect.objectContaining({ title: 'Our wedding', mode: 'shared', budget: '' }));
  expect(mockReload).toHaveBeenCalledWith('created-wedding');
});
test('a failed create keeps the form and never reports success', async () => {
  mockService.create.mockRejectedValueOnce({ code: '42501' });
  await render(<WeddingForm onDone={mockDone} />); await enterWedding();
  await fireEvent.press(screen.getByRole('button', { name: 'Create wedding' }));
  expect(await screen.findByText(/Access denied/)).toBeTruthy();
  expect(mockDone).not.toHaveBeenCalled();
});
test('separate-family choice explains privacy and exposes editable family labels', async () => {
  await render(<WeddingForm onDone={mockDone} />);
  await fireEvent.press(screen.getByRole('radio', { name: 'Separate families with a shared overview' }));
  expect(screen.getByLabelText('Your family workspace')).toBeTruthy();
  expect(screen.getByText(/their private ceremonies stay private/)).toBeTruthy();
});
test('a rejected invitation does not enter a wedding', async () => {
  mockService.accept.mockRejectedValueOnce({ code: '42501' });
  await render(<JoinForm onDone={mockDone} />);
  await fireEvent.changeText(screen.getByLabelText('Your display name'), 'Viewer');
  await fireEvent.changeText(screen.getByLabelText('Invitation code'), 'a'.repeat(64));
  await fireEvent.press(screen.getByRole('button', { name: 'Accept invitation and join' }));
  expect(await screen.findByText(/Access denied/)).toBeTruthy();
  expect(mockReload).not.toHaveBeenCalled(); expect(mockDone).not.toHaveBeenCalled();
});
test('view-only timeline shows no ceremony mutation controls', async () => {
  await render(<Timeline />);
  expect(screen.getByText('You have view-only access.')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Add ceremony' })).toBeNull();
});
