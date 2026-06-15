import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  color,
  colorWithAlpha,
  radius,
  space,
} from '@fieldsolo/design-system/lib/tokens';
import type { JobDetailSession } from '@fieldsolo/shared-types';

import { bg, border, fg } from '../../theme/nativeTokens';
import type { TextStyles } from '../../theme/nativeTokens';
import { JobDetailIconViewSessionChevron, SessionCardEditPencilIcon } from '../figma-icons/JobDetailScreenIcons';
import { SessionAddToSessionTiles } from './SessionAddToSessionTiles';
import { SessionAttachmentList } from './SessionAttachmentList';

type SessionCardProps = {
  session: JobDetailSession;
  typography: TextStyles;
  expanded: boolean;
  onToggle: () => void;
  onEditPress: () => void;
  onAddNote: () => void;
  onAddMaterial: () => void;
  onPressAttachment: (item: { kind: 'note' | 'material'; id: string }) => void;
};

/**
 * Collapsible session row (Figma View Session `1284:577` / `1285:465`).
 * Expanded: EDIT, Add to Session (Note/Material tappable), attachment list.
 */
export function SessionCard({
  session,
  typography,
  expanded,
  onToggle,
  onEditPress,
  onAddNote,
  onAddMaterial,
  onPressAttachment,
}: SessionCardProps) {
  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${expanded ? 'Collapse' : 'Expand'} session ${session.dateLabel}`}
        accessibilityState={{ expanded }}
        onPress={onToggle}
        style={styles.headerPressable}
      >
        <View style={styles.header}>
          <View style={styles.leading}>
            <View style={styles.datePad}>
              <Text style={[typography.bodyBold, { color: fg.primary }]}>{session.dateLabel}</Text>
            </View>
            <Text style={typography.sessionTimeRange}>{session.timeRangeLabel}</Text>
          </View>
          <View style={styles.trailing}>
            <Text style={[typography.metric, { textTransform: 'none' }]}>{session.durationLabel}</Text>
            <View style={expanded ? styles.chevronExpanded : undefined}>
              <JobDetailIconViewSessionChevron color={fg.secondary} />
            </View>
          </View>
        </View>
      </Pressable>

      {expanded ? (
        <View style={styles.panel}>
          <View style={styles.editRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Edit session"
              onPress={onEditPress}
              style={({ pressed }) => [styles.editPill, pressed && styles.pressed]}
            >
              <SessionCardEditPencilIcon color={color('Semantic/Status/Error/Text')} />
              <Text
                style={[
                  typography.bodySmall,
                  { color: color('Semantic/Status/Error/Text') },
                ]}
              >
                EDIT
              </Text>
            </Pressable>
          </View>

          <SessionAddToSessionTiles
            typography={typography}
            onAddNote={onAddNote}
            onAddMaterial={onAddMaterial}
          />

          <SessionAttachmentList
            typography={typography}
            attachments={session.attachments}
            onPressAttachment={onPressAttachment}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: bg.surfaceWhite,
    borderRadius: radius('Radius/16'),
    borderWidth: 1,
    borderColor: border.subtle,
    marginBottom: space('Spacing/8'),
    overflow: 'hidden',
  },
  headerPressable: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space('Spacing/16'),
    paddingVertical: space('Spacing/16'),
    minHeight: space('Spacing/80'),
  },
  leading: { flex: 1, minWidth: 0 },
  datePad: { paddingVertical: space('Spacing/4') },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space('Spacing/12'),
  },
  chevronExpanded: {
    transform: [{ rotate: '180deg' }],
  },

  panel: {
    borderTopWidth: 1,
    borderTopColor: colorWithAlpha('Foundation/Border/Default', 0.05),
    backgroundColor: colorWithAlpha('Foundation/Surface/Subtle', 0.3),
    paddingTop: space('Spacing/16'),
  },
  editRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: space('Spacing/16'),
  },
  editPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space('Spacing/8'),
    height: space('Spacing/24'),
    paddingHorizontal: space('Spacing/12'),
    paddingVertical: space('Spacing/4'),
    borderRadius: radius('Radius/Full'),
    backgroundColor: color('Semantic/Status/Error/BG'),
  },
  pressed: {
    opacity: 0.75,
  },
});
