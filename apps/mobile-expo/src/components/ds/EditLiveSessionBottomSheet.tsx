import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { color, radius, space } from '@fieldsolo/design-system/lib/tokens';

import { bg, border, fg } from '../../theme/nativeTokens';
import type { TextStyles } from '../../theme/nativeTokens';
import {
  SessionEditClockIcon,
  SessionSheetBackIcon,
} from '../figma-icons/JobDetailScreenIcons';
import { BottomSheetShell } from './BottomSheetShell';
import { SheetPrimaryDeleteActions } from './SheetPrimaryDeleteActions';

export type EditLiveSessionSavePayload =
  | {
      kind: 'updateStart';
      /** ISO 8601 — new started_at; live counter resets from here. */
      startedAt: string;
    }
  | {
      kind: 'endSession';
      /** ISO 8601 — new started_at (may be unchanged). */
      startedAt: string;
      /** ISO 8601 — user-provided end time; ends the session immediately. */
      endedAt: string;
    };

type EditLiveSessionBottomSheetProps = {
  typography: TextStyles;
  visible: boolean;
  /** Current started_at (ISO 8601). Sheet seeds its date+time fields from this. */
  startedAt: string;
  onClose?: () => void;
  onClosed?: () => void;
  /** Back arrow — returns to LiveSessionBottomSheet without saving. */
  onBack?: () => void;
  /** Save button — branches on whether the user supplied an end time. */
  onSavePress?: (payload: EditLiveSessionSavePayload) => void;
  /** Trash icon — deletes the live session and returns to job detail. */
  onDeletePress?: () => void;
};

type PickerKind = 'date' | 'startTime' | 'endTime';

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function combineDateAndTime(dateSource: Date, timeSource: Date): Date {
  const out = new Date(dateSource);
  out.setHours(timeSource.getHours(), timeSource.getMinutes(), 0, 0);
  return out;
}

const dateFmt = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Matches Figma label `02 : 00 PM` (spaces around the colon). */
function formatTimeLabel(d: Date): string {
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const period = hours >= 12 ? 'PM' : 'AM';
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  const mm = minutes.toString().padStart(2, '0');
  const hh = h12.toString().padStart(2, '0');
  return `${hh} : ${mm} ${period}`;
}

/**
 * Edit Live Session sheet (Figma `1897:3757` — "Edit Live Session").
 *
 * Differs from `EditSessionBottomSheet` in two important ways:
 *   1. `End Time` is OPTIONAL and starts EMPTY, with placeholder
 *      "Editing will End Live Session". If the user picks an end time and
 *      saves, the session ends immediately (`onSavePress` returns
 *      `{ kind: 'endSession' }`).
 *   2. Otherwise saving is a partial update — only date + start time —
 *      and the parent should reset the live counter from the new start
 *      (`onSavePress` returns `{ kind: 'updateStart' }`).
 *
 * The trash icon hard-deletes the live session row (parent navigates back
 * to the job detail page). Tapping the scrim or swiping down minimizes the
 * live session WITHOUT saving the edit fields — that wiring lives in the
 * parent `onClose` handler.
 */
export function EditLiveSessionBottomSheet({
  typography,
  visible,
  startedAt,
  onClose,
  onClosed,
  onBack,
  onSavePress,
  onDeletePress,
}: EditLiveSessionBottomSheetProps) {
  const initialDate = useMemo(
    () => startOfDay(new Date(startedAt)),
    [startedAt],
  );
  const initialStart = useMemo(() => new Date(startedAt), [startedAt]);

  const [date, setDate] = useState<Date>(initialDate);
  const [startTime, setStartTime] = useState<Date>(initialStart);
  /** Null until the user explicitly picks an end time. */
  const [endTime, setEndTime] = useState<Date | null>(null);
  /** iOS spinner seed for optional end time; opening the picker alone is not a selection. */
  const [iosDraftEndTime, setIosDraftEndTime] = useState<Date | null>(null);
  const [iosPicker, setIosPicker] = useState<PickerKind | null>(null);

  // Re-seed every time the sheet opens so reopening after a minimize→edit
  // cycle reflects any start-time change made elsewhere.
  useEffect(() => {
    if (!visible) return;
    setDate(initialDate);
    setStartTime(initialStart);
    setEndTime(null);
    setIosDraftEndTime(null);
    setIosPicker(null);
  }, [initialDate, initialStart, visible]);

  const applyPick = useCallback((kind: PickerKind, picked: Date) => {
    if (kind === 'date') {
      setDate(startOfDay(picked));
    } else if (kind === 'startTime') {
      setStartTime(picked);
    } else {
      setEndTime(picked);
    }
  }, []);

  const openPicker = useCallback(
    (kind: PickerKind) => {
      const fallback = kind === 'endTime' ? new Date() : startTime;
      const current =
        kind === 'date'
          ? date
          : kind === 'startTime'
            ? startTime
            : (endTime ?? iosDraftEndTime ?? fallback);
      if (Platform.OS === 'android') {
        DateTimePickerAndroid.open({
          value: current,
          mode: kind === 'date' ? 'date' : 'time',
          is24Hour: false,
          onChange: (event: DateTimePickerEvent, selectedDate?: Date) => {
            if (event.type === 'dismissed' || !selectedDate) return;
            applyPick(kind, selectedDate);
          },
        });
        return;
      }
      // On iOS, opening end-time without a value should seed the picker
      // with `now` so the spinner has something to land on. Keep that seed
      // separate from `endTime`; merely opening the picker must not turn a
      // start-time-only save into "end this session".
      if (kind === 'endTime') setIosDraftEndTime(current);
      setIosPicker((prev) => (prev === kind ? null : kind));
    },
    [applyPick, date, endTime, iosDraftEndTime, startTime],
  );

  const handleIosChange = useCallback(
    (_event: DateTimePickerEvent, selectedDate?: Date) => {
      if (!iosPicker || !selectedDate) return;
      if (iosPicker === 'endTime') {
        setIosDraftEndTime(selectedDate);
        setEndTime(selectedDate);
        return;
      }
      applyPick(iosPicker, selectedDate);
    },
    [applyPick, iosPicker],
  );

  const handleSave = useCallback(() => {
    const startedAtIso = combineDateAndTime(date, startTime).toISOString();
    if (endTime) {
      const endedAtIso = combineDateAndTime(date, endTime).toISOString();
      onSavePress?.({ kind: 'endSession', startedAt: startedAtIso, endedAt: endedAtIso });
      return;
    }
    onSavePress?.({ kind: 'updateStart', startedAt: startedAtIso });
  }, [date, endTime, onSavePress, startTime]);

  const iosValue =
    iosPicker === 'date'
      ? date
      : iosPicker === 'startTime'
        ? startTime
        : iosPicker === 'endTime'
          ? (iosDraftEndTime ?? endTime ?? new Date())
          : null;

  return (
    <BottomSheetShell
      visible={visible}
      onClose={onClose}
      onClosed={onClosed}
      // See LiveSessionBottomSheet — Live Session sheets opt out of the
      // global stack registry so the floating bar isn't lifted above its
      // own parent sheet.
      registerInGlobalStack={false}
    >
      <View style={styles.body}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={onBack ?? onClose}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          <SessionSheetBackIcon color={fg.secondary} />
          <Text style={[typography.bodyBold, { color: fg.secondary }]}>Back</Text>
        </Pressable>

        <View style={styles.header}>
          <SessionEditClockIcon color={color('Semantic/Status/Error/Text')} />
          <Text style={[typography.titleH3, { color: fg.primary }]} numberOfLines={1}>
            Edit Live Session
          </Text>
        </View>

        <View style={styles.fields}>
          <FieldShell
            typography={typography}
            value={dateFmt.format(date)}
            active={iosPicker === 'date'}
            onPress={() => openPicker('date')}
            accessibilityLabel="Session date"
          />
          <Text style={[typography.bodySmall, styles.fieldLabel]}>Start Time</Text>
          <FieldShell
            typography={typography}
            value={formatTimeLabel(startTime)}
            active={iosPicker === 'startTime'}
            onPress={() => openPicker('startTime')}
            accessibilityLabel="Start time"
          />
          <Text style={[typography.bodySmall, styles.fieldLabel]}>End Time</Text>
          <FieldShell
            typography={typography}
            // Per spec: end time is optional, placeholder reads
            // "Editing will End Live Session" until the user picks one.
            value={endTime ? formatTimeLabel(endTime) : 'Editing will End Live Session'}
            placeholder={!endTime}
            active={iosPicker === 'endTime'}
            onPress={() => openPicker('endTime')}
            accessibilityLabel="End time (optional — saving with a value ends the session)"
          />
        </View>

        {Platform.OS === 'ios' && iosPicker && iosValue ? (
          <View style={styles.iosPickerWrap}>
            <DateTimePicker
              value={iosValue}
              mode={iosPicker === 'date' ? 'date' : 'time'}
              display="spinner"
              is24Hour={false}
              onChange={handleIosChange}
              textColor={fg.primary}
            />
            <View style={styles.iosPickerActions}>
              {iosPicker === 'endTime' && endTime ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear end time"
                  onPress={() => {
                    setEndTime(null);
                    setIosPicker(null);
                  }}
                  style={({ pressed }) => [styles.iosClear, pressed && styles.pressed]}
                >
                  <Text
                    style={[typography.bodyBold, { color: color('Semantic/Status/Error/Text') }]}
                  >
                    Clear
                  </Text>
                </Pressable>
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Done"
                onPress={() => setIosPicker(null)}
                style={({ pressed }) => [styles.iosDone, pressed && styles.pressed]}
              >
                <Text style={[typography.bodyBold, { color: color('Brand/Primary') }]}>
                  Done
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        <SheetPrimaryDeleteActions
          typography={typography}
          primaryLabel="SAVE CHANGES"
          onPrimaryPress={handleSave}
          onDeletePress={onDeletePress}
        />
      </View>
    </BottomSheetShell>
  );
}

type FieldShellProps = {
  typography: TextStyles;
  value: string;
  /** When true, the value renders in muted secondary text (placeholder state). */
  placeholder?: boolean;
  active: boolean;
  onPress: () => void;
  accessibilityLabel: string;
};

function FieldShell({
  typography,
  value,
  placeholder,
  active,
  onPress,
  accessibilityLabel,
}: FieldShellProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.fieldShell,
        active && styles.fieldShellActive,
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={[typography.body, { color: placeholder ? fg.secondary : fg.primary }]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: space('Spacing/12'),
    width: '100%',
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space('Spacing/4'),
    alignSelf: 'flex-start',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space('Spacing/12'),
  },
  fields: {
    gap: space('Spacing/8'),
    marginTop: space('Spacing/4'),
  },
  fieldLabel: {
    color: fg.secondary,
  },
  fieldShell: {
    minHeight: 38,
    borderWidth: 1,
    borderColor: border.subtle,
    borderRadius: 8,
    backgroundColor: bg.surfaceWhite,
    paddingHorizontal: 13,
    paddingVertical: 9,
    justifyContent: 'center',
  },
  fieldShellActive: {
    borderColor: color('Brand/Primary'),
  },
  iosPickerWrap: {
    marginTop: space('Spacing/8'),
    borderTopWidth: 1,
    borderTopColor: border.subtle,
  },
  iosPickerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: space('Spacing/8'),
  },
  iosClear: {
    paddingHorizontal: space('Spacing/12'),
    paddingVertical: space('Spacing/8'),
    borderRadius: radius('Radius/Full'),
  },
  iosDone: {
    paddingHorizontal: space('Spacing/12'),
    paddingVertical: space('Spacing/8'),
    borderRadius: radius('Radius/Full'),
  },
  pressed: {
    opacity: 0.75,
  },
});
