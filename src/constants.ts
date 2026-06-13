import type { AppData, Complexity } from './types';
import { SCHEMA_VERSION } from './types';

export const PHI_HELPER_TEXT =
  'Do not enter patient names, MRNs, DOBs, diagnoses, or other identifying details.';

export const DELAY_REASONS = [
  'None',
  'Waiting on patient',
  'Waiting on nursing/facility staff',
  'Waiting on transport',
  'Patient not ready',
  'Positioning/mobility issue',
  'Equipment/technical issue',
  'Documentation backlog',
  'Physician/team discussion',
  'Other',
] as const;

export const COMPLEXITIES: Complexity[] = ['Easy', 'Average', 'Hard'];

export const STORAGE_KEY = 'mbss-efficiency-tracker-data';

export const DEFAULT_DATA: AppData = {
  schemaVersion: SCHEMA_VERSION,
  stops: [],
  studies: [],
  settings: {
    defaultFacilityLabels: ['Facility A', 'Facility B', 'Facility C'],
    useFacilityAliases: true,
  },
};
