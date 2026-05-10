import { useFonts } from 'expo-font';
import { PTSerif_700Bold } from '@expo-google-fonts/pt-serif';
import {
  UbuntuSansMono_400Regular,
  UbuntuSansMono_600SemiBold,
  UbuntuSansMono_700Bold,
} from '@expo-google-fonts/ubuntu-sans-mono';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  fetchCurrentUserProfile,
  updateCurrentUserProfile,
  type UserProfile,
} from '@fieldbook/api-client';
import { color } from '@fieldbook/design-system/lib/tokens';

import { CanvasTiledBackground } from '../components/CanvasTiledBackground';
import {
  ChangePasswordBottomSheet,
  ProfileRowsCard,
  TradeMultiSelectBottomSheet,
  UpdateProfileBottomSheet,
  type ProfileRowsCardRow,
  type UpdateProfileValues,
} from '../components/ds';
import {
  ProfileAccountIcon,
  ProfileEditPencilIcon,
  ProfilePersonalInfoIcon,
  ProfilePlanIcon,
  ProfileTrashIcon,
} from '../components/figma-icons/ProfileScreenIcons';
import { TopHeaderBackIcon } from '../components/figma-icons/TopHeaderIcons';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { TRADE_PRESETS, formatTradesForDisplay } from '../lib/trades';
import {
  TOP_HEADER_MAX_WIDTH,
  bg,
  createTextStyles,
  fg,
  radius,
  space,
} from '../theme/nativeTokens';
import type { TextStyles } from '../theme/nativeTokens';

/** Page back control — scale up Figma `231:837` (24×24 artboard). */
const PROFILE_BACK_ICON_SIZE = 28;

/**
 * Pull a user-readable message off any thrown value. Supabase throws
 * `PostgrestError` objects (`{ message, code, details, hint }`) that are
 * NOT `instanceof Error`, so a naive `e instanceof Error ? e.message : …`
 * check would always fall back to the generic copy and hide the real
 * cause (e.g. RLS violations, network failures, etc).
 */
function extractErrorMessage(e: unknown, fallback: string): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string' && e.length > 0) return e;
  if (e && typeof e === 'object' && 'message' in e) {
    const m = (e as { message?: unknown }).message;
    if (typeof m === 'string' && m.length > 0) return m;
  }
  return fallback;
}

/** State machine for the stacked bottom sheets — mirrors the JobDetail material flow. */
type ProfileFlow =
  | 'closed'
  | 'editProfile'
  | 'editProfileTrades'
  | 'changePassword';

export type ProfileScreenProps = {
  onBack: () => void;
};

export function ProfileScreen({ onBack }: ProfileScreenProps) {
  const insets = useSafeAreaInsets();
  const scrollY = useMemo(() => new Animated.Value(0), []);
  const [scrollContentHeight, setScrollContentHeight] = useState(0);
  const { signOut, session, updatePassword, deleteAccount } = useAuth();

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

  const headerTopPad = Math.max(insets.top - space('Spacing/12'), 0);
  const bottomNavReservedHeight =
    space('Spacing/8') + 1 + 64 + space('Spacing/8') + insets.bottom;

  // --- Profile data ---

  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const p = await fetchCurrentUserProfile(supabase);
        if (cancelled) return;
        setProfile(p);
      } catch (e) {
        if (cancelled) return;
        // eslint-disable-next-line no-console
        console.warn('[Profile] failed to fetch profile', e);
        setProfile(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user.id]);

  // --- Sheet flow ---

  const [flow, setFlow] = useState<ProfileFlow>('closed');
  /**
   * Mount-gate so the slide-down animation can play while the parent's flow
   * has already returned to `closed`. Mirrors the JobDetail pattern.
   */
  const [editProfileMounted, setEditProfileMounted] = useState(false);
  const [changePasswordMounted, setChangePasswordMounted] = useState(false);
  const [saving, setSaving] = useState(false);

  /**
   * Parent-owned draft for the Update Profile sheet. The trade picker
   * temporarily hides the Update Profile sheet, so the typed first/last
   * name need to be cached here to survive the round-trip.
   */
  const [editDraft, setEditDraft] = useState<UpdateProfileValues>({
    firstName: '',
    lastName: '',
    trades: [],
  });

  const openEditProfile = useCallback(() => {
    // We deliberately don't early-return when `profile` is null. Users who
    // signed up before the profiles trigger existed (or when the local
    // Supabase hasn't run the migration) won't have a row yet — opening
    // the sheet with empty defaults lets them fill it in, and the save
    // path upserts the row.
    setEditDraft({
      firstName: profile?.firstName ?? '',
      lastName: profile?.lastName ?? '',
      trades: profile?.trades ?? [],
    });
    setEditProfileMounted(true);
    setFlow('editProfile');
  }, [profile]);

  const closeEditProfile = useCallback(() => {
    setFlow('closed');
  }, []);

  const openTradePicker = useCallback((current: UpdateProfileValues) => {
    setEditDraft(current);
    setFlow('editProfileTrades');
  }, []);

  const returnFromTradePicker = useCallback(
    (nextTrades: string[]) => {
      setEditDraft((cur) => ({ ...cur, trades: nextTrades }));
      setFlow('editProfile');
    },
    [],
  );

  const onSaveProfile = useCallback(
    async (values: UpdateProfileValues) => {
      if (saving) return;
      setSaving(true);
      try {
        const updated = await updateCurrentUserProfile(supabase, {
          firstName: values.firstName,
          lastName: values.lastName,
          trades: values.trades,
        });
        setProfile(updated);
        setFlow('closed');
      } catch (e) {
        Alert.alert('Save failed', extractErrorMessage(e, 'Could not save profile.'));
      } finally {
        setSaving(false);
      }
    },
    [saving],
  );

  // Change password
  const openChangePassword = useCallback(() => {
    setChangePasswordMounted(true);
    setFlow('changePassword');
  }, []);
  const closeChangePassword = useCallback(() => {
    setFlow('closed');
  }, []);
  const onSubmitNewPassword = useCallback(
    async (newPassword: string) => {
      if (saving) return;
      setSaving(true);
      try {
        const { error } = await updatePassword(newPassword);
        if (error) {
          Alert.alert('Could not update password', error.message);
          return;
        }
        setFlow('closed');
        Alert.alert('Password updated');
      } finally {
        setSaving(false);
      }
    },
    [saving, updatePassword],
  );

  const onDeleteAccountPress = useCallback(() => {
    Alert.alert(
      'Delete account?',
      'This permanently deletes your account and all associated jobs, sessions, notes, and materials. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await deleteAccount();
            if (error) {
              Alert.alert('Could not delete account', error.message);
            }
            // On success the AuthContext signs out; AuthenticatedShell will
            // route back to SignInScreen on the next render.
          },
        },
      ],
    );
  }, [deleteAccount]);

  // --- Row construction ---

  const personalInfoRows: ProfileRowsCardRow[] = useMemo(() => {
    const fullName = [profile?.firstName, profile?.lastName]
      .map((s) => (s ?? '').trim())
      .filter((s) => s.length > 0)
      .join(' ');
    return [
      {
        kind: 'field',
        label: 'Name',
        value: fullName.length > 0 ? fullName : '—',
      },
      {
        kind: 'field',
        label: 'Email',
        value: session?.user.email ?? '—',
      },
      {
        kind: 'field',
        label: 'Trade',
        value: formatTradesForDisplay(profile?.trades ?? []),
      },
    ];
  }, [profile, session?.user.email]);

  const planRows: ProfileRowsCardRow[] = useMemo(
    () => [
      {
        kind: 'linkBadge',
        label: 'Current Plan',
        sublabel: 'Free Tier',
        badge: {
          text: 'ACTIVE',
          color: color('Semantic/Status/Success/Text'),
          backgroundColor: color('Semantic/Status/Success/BG'),
        },
      },
    ],
    [],
  );

  const accountRows: ProfileRowsCardRow[] = useMemo(
    () => [
      { kind: 'link', label: 'Change password', onPress: openChangePassword },
      {
        kind: 'link',
        label: 'Log out',
        onPress: () => void signOut(),
        hideChevron: true,
      },
    ],
    [openChangePassword, signOut],
  );

  const deleteRows: ProfileRowsCardRow[] = useMemo(
    () => [
      {
        kind: 'linkWithIcon',
        label: 'Delete account',
        icon: <ProfileTrashIcon color={color('Semantic/Status/Error/Text')} />,
        tone: 'danger',
        onPress: onDeleteAccountPress,
      },
    ],
    [onDeleteAccountPress],
  );

  if (!fontsLoaded) {
    return (
      <View style={styles.root}>
        <CanvasTiledBackground scrollY={scrollY} contentHeight={scrollContentHeight} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <CanvasTiledBackground scrollY={scrollY} contentHeight={scrollContentHeight} />
      <Animated.ScrollView
        style={[styles.scroll, { paddingTop: headerTopPad }]}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: bottomNavReservedHeight + space('Spacing/20'),
            flexGrow: 1,
          },
        ]}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
        })}
        scrollEventThrottle={16}
        onContentSizeChange={(_w, h) => setScrollContentHeight(h)}
      >
        <View style={styles.headerBand}>
          <View style={[styles.topHeaderRow, { maxWidth: TOP_HEADER_MAX_WIDTH }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              onPress={onBack}
              hitSlop={12}
              style={({ pressed }) => [styles.backHit, pressed && styles.pressed]}
            >
              <TopHeaderBackIcon color={fg.secondary} size={PROFILE_BACK_ICON_SIZE} />
            </Pressable>
            <Text style={[typography.displayH1, styles.profileTitle]}>PROFILE</Text>
          </View>
        </View>

        <View style={[styles.bodyWrap, { maxWidth: TOP_HEADER_MAX_WIDTH }]}>
          <ProfileSectionHeader
            typography={typography}
            title="PERSONAL INFO"
            icon={<ProfilePersonalInfoIcon color={color('Brand/Accent')} />}
            actionLabel="EDIT"
            actionIcon={
              <ProfileEditPencilIcon color={color('Semantic/Status/Error/Text')} />
            }
            onActionPress={openEditProfile}
          />
          <ProfileRowsCard typography={typography} rows={personalInfoRows} />

          <ProfileSectionHeader
            typography={typography}
            title="PLAN"
            icon={<ProfilePlanIcon color={color('Brand/Accent')} />}
          />
          <ProfileRowsCard typography={typography} rows={planRows} />

          <ProfileSectionHeader
            typography={typography}
            title="ACCOUNT"
            icon={<ProfileAccountIcon color={color('Brand/Accent')} />}
          />
          <ProfileRowsCard typography={typography} rows={accountRows} />

          <View style={styles.deleteSpacer} />
          <ProfileRowsCard typography={typography} rows={deleteRows} />
        </View>
      </Animated.ScrollView>

      {editProfileMounted ? (
        <>
          <UpdateProfileBottomSheet
            typography={typography}
            visible={flow === 'editProfile'}
            email={session?.user.email ?? null}
            values={editDraft}
            saving={saving}
            onClose={closeEditProfile}
            onClosed={() => {
              if (flow === 'closed') setEditProfileMounted(false);
            }}
            onBack={closeEditProfile}
            onSave={onSaveProfile}
            onTradesPress={openTradePicker}
          />
          <TradeMultiSelectBottomSheet
            typography={typography}
            visible={flow === 'editProfileTrades'}
            presets={TRADE_PRESETS}
            selected={editDraft.trades}
            onClose={closeEditProfile}
            onClosed={() => {
              if (flow === 'closed') setEditProfileMounted(false);
            }}
            onBack={() => returnFromTradePicker(editDraft.trades)}
            onSubmit={returnFromTradePicker}
          />
        </>
      ) : null}

      {changePasswordMounted ? (
        <ChangePasswordBottomSheet
          typography={typography}
          visible={flow === 'changePassword'}
          saving={saving}
          onClose={closeChangePassword}
          onClosed={() => {
            if (flow === 'closed') setChangePasswordMounted(false);
          }}
          onBack={closeChangePassword}
          onSubmit={onSubmitNewPassword}
        />
      ) : null}
    </View>
  );
}

/** Section header — leading icon + Metric-S title + optional pill action (Figma `1921:4617`). */
function ProfileSectionHeader({
  typography,
  title,
  icon,
  actionLabel,
  actionIcon,
  onActionPress,
}: {
  typography: TextStyles;
  title: string;
  icon: React.ReactNode;
  actionLabel?: string;
  actionIcon?: React.ReactNode;
  onActionPress?: () => void;
}) {
  const errorBg = color('Semantic/Status/Error/BG');
  const errorText = color('Semantic/Status/Error/Text');
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderLead}>
        {icon}
        <Text style={typography.metricS} numberOfLines={1}>
          {title}
        </Text>
      </View>
      {actionLabel ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          onPress={onActionPress}
          disabled={!onActionPress}
          style={({ pressed }) => [
            styles.actionPill,
            { backgroundColor: errorBg },
            pressed && styles.pressed,
          ]}
        >
          {actionIcon}
          <Text style={[typography.bodySmall, { color: errorText }]}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', backgroundColor: bg.canvasWarm },
  scroll: { flex: 1, width: '100%', backgroundColor: 'transparent' },
  scrollContent: {
    alignItems: 'stretch',
  },
  headerBand: {
    width: '100%',
    alignItems: 'center',
  },
  /** Title + Back — no accent strip (`231:817` variant `Title + Back`). */
  topHeaderRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space('Spacing/20'),
    paddingTop: space('Spacing/32'),
    paddingBottom: space('Spacing/16'),
    gap: space('Spacing/8'),
  },
  backHit: {
    width: PROFILE_BACK_ICON_SIZE,
    height: PROFILE_BACK_ICON_SIZE,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  profileTitle: {
    flex: 1,
    color: fg.primary,
  },
  bodyWrap: {
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: space('Spacing/20'),
    paddingTop: space('Spacing/8'),
    gap: space('Spacing/12'),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: space('Spacing/24'),
    paddingBottom: space('Spacing/4'),
    gap: space('Spacing/8'),
  },
  sectionHeaderLead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space('Spacing/8'),
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space('Spacing/8'),
    height: space('Spacing/24'),
    paddingHorizontal: space('Spacing/12'),
    paddingVertical: space('Spacing/4'),
    borderRadius: radius('Radius/Full'),
  },
  deleteSpacer: {
    height: space('Spacing/4'),
  },
  pressed: { opacity: 0.75 },
});
