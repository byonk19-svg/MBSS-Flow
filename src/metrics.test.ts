import { describe, expect, it } from 'vitest';
import { deriveStopMetrics, deriveStudyMetrics, minutesBetween, validateStudyTimeline } from './metrics';
import type { Stop, Study } from './types';

const stop: Stop = {
  id: 'stop-1',
  date: '2026-06-12',
  stopNumber: 1,
  facilityLabel: 'Facility A',
  parkedAt: '2026-06-12T13:00:00.000Z',
  createdAt: '2026-06-12T13:00:00.000Z',
  updatedAt: '2026-06-12T13:00:00.000Z',
};

const studies: Study[] = [
  {
    id: 'study-1',
    stopId: 'stop-1',
    date: '2026-06-12',
    sequenceNumber: 1,
    label: 'Study 1',
    patientOnVanAt: '2026-06-12T13:15:00.000Z',
    patientLeavesVanAt: '2026-06-12T13:38:00.000Z',
    documentationCompleteAt: '2026-06-12T13:50:00.000Z',
    createdAt: '2026-06-12T13:15:00.000Z',
    updatedAt: '2026-06-12T13:50:00.000Z',
  },
  {
    id: 'study-2',
    stopId: 'stop-1',
    date: '2026-06-12',
    sequenceNumber: 2,
    label: 'Study 2',
    patientOnVanAt: '2026-06-12T14:05:00.000Z',
    patientLeavesVanAt: '2026-06-12T14:25:00.000Z',
    documentationCompleteAt: '2026-06-12T14:38:00.000Z',
    createdAt: '2026-06-12T14:05:00.000Z',
    updatedAt: '2026-06-12T14:38:00.000Z',
  },
];

describe('metrics', () => {
  it('calculates positive durations in minutes', () => {
    expect(minutesBetween('2026-06-12T13:00:00.000Z', '2026-06-12T13:12:30.000Z')).toBe(12.5);
  });

  it('returns null for missing or reversed timestamps', () => {
    expect(minutesBetween(undefined, '2026-06-12T13:00:00.000Z')).toBeNull();
    expect(minutesBetween('2026-06-12T13:10:00.000Z', '2026-06-12T13:00:00.000Z')).toBeNull();
  });

  it('derives study duration, documentation duration, patient cycle, and inter-study gap', () => {
    expect(deriveStudyMetrics(studies[0], studies[1])).toEqual({
      studyDurationMin: 23,
      documentationDurationMin: 12,
      totalPatientCycleMin: 35,
      interStudyGapMin: 15,
    });
  });

  it('derives stop-level load delay, stop total, and minutes per completed study', () => {
    expect(deriveStopMetrics(stop, studies)).toMatchObject({
      firstPatientOnVanAt: '2026-06-12T13:15:00.000Z',
      lastDocumentationCompleteAt: '2026-06-12T14:38:00.000Z',
      studyCount: 2,
      completedStudyCount: 2,
      loadDelayMin: 15,
      totalStopMin: 98,
      minutesPerStudy: 49,
      averageStudyDurationMin: 21.5,
      averageDocumentationDurationMin: 12.5,
      averagePatientCycleMin: 34,
      averageInterStudyGapMin: 15,
    });
  });

  it('keeps incomplete study metrics incomplete instead of guessing', () => {
    const incomplete = { ...studies[0], documentationCompleteAt: undefined };
    expect(deriveStudyMetrics(incomplete)).toMatchObject({
      studyDurationMin: 23,
      documentationDurationMin: null,
      totalPatientCycleMin: null,
    });
  });

  it('flags impossible study timelines', () => {
    const invalid = {
      ...studies[0],
      patientLeavesVanAt: '2026-06-12T13:10:00.000Z',
    };
    expect(validateStudyTimeline(invalid)).toContain('Pt Leaves Van cannot be before Pt On Van.');
  });
});
