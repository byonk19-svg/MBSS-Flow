import { deriveStopMetrics, deriveStudyMetrics, studiesForStop } from './metrics';
import type { AppData } from './types';

function escapeCsv(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function toCsv(
  headers: string[],
  rows: Array<Record<string, string | number | null | undefined>>,
): string {
  if (rows.length === 0) return `${headers.join(',')}\n`;
  const body = rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(','));
  return [headers.join(','), ...body].join('\n');
}

export function buildStopsCsv(data: AppData): string {
  return toCsv(
    [
      'Date',
      'Stop #',
      'Facility label',
      'Parked time',
      'First Pt On Van',
      'Last Documentation Complete',
      '# Studies',
      'Load Delay Min',
      'Total Stop Min',
      'Min Per Study',
    ],
    data.stops.map((stop) => {
      const metrics = deriveStopMetrics(stop, studiesForStop(data, stop.id));
      return {
        Date: stop.date,
        'Stop #': stop.stopNumber,
        'Facility label': stop.facilityLabel,
        'Parked time': stop.parkedAt,
        'First Pt On Van': metrics.firstPatientOnVanAt,
        'Last Documentation Complete': metrics.lastDocumentationCompleteAt,
        '# Studies': metrics.studyCount,
        'Load Delay Min': metrics.loadDelayMin,
        'Total Stop Min': metrics.totalStopMin,
        'Min Per Study': metrics.minutesPerStudy,
      };
    }),
  );
}

export function buildStudiesCsv(data: AppData): string {
  return toCsv(
    [
      'Date',
      'Stop #',
      'Facility label',
      'Study label',
      'Pt On Van',
      'Pt Leaves Van',
      'Documentation Complete',
      'Study Min',
      'Documentation Min',
      'Total Patient Cycle Min',
      'Inter-study Gap Min',
      'Complexity',
      'Delay Reason',
    ],
    data.studies.map((study) => {
      const stop = data.stops.find((candidate) => candidate.id === study.stopId);
      const siblings = stop ? studiesForStop(data, stop.id) : [];
      const nextStudy = siblings.find((candidate) => candidate.sequenceNumber === study.sequenceNumber + 1);
      const metrics = deriveStudyMetrics(study, nextStudy);
      return {
        Date: study.date,
        'Stop #': stop?.stopNumber,
        'Facility label': stop?.facilityLabel,
        'Study label': study.label,
        'Pt On Van': study.patientOnVanAt,
        'Pt Leaves Van': study.patientLeavesVanAt,
        'Documentation Complete': study.documentationCompleteAt,
        'Study Min': metrics.studyDurationMin,
        'Documentation Min': metrics.documentationDurationMin,
        'Total Patient Cycle Min': metrics.totalPatientCycleMin,
        'Inter-study Gap Min': metrics.interStudyGapMin,
        Complexity: study.complexity,
        'Delay Reason': study.delayReason,
      };
    }),
  );
}

export function downloadTextFile(filename: string, contents: string, type: string): void {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
