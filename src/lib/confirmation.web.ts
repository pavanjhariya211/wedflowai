import type { AlertButton } from 'react-native';

// These flows offer a cancel option and one explicit mutating action.
export const Alert = {
  alert(title: string, message?: string, buttons: AlertButton[] = []) {
    const action = buttons.find((button) => button.style !== 'cancel');
    if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message ?? ''}`)) {
      action?.onPress?.();
    } else {
      buttons.find((button) => button.style === 'cancel')?.onPress?.();
    }
  },
};
