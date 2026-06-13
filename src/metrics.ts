import type { AppData, Stop, StopMetrics, Study, StudyMetrics } from './types';

function parseIso(value?: string | null): number | null {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

export function minutesBetween(start?: string | null, end?: string | null): number | null {
  const startMs = parseIso(start);
  const endMs = parseIso(end);
  if (startMs === null || endMs === null || endMs < startMs) return null;
  return (endMs - startMs) / 60_000;
}

function average(values: Array<number | null>): number | null {
  const complete = values.filter((value): value is number => value !== null && Number.isFinite(value));
  if (complete.length === 0) return null;
  return complete.reduce((total, value) => total + value, 0) / complete.length;
}

export function sortStops(stops: Stop[]): Stop[] {
  return [...stops].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return b.stopNumber - a.stopNumber;
  });
}

export function sortStudies(studies: Study[]): Study[] {
  return [...studies].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    if (a.stopId !== b.stopId) return a.stopId.localeCompare(b.stopId);
    return a.sequenceNumber - b.sequenceNumber;
  });
}

export function studiesForStop(data: AppData, stopId: string): Study[] {
  return sortStudies(data.studies.filter((study) => study.stopId === stopId));
}

export function deriveStudyMetrics(study: Study, nextStudy?: Study): StudyMetrics {
  return {
    studyDurationMin: minutesBetween(study.patientOnVanAt, study.patientLeavesVanAt),
    documentationDurationMin: minutesBetween(study.patientLeavesVanAt, study.documentationCompleteAt),
    totalPatientCycleMin: minutesBetween(study.patientOnVanAt, study.documentationCompleteAt),
    interStudyGapMin: minutesBetween(study.documentationCompleteAt, nextStudy?.patientOnVanAt),
  };
}

export function deriveStopMetrics(stop: Stop, studies: Study[]): StopMetrics {
  const ordered = sortStudies(studies);
  const firstPatientOnVanAt =
    ordered
      .map((study) => study.patientOnVanAt)
      .filter((value): value is string => Boolean(value))
      .sort()[0] ?? null;
  const lastDocumentationCompleteAt =
    ordered
      .map((study) => study.documentationCompleteAt)
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1) ?? null;
  const studyMetrics = ordered.map((study, index) => deriveStudyMetrics(study, ordered[index + 1]));
  const completedStudyCount = ordered.filter((study) => Boolean(study.documentationCompleteAt)).length;
  const totalStopMin = minutesBetween(stop.parkedAt, lastDocumentationCompleteAt);

  return {
    firstPatientOnVanAt,
    lastDocumentationCompleteAt,
    studyCount: ordered.length,
    completedStudyCount,
    loadDelayMin: minutesBetween(stop.parkedAt, firstPatientOnVanAt),
    totalStopMin,
    minutesPerStudy:
      totalStopMin !== null && completedStudyCount > 0 ? totalStopMin / completedStudyCount : null,
    averageStudyDurationMin: average(studyMetrics.map((metric) => metric.studyDurationMin)),
    averageDocumentationDurationMin: average(
      studyMetrics.map((metric) => metric.documentationDurationMin),
    ),
    averagePatientCycleMin: average(studyMetrics.map((metric) => metric.totalPatientCycleMin)),
    averageInterStudyGapMin: average(studyMetrics.map((metric) => metric.interStudyGapMin)),
  };
}

export function activeStop(data: AppData): Stop | null {
  return (
    [...data.stops]
      .filter((stop) => !stop.completedAt)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null
  );
}

export function activeStudy(data: AppData, stopId: string): Study | null {
  return (
    studiesForStop(data, stopId)
      .filter((study) => !study.documentationCompleteAt)
      .sort((a, b) => b.sequenceNumber - a.sequenceNumber)[0] ?? null
  );
}

export function validateStudyTimeline(study: Study): string[] {
  const errors: string[] = [];
  if (study.patientLeavesVanAt && !study.patientOnVanAt) {
    errors.push('Pt Leaves Van requires Pt On Van first.');
  }
  if (study.documentationCompleteAt && !study.patientLeavesVanAt) {
    errors.push('Documentation Complete requires Pt Leaves Van first.');
  }
  if (minutesBetween(study.patientOnVanAt, study.patientLeavesVanAt) === null && study.patientLeavesVanAt) {
    errors.push('Pt Leaves Van cannot be before Pt On Van.');
  }
  if (
    minutesBetween(study.patientLeavesVanAt, study.documentationCompleteAt) === null &&
    study.documentationCompleteAt
  ) {
    errors.push('Documentation Complete cannot be before Pt Leaves Van.');
  }
  return errors;
}

export function validateStopTimeline(stop: Stop, studies: Study[]): string[] {
  const errors: string[] = [];
  const metrics = deriveStopMetrics(stop, studies);
  if (metrics.firstPatientOnVanAt && minutesBetween(stop.parkedAt, metrics.firstPatientOnVanAt) === null) {
    errors.push('Parked time cannot be after first Pt On Van.');
  }
  if (stop.completedAt && studies.some((study) => !study.documentationCompleteAt)) {
    errors.push('A stop cannot be finished while a study is still incomplete.');
  }
  return errors;
}
