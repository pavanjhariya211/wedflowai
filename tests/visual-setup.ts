// Component tests isolate native font/asset loading. Browser/export checks use
// the real icon glyphs and locally bundled fonts.
jest.mock('@expo/vector-icons/Ionicons', () => {
 const React = jest.requireActual<typeof import('react')>('react');
 const { View } = jest.requireActual<typeof import('react-native')>('react-native');
 return function DecorativeIcon() { return React.createElement(View, { accessibilityElementsHidden: true }); };
});
