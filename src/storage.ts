import { DEFAULT_DATA, STORAGE_KEY } from './constants';
import { SCHEMA_VERSION, type AppData, type Settings, type Stop, type Study } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function sanitizeStop(value: unknown): Stop | null {
  if (!isRecord(value)) return null;
  const id = readString(value.id);
  const date = readString(value.date);
  const stopNumber = readNumber(value.stopNumber);
  const facilityLabel = readString(value.facilityLabel);
  const parkedAt = readString(value.parkedAt);
  const createdAt = readString(value.createdAt);
  const updatedAt = readString(value.updatedAt);
  if (!id || !date || !stopNumber || !facilityLabel || !parkedAt || !createdAt || !updatedAt) return null;
  return {
    id,
    date,
    stopNumber,
    facilityLabel,
    parkedAt,
    completedAt: readString(value.completedAt),
    notes: readString(value.notes),
    createdAt,
    updatedAt,
    sampleTag: readString(value.sampleTag),
  };
}

function sanitizeStudy(value: unknown): Study | null {
  if (!isRecord(value)) return null;
  const id = readString(value.id);
  const stopId = readString(value.stopId);
  const date = readString(value.date);
  const sequenceNumber = readNumber(value.sequenceNumber);
  const label = readString(value.label);
  const createdAt = readString(value.createdAt);
  const updatedAt = readString(value.updatedAt);
  if (!id || !stopId || !date || !sequenceNumber || !label || !createdAt || !updatedAt) return null;
  return {
    id,
    stopId,
    date,
    sequenceNumber,
    label,
    patientOnVanAt: readString(value.patientOnVanAt),
    patientLeavesVanAt: readString(value.patientLeavesVanAt),
    documentationCompleteAt: readString(value.documentationCompleteAt),
    complexity:
      value.complexity === 'Easy' || value.complexity === 'Average' || value.complexity === 'Hard'
        ? value.complexity
        : undefined,
    delayReason: readString(value.delayReason),
    notes: readString(value.notes),
    createdAt,
    updatedAt,
    sampleTag: readString(value.sampleTag),
  };
}

function sanitizeSettings(value: unknown): Settings {
  if (!isRecord(value)) return DEFAULT_DATA.settings;
  const labels = Array.isArray(value.defaultFacilityLabels)
    ? value.defaultFacilityLabels.filter((label): label is string => typeof label === 'string')
    : DEFAULT_DATA.settings.defaultFacilityLabels;
  return {
    defaultFacilityLabels: labels.length > 0 ? labels : DEFAULT_DATA.settings.defaultFacilityLabels,
    useFacilityAliases:
      typeof value.useFacilityAliases === 'boolean'
        ? value.useFacilityAliases
        : DEFAULT_DATA.settings.useFacilityAliases,
  };
}

export function sanitizeAppData(value: unknown): AppData {
  if (!isRecord(value)) return DEFAULT_DATA;
  const sanitizedStops = Array.isArray(value.stops)
    ? value.stops.map(sanitizeStop).filter((stop): stop is Stop => stop !== null)
    : [];
  const activeStopIds = sanitizedStops
    .filter((stop) => !stop.completedAt)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((stop) => stop.id);
  const activeStopToKeep = activeStopIds[0];
  const stops = sanitizedStops.map((stop) =>
    !stop.completedAt && stop.id !== activeStopToKeep
      ? { ...stop, completedAt: stop.updatedAt, updatedAt: stop.updatedAt }
      : stop,
  );
  const stopIds = new Set(stops.map((stop) => stop.id));
  const studies = Array.isArray(value.studies)
    ? value.studies
        .map(sanitizeStudy)
        .filter((study): study is Study => study !== null && stopIds.has(study.stopId))
    : [];
  return {
    schemaVersion: SCHEMA_VERSION,
    stops,
    studies,
    settings: sanitizeSettings(value.settings),
  };
}

export function loadAppData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_DATA;
    return sanitizeAppData(JSON.parse(raw));
  } catch {
    return DEFAULT_DATA;
  }
}

export function saveAppData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, schemaVersion: SCHEMA_VERSION }));
}
