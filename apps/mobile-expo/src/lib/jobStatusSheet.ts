import type { JobDetailWorkStatus } from '@fieldsolo/shared-types';

import { JOB_DETAIL_WORK_STATUS_LABEL } from '../components/ds/JobDetailStatusPill';
import type { DropdownBottomSheetOption } from '../components/ds/DropdownBottomSheet';

export const JOB_STATUS_SHEET_ORDER = [
  'notStarted',
  'inProgress',
  'completed',
  'paid',
  'onHold',
  'cancelled',
] as const satisfies readonly JobDetailWorkStatus[];

export function buildJobStatusSheetOptions(): DropdownBottomSheetOption[] {
  return JOB_STATUS_SHEET_ORDER.map((value) => ({
    id: value,
    value,
    label: JOB_DETAIL_WORK_STATUS_LABEL[value],
  }));
}

export function isJobDetailWorkStatus(value: string): value is JobDetailWorkStatus {
  return (JOB_STATUS_SHEET_ORDER as readonly string[]).includes(value);
}
