export const SCHEMA_VERSION = 1;

export type Complexity = 'Easy' | 'Average' | 'Hard';

export type Stop = {
  id: string;
  date: string;
  stopNumber: number;
  facilityLabel: string;
  parkedAt: string;
  completedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  sampleTag?: string;
};

export type Study = {
  id: string;
  stopId: string;
  date: string;
  sequenceNumber: number;
  label: string;
  patientOnVanAt?: string;
  patientLeavesVanAt?: string;
  documentationCompleteAt?: string;
  complexity?: Complexity;
  delayReason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  sampleTag?: string;
};

export type Settings = {
  defaultFacilityLabels: string[];
  useFacilityAliases: boolean;
};

export type AppData = {
  schemaVersion: number;
  stops: Stop[];
  studies: Study[];
  settings: Settings;
};

export type StudyMetrics = {
  studyDurationMin: number | null;
  documentationDurationMin: number | null;
  totalPatientCycleMin: number | null;
  interStudyGapMin: number | null;
};

export type StopMetrics = {
  firstPatientOnVanAt: string | null;
  lastDocumentationCompleteAt: string | null;
  studyCount: number;
  completedStudyCount: number;
  loadDelayMin: number | null;
  totalStopMin: number | null;
  minutesPerStudy: number | null;
  averageStudyDurationMin: number | null;
  averageDocumentationDurationMin: number | null;
  averagePatientCycleMin: number | null;
  averageInterStudyGapMin: number | null;
};

export type ViewKey = 'today' | 'logs' | 'dashboard' | 'export';
