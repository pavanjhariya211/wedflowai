import { Alert } from '../src/lib/confirmation.web';

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
afterEach(() => {
  if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
  else Reflect.deleteProperty(globalThis, 'window');
});

test.each([true, false])('browser confirmation %s explicitly gates mutations', (approved) => {
  const confirm = jest.fn(() => approved), mutate = jest.fn(), cancel = jest.fn();
  Object.defineProperty(globalThis, 'window', { value: { confirm }, configurable: true });
  Alert.alert('Share ceremony?', 'Everyone will see it.', [
    { text: 'Keep private', style: 'cancel', onPress: cancel },
    { text: 'Share', onPress: mutate },
  ]);
  expect(confirm).toHaveBeenCalledWith('Share ceremony?\n\nEveryone will see it.');
  expect(mutate).toHaveBeenCalledTimes(approved ? 1 : 0);
  expect(cancel).toHaveBeenCalledTimes(approved ? 0 : 1);
});
