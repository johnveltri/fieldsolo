import React from 'react';
import { render } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

import { SignInScreen } from './SignInScreen';

jest.mock('expo-font', () => ({
  useFonts: () => [true],
}));

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    signIn: jest.fn(),
    signUp: jest.fn(),
  }),
}));

jest.mock('../components/CanvasTiledBackground', () => ({
  CanvasTiledBackground: () => null,
}));

jest.mock('../lib/analytics', () => ({
  analytics: {
    capture: jest.fn(),
  },
  emailProperties: () => ({}),
  errorProperties: () => ({}),
}));

describe('SignInScreen', () => {
  it('renders the FieldSolo brand name', () => {
    const { getByText } = render(<SignInScreen />);

    expect(getByText('FieldSolo')).toBeTruthy();
  });
});
