import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { color, radius, space } from '@fieldsolo/design-system/lib/tokens';

import { bg, border, cardShadowRn, fg } from '../../theme/nativeTokens';
import type { TextStyles } from '../../theme/nativeTokens';
import { ProfileChevronRightIcon } from '../figma-icons/ProfileScreenIcons';

/**
 * Single bordered card listing one or more profile rows. Each row sits
 * underneath a 1px hairline that matches the Figma `1922:1691` /
 * `1924:1841` / `1924:1880` / `1924:1947` cards.
 *
 * Variants:
 *   - `field`       — uppercase tiny label + value (Name / Email / Trade)
 *   - `link`        — single-line label + chevron (Change password / Log out)
 *   - `linkBadge`   — label + sublabel + status pill + chevron (Current Plan)
 *   - `linkWithIcon`— leading icon + label (Delete account)
 */

type ProfileRowFieldVariant = {
  kind: 'field';
  /** Uppercase tiny label, e.g. "Name". */
  label: string;
  /** Body text under the label. Use "—" for empty. */
  value: string;
};

type ProfileRowLinkVariant = {
  kind: 'link';
  label: string;
  onPress?: () => void;
  /** When set, label uses the matching color and chevron tint matches. */
  tone?: 'default' | 'danger';
  /** Hide the trailing chevron — Log out is a terminal action. */
  hideChevron?: boolean;
};

type ProfileRowLinkBadgeVariant = {
  kind: 'linkBadge';
  label: string;
  sublabel?: string;
  badge?: {
    text: string;
    /** Filled background + matching outline color. */
    color: string;
    backgroundColor: string;
  };
  onPress?: () => void;
  hideChevron?: boolean;
};

type ProfileRowLinkWithIconVariant = {
  kind: 'linkWithIcon';
  label: string;
  icon: ReactNode;
  onPress?: () => void;
  tone?: 'default' | 'danger';
};

export type ProfileRowsCardRow =
  | ProfileRowFieldVariant
  | ProfileRowLinkVariant
  | ProfileRowLinkBadgeVariant
  | ProfileRowLinkWithIconVariant;

type ProfileRowsCardProps = {
  typography: TextStyles;
  rows: ProfileRowsCardRow[];
  /**
   * @default true. When false the outer card border (and shadow) are
   * omitted — useful when nesting in another framed surface.
   */
  framed?: boolean;
};

export function ProfileRowsCard({
  typography,
  rows,
  framed = true,
}: ProfileRowsCardProps) {
  return (
    <View style={[styles.card, framed && styles.cardFramed]}>
      {rows.map((row, i) => (
        <Row key={`profile-row-${i}`} row={row} typography={typography} index={i} />
      ))}
    </View>
  );
}

function Row({
  row,
  typography,
  index,
}: {
  row: ProfileRowsCardRow;
  typography: TextStyles;
  index: number;
}) {
  // The Figma cards top-stroke every row except the first — visually all
  // rows are separated by a single 1px hairline (the card border + the
  // first row's missing top edge collapse into the same line).
  const topBorder = index > 0 ? styles.rowTopBorder : null;

  if (row.kind === 'field') {
    return (
      <View style={[styles.fieldRow, topBorder]}>
        <Text style={[typography.bodySmall, { color: fg.secondary }]}>{row.label}</Text>
        <Text style={[typography.body, { color: fg.primary }]} numberOfLines={2}>
          {row.value}
        </Text>
      </View>
    );
  }

  if (row.kind === 'link') {
    const labelColor =
      row.tone === 'danger' ? color('Semantic/Status/Error/Text') : fg.primary;
    const chevronColor =
      row.tone === 'danger' ? color('Semantic/Status/Error/Text') : fg.secondary;
    const interactive = !!row.onPress;
    const Body = (
      <View style={styles.linkRowInner}>
        <Text style={[typography.bodyBold, { color: labelColor }]} numberOfLines={1}>
          {row.label}
        </Text>
        {!row.hideChevron ? (
          <ProfileChevronRightIcon color={chevronColor} size={12} />
        ) : null}
      </View>
    );

    if (!interactive) {
      return <View style={[styles.linkRow, topBorder]}>{Body}</View>;
    }

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={row.label}
        onPress={row.onPress}
        style={({ pressed }) => [styles.linkRow, topBorder, pressed && styles.pressed]}
      >
        {Body}
      </Pressable>
    );
  }

  if (row.kind === 'linkBadge') {
    const interactive = !!row.onPress;
    const Body = (
      <View style={styles.linkBadgeInner}>
        <View style={styles.linkBadgeLeftCol}>
          <Text style={[typography.bodyBold, { color: fg.primary }]} numberOfLines={1}>
            {row.label}
          </Text>
          {row.sublabel ? (
            <Text style={[typography.bodySmall, { color: fg.secondary }]} numberOfLines={1}>
              {row.sublabel}
            </Text>
          ) : null}
        </View>
        {row.badge ? (
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: row.badge.backgroundColor,
                borderColor: row.badge.color,
              },
            ]}
          >
            <Text
              style={[
                typography.statusPillLabel,
                { color: row.badge.color, textTransform: 'uppercase' },
              ]}
            >
              {row.badge.text}
            </Text>
          </View>
        ) : null}
        {!row.hideChevron ? (
          <ProfileChevronRightIcon color={fg.secondary} size={12} />
        ) : null}
      </View>
    );

    if (!interactive) {
      return <View style={[styles.linkRow, topBorder]}>{Body}</View>;
    }

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={row.label}
        onPress={row.onPress}
        style={({ pressed }) => [styles.linkRow, topBorder, pressed && styles.pressed]}
      >
        {Body}
      </Pressable>
    );
  }

  // linkWithIcon
  const labelColor =
    row.tone === 'danger' ? color('Semantic/Status/Error/Text') : fg.primary;
  const interactive = !!row.onPress;
  const Body = (
    <View style={styles.linkIconInner}>
      {row.icon}
      <Text style={[typography.bodyBold, { color: labelColor }]} numberOfLines={1}>
        {row.label}
      </Text>
    </View>
  );
  if (!interactive) {
    return <View style={[styles.linkRow, topBorder]}>{Body}</View>;
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={row.label}
      onPress={row.onPress}
      style={({ pressed }) => [styles.linkRow, topBorder, pressed && styles.pressed]}
    >
      {Body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: bg.surfaceWhite,
    borderRadius: radius('Radius/16'),
    overflow: 'hidden',
  },
  cardFramed: {
    borderWidth: 1,
    borderColor: border.subtle,
    ...cardShadowRn,
  },
  rowTopBorder: {
    borderTopWidth: 1,
    borderTopColor: border.subtle,
  },
  fieldRow: {
    paddingHorizontal: space('Spacing/16'),
    paddingVertical: space('Spacing/16'),
    gap: space('Spacing/4'),
  },
  linkRow: {
    paddingHorizontal: space('Spacing/16'),
    minHeight: 70,
    justifyContent: 'center',
  },
  linkRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space('Spacing/12'),
  },
  linkBadgeInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space('Spacing/12'),
  },
  linkBadgeLeftCol: {
    flex: 1,
    minWidth: 0,
    gap: space('Spacing/4'),
  },
  statusPill: {
    paddingHorizontal: space('Spacing/12'),
    paddingVertical: space('Spacing/4'),
    borderRadius: radius('Radius/Full'),
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkIconInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space('Spacing/8'),
  },
  pressed: {
    opacity: 0.75,
  },
});
