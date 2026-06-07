import { Pressable, StyleSheet, Text, View } from 'react-native';
import type {
  JobDetailMaterialBucket,
  JobDetailNoteBucket,
} from '@fieldbook/shared-types';
import { color, radius, space } from '@fieldbook/design-system/lib/tokens';

import { bg, border, fg, CONTENT_MAX_WIDTH } from '../../theme/nativeTokens';
import type { TextStyles } from '../../theme/nativeTokens';
import { JobDetailIconViewNote } from '../figma-icons/JobDetailScreenIcons';

/** Session bucket header — e.g. "MAR 25, 2026 SESSION"; UNASSIGNED renders verbatim. */
export function bucketSessionHeaderTitle(sessionDateLabel: string | undefined): string {
  const d = sessionDateLabel?.trim() ?? '';
  return `${d} SESSION`.replace(/\s+/g, ' ').trim().toUpperCase();
}

/**
 * Single bordered card listing material buckets (unassigned vs per-session).
 * Shared by Job Detail and the Inbox so both render the same UNASSIGNED card.
 */
export function ViewMaterialsBuckets({
  buckets,
  typography,
  onMaterialPress,
  hideBucketHeaders = false,
}: {
  buckets: JobDetailMaterialBucket[];
  typography: TextStyles;
  /** Tap a row → open the Edit Material sheet / Add to Job sheet for this material. */
  onMaterialPress?: (materialId: string) => void;
  /**
   * Hide the per-bucket UNASSIGNED / session headers. The Inbox uses this so
   * its own recency section headers (TODAY / PAST WEEK …) are the grouping.
   */
  hideBucketHeaders?: boolean;
}) {
  if (buckets.length === 0) {
    return null;
  }

  return (
    <View style={[styles.viewCardOuter, { maxWidth: CONTENT_MAX_WIDTH }]}>
      <View style={styles.viewCardBorder}>
        {buckets.map((bucket, bi) => (
          <View
            key={bucket.id}
            style={bi > 0 ? { borderTopWidth: 1, borderTopColor: color('Foundation/Border/Subtle') } : undefined}
          >
            {hideBucketHeaders ? null : (
              <View style={[styles.bucketHeader, bi === 0 && styles.bucketHeaderFirst]}>
                {bucket.kind === 'unassigned' ? (
                  <Text style={typography.labelHeadingSecondary}>UNASSIGNED</Text>
                ) : (
                  <Text style={typography.labelHeadingSecondary}>
                    {bucketSessionHeaderTitle(bucket.sessionDateLabel)}
                  </Text>
                )}
              </View>
            )}
            {bucket.items.map((item, ii) => (
              <Pressable
                key={`${bucket.id}-${item.id}`}
                accessibilityRole="button"
                accessibilityLabel="Edit material"
                onPress={onMaterialPress ? () => onMaterialPress(item.id) : undefined}
                style={({ pressed }) => [
                  styles.materialRow,
                  ii > 0 && { borderTopWidth: 1, borderTopColor: color('Foundation/Border/Subtle') },
                  pressed && onMaterialPress ? styles.pressed : null,
                ]}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[typography.bodyBold, { color: fg.primary }]}>{item.name}</Text>
                  <Text style={[typography.body, { color: fg.secondary, marginTop: space('Spacing/4') }]}>
                    {item.quantityLabel}
                  </Text>
                </View>
                <Text style={[typography.bodyBold, { color: fg.primary }]}>{item.priceLabel}</Text>
              </Pressable>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * Single bordered card listing note buckets (unassigned vs per-session).
 * Shared by Job Detail and the Inbox so both render the same UNASSIGNED card.
 */
export function ViewNotesBuckets({
  buckets,
  typography,
  onNotePress,
  hideBucketHeaders = false,
}: {
  buckets: JobDetailNoteBucket[];
  typography: TextStyles;
  /** Tap a row → open the Edit Note sheet / Add to Job sheet for this note. */
  onNotePress?: (noteId: string) => void;
  /**
   * Hide the per-bucket UNASSIGNED / session headers. The Inbox uses this so
   * its own recency section headers (TODAY / PAST WEEK …) are the grouping.
   */
  hideBucketHeaders?: boolean;
}) {
  if (buckets.length === 0) {
    return null;
  }

  const noteIcon = color('Semantic/Activity/Note');
  return (
    <View style={[styles.viewCardOuter, { maxWidth: CONTENT_MAX_WIDTH }]}>
      <View style={styles.viewCardBorder}>
        {buckets.map((bucket, bi) => (
          <View
            key={bucket.id}
            style={bi > 0 ? { borderTopWidth: 1, borderTopColor: color('Foundation/Border/Subtle') } : undefined}
          >
            {hideBucketHeaders ? null : (
              <View style={[styles.bucketHeader, bi === 0 && styles.bucketHeaderFirst]}>
                {bucket.kind === 'unassigned' ? (
                  <Text style={typography.labelHeadingSecondary}>UNASSIGNED</Text>
                ) : (
                  <Text style={typography.labelHeadingSecondary}>
                    {bucketSessionHeaderTitle(bucket.sessionDateLabel)}
                  </Text>
                )}
              </View>
            )}
            {bucket.notes.map((n, ni) => (
              <Pressable
                key={`${bucket.id}-n-${n.id}`}
                accessibilityRole="button"
                accessibilityLabel="Edit note"
                onPress={onNotePress ? () => onNotePress(n.id) : undefined}
                style={({ pressed }) => [
                  styles.noteRow,
                  ni > 0 && { borderTopWidth: 1, borderTopColor: color('Foundation/Border/Subtle') },
                  pressed && onNotePress ? styles.pressed : null,
                ]}
              >
                <View style={{ marginTop: space('Spacing/2') }}>
                  <JobDetailIconViewNote color={noteIcon} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[typography.body, { color: fg.primary }]}>{n.excerpt}</Text>
                  <Text style={[typography.bodySmall, { color: fg.secondary, marginTop: space('Spacing/8') }]}>
                    {n.dateLabel}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  viewCardOuter: {
    width: '100%',
    paddingVertical: space('Spacing/8'),
  },
  viewCardBorder: {
    borderRadius: radius('Radius/16'),
    borderWidth: 1,
    borderColor: border.subtle,
    backgroundColor: bg.surfaceWhite,
    overflow: 'hidden',
  },
  bucketHeader: {
    height: space('Spacing/32'),
    justifyContent: 'center',
    backgroundColor: bg.canvasWarm,
    paddingHorizontal: space('Spacing/16'),
  },
  bucketHeaderFirst: {
    borderTopLeftRadius: radius('Radius/16'),
    borderTopRightRadius: radius('Radius/16'),
  },
  materialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: space('Spacing/16'),
    gap: space('Spacing/16'),
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space('Spacing/8'),
    paddingHorizontal: space('Spacing/16'),
    paddingVertical: space('Spacing/16'),
  },
  pressed: { opacity: 0.75 },
});
