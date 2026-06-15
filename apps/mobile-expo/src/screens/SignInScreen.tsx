import { useFonts } from 'expo-font';
import { PTSerif_700Bold } from '@expo-google-fonts/pt-serif';
import {
  UbuntuSansMono_400Regular,
  UbuntuSansMono_600SemiBold,
  UbuntuSansMono_700Bold,
} from '@expo-google-fonts/ubuntu-sans-mono';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../context/AuthContext';
import { CanvasTiledBackground } from '../components/CanvasTiledBackground';
import { analytics, emailProperties, errorProperties } from '../lib/analytics';
import {
  CONTENT_MAX_WIDTH,
  createTextStyles,
  fg,
  padScreenHorizontal,
  space,
} from '../theme/nativeTokens';

export function SignInScreen() {
  const insets = useSafeAreaInsets();
  const scrollY = useMemo(() => new Animated.Value(0), []);
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const previousModeRef = useRef(mode);

  useEffect(() => {
    analytics.capture('auth_screen_viewed', { mode });
  }, [mode]);

  useEffect(() => {
    if (previousModeRef.current === mode) return;
    analytics.capture('auth_mode_changed', {
      from_mode: previousModeRef.current,
      to_mode: mode,
    });
    previousModeRef.current = mode;
  }, [mode]);

  const [fontsLoaded] = useFonts({
    PTSerif_700Bold,
    UbuntuSansMono_400Regular,
    UbuntuSansMono_600SemiBold,
    UbuntuSansMono_700Bold,
  });

  const typography = useMemo(
    () =>
      createTextStyles({
        serifBold: 'PTSerif_700Bold',
        mono: 'UbuntuSansMono_400Regular',
        monoSemi: 'UbuntuSansMono_600SemiBold',
        monoBold: 'UbuntuSansMono_700Bold',
      }),
    [],
  );

  const text = useMemo(
    () => ({
      title: typography.titleH3,
      body: typography.body,
      caption: typography.bodySmall,
      bodySemi: typography.bodyBold,
    }),
    [typography],
  );

  const onSubmit = useCallback(async () => {
    setError(null);
    const trimmed = email.trim();
    if (!trimmed || !password) {
      setError('Enter email and password.');
      return;
    }
    if (mode === 'signUp') {
      if (!firstName.trim() || !lastName.trim()) {
        setError('Enter your first and last name.');
        return;
      }
    }
    setBusy(true);
    try {
      if (mode === 'signIn') {
        analytics.capture('sign_in_submitted', {
          ...emailProperties(trimmed),
          email: trimmed,
          has_password: password.length > 0,
        });
        const { error: err } = await signIn(trimmed, password);
        if (err) {
          analytics.capture('sign_in_failed', {
            ...emailProperties(trimmed),
            email: trimmed,
            ...errorProperties(err),
          });
          setError(err.message);
        } else {
          analytics.capture('sign_in_succeeded', {
            ...emailProperties(trimmed),
            email: trimmed,
          });
        }
      } else {
        analytics.capture('sign_up_submitted', {
          ...emailProperties(trimmed),
          email: trimmed,
          first_name_present: firstName.trim().length > 0,
          last_name_present: lastName.trim().length > 0,
        });
        // First/last name go into raw_user_meta_data so the
        // public.handle_new_user trigger can seed the profiles row.
        const { error: signUpErr } = await signUp(trimmed, password, {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        });
        if (signUpErr) {
          analytics.capture('sign_up_failed', {
            stage: 'sign_up',
            ...emailProperties(trimmed),
            email: trimmed,
            ...errorProperties(signUpErr),
          });
          setError(signUpErr.message);
          return;
        }
        analytics.capture('sign_up_succeeded', {
          ...emailProperties(trimmed),
          email: trimmed,
        });
        // In local/dev projects email confirmation may vary; attempt sign-in immediately.
        const { error: signInErr } = await signIn(trimmed, password);
        if (signInErr) {
          analytics.capture('sign_up_failed', {
            stage: 'immediate_sign_in',
            ...emailProperties(trimmed),
            email: trimmed,
            ...errorProperties(signInErr),
          });
          setError(
            `Account created. ${
              signInErr.message || 'Sign in next to continue.'
            }`,
          );
          setMode('signIn');
          return;
        }
      }
    } catch (e) {
      analytics.capture(mode === 'signIn' ? 'sign_in_failed' : 'sign_up_failed', {
        stage: mode === 'signIn' ? 'sign_in' : 'unexpected',
        ...emailProperties(trimmed),
        email: trimmed,
        ...errorProperties(e),
      });
      setError(e instanceof Error ? e.message : 'Network request failed');
    } finally {
      setBusy(false);
    }
  }, [email, password, firstName, lastName, mode, signIn, signUp]);

  if (!fontsLoaded) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <CanvasTiledBackground scrollY={scrollY} />
        <ActivityIndicator />
      </View>
    );
  }

  const horizontal = padScreenHorizontal();
  const gap = space('Spacing/20');

  return (
    <View style={styles.root}>
      <CanvasTiledBackground scrollY={scrollY} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <Animated.ScrollView
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true },
          )}
          scrollEventThrottle={16}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: insets.top + gap,
              paddingBottom: insets.bottom + gap,
              paddingHorizontal: horizontal,
            },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.card, { maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center', width: '100%' }]}>
            <Text style={[text.title, { color: fg.primary, marginBottom: gap }]}>FieldSolo</Text>
            <Text style={[text.body, { color: fg.secondary, marginBottom: gap }]}>
              Sign in with email and password
            </Text>

            {mode === 'signUp' ? (
              <>
                <Text
                  style={[
                    text.caption,
                    { color: fg.secondary, marginBottom: space('Spacing/8') },
                  ]}
                >
                  First name
                </Text>
                <TextInput
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCapitalize="words"
                  autoCorrect={false}
                  placeholder="Alex"
                  placeholderTextColor={fg.muted}
                  style={[styles.input, text.body, { color: fg.primary }]}
                  editable={!busy}
                />
                <Text
                  style={[
                    text.caption,
                    {
                      color: fg.secondary,
                      marginBottom: space('Spacing/8'),
                      marginTop: gap,
                    },
                  ]}
                >
                  Last name
                </Text>
                <TextInput
                  value={lastName}
                  onChangeText={setLastName}
                  autoCapitalize="words"
                  autoCorrect={false}
                  placeholder="Builder"
                  placeholderTextColor={fg.muted}
                  style={[styles.input, text.body, { color: fg.primary }]}
                  editable={!busy}
                />
                <View style={{ height: gap }} />
              </>
            ) : null}

            <Text style={[text.caption, { color: fg.secondary, marginBottom: space('Spacing/8') }]}>
              Email
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="you@example.com"
              placeholderTextColor={fg.muted}
              style={[styles.input, text.body, { color: fg.primary }]}
              editable={!busy}
            />

            <Text
              style={[
                text.caption,
                { color: fg.secondary, marginBottom: space('Spacing/8'), marginTop: gap },
              ]}
            >
              Password
            </Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor={fg.muted}
              style={[styles.input, text.body, { color: fg.primary }]}
              editable={!busy}
            />

            {error ? (
              <Text style={[text.caption, { color: '#b00020', marginTop: gap }]}>{error}</Text>
            ) : null}

            <Pressable
              onPress={onSubmit}
              disabled={busy}
              style={({ pressed }) => [
                styles.primaryButton,
                { marginTop: gap * 1.5, opacity: busy ? 0.6 : pressed ? 0.85 : 1 },
              ]}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={[text.bodySemi, { color: '#fff' }]}>
                  {mode === 'signIn' ? 'Sign in' : 'Create account'}
                </Text>
              )}
            </Pressable>

            <Pressable
              onPress={() => {
                setMode((m) => (m === 'signIn' ? 'signUp' : 'signIn'));
                setError(null);
              }}
              disabled={busy}
              style={{ marginTop: gap }}
            >
              <Text style={[text.caption, { color: fg.secondary }]}>
                {mode === 'signIn' ? 'Need an account? Sign up' : 'Have an account? Sign in'}
              </Text>
            </Pressable>
          </View>
        </Animated.ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1, zIndex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center' },
  card: {
    padding: space('Spacing/24'),
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  primaryButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
});
