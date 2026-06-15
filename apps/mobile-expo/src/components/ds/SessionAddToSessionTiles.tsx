import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { color, radius, space } from '@fieldsolo/design-system/lib/tokens';

import { bg, border, fg } from '../../theme/nativeTokens';
import type { TextStyles } from '../../theme/nativeTokens';
import {
  SessionCaptureTileMaterialIcon,
  SessionCaptureTileNoteIcon,
  SessionCaptureTilePhotoIcon,
  SessionCaptureTileVoiceIcon,
} from '../figma-icons/JobDetailScreenIcons';

type TileKind = 'note' | 'material' | 'photo' | 'voice';

const TILE_LABEL: Record<TileKind, string> = {
  note: 'Note',
  material: 'Material',
  photo: 'Photo',
  voice: 'Voice',
};

function tileIcon(kind: TileKind, tint: string): ReactNode {
  const props = { color: tint };
  switch (kind) {
    case 'note':
      return <SessionCaptureTileNoteIcon {...props} />;
    case 'material':
      return <SessionCaptureTileMaterialIcon {...props} />;
    case 'photo':
      return <SessionCaptureTilePhotoIcon {...props} />;
    case 'voice':
      return <SessionCaptureTileVoiceIcon {...props} />;
  }
}

function tileTint(kind: TileKind): string {
  switch (kind) {
    case 'note':
      return color('Semantic/Activity/Note');
    case 'material':
      return color('Semantic/Activity/Material');
    case 'photo':
      return color('Semantic/Activity/Photo');
    case 'voice':
      return color('Semantic/Activity/Voice');
  }
}

export type SessionAddToSessionTilesProps = {
  typography: TextStyles;
  /** When set, Note tile is pressable. */
  onAddNote?: () => void;
  /** When set, Material tile is pressable. */
  onAddMaterial?: () => void;
};

/**
 * "Add to Session" heading + 4 capture tiles. Photo and Voice are never
 * pressable; Note and Material only when the corresponding callback is set.
 */
export function SessionAddToSessionTiles({
  typography,
  onAddNote,
  onAddMaterial,
}: SessionAddToSessionTilesProps) {
  return (
    <View style={styles.captureSection}>
      <Text style={[typography.bodySmall, { color: fg.primary }]}>Add to Session</Text>
      <View style={styles.tileRow}>
        {(['note', 'material', 'photo', 'voice'] as TileKind[]).map((kind) => {
          const interactive =
            (kind === 'note' && onAddNote) || (kind === 'material' && onAddMaterial);
          const inner = (
            <>
              {tileIcon(kind, tileTint(kind))}
              <Text style={[styles.tileLabel, { color: fg.primary }]}>{TILE_LABEL[kind]}</Text>
            </>
          );
          if (interactive) {
            return (
              <Pressable
                key={kind}
                accessibilityRole="button"
                accessibilityLabel={`Add ${TILE_LABEL[kind]}`}
                onPress={kind === 'note' ? onAddNote : onAddMaterial}
                style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
              >
                {inner}
              </Pressable>
            );
          }
          return (
            <View key={kind} style={styles.tile}>
              {inner}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  captureSection: {
    marginTop: space('Spacing/16'),
    paddingHorizontal: space('Spacing/16'),
    gap: space('Spacing/8'),
  },
  tileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space('Spacing/8'),
    flexWrap: 'wrap',
  },
  tile: {
    width: 73.75,
    height: 56,
    borderRadius: radius('Radius/12'),
    borderWidth: 1,
    borderColor: border.subtle,
    backgroundColor: bg.surfaceWhite,
    alignItems: 'center',
    paddingTop: 10,
    gap: 6,
  },
  tileLabel: {
    fontSize: 8.5,
    fontWeight: '700',
    lineHeight: 12,
  },
  pressed: { opacity: 0.75 },
});
