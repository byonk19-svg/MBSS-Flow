import { formatDateKey } from './date';
import type { AppData, Stop, Study } from './types';

function at(dateKey: string, hour: number, minute: number): string {
  return new Date(`${dateKey}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`).toISOString();
}

export function createSampleData(base: AppData): AppData {
  const today = formatDateKey();
  const yesterday = formatDateKey(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const sampleTag = `sample-${Date.now()}`;
  const stops: Stop[] = [
    {
      id: `${sampleTag}-stop-1`,
      date: today,
      stopNumber: base.stops.filter((stop) => stop.date === today).length + 1,
      facilityLabel: 'Facility A',
      parkedAt: at(today, 8, 12),
      completedAt: at(today, 9, 54),
      notes: '',
      createdAt: at(today, 8, 12),
      updatedAt: at(today, 9, 54),
      sampleTag,
    },
    {
      id: `${sampleTag}-stop-2`,
      date: yesterday,
      stopNumber: 1,
      facilityLabel: 'Facility B',
      parkedAt: at(yesterday, 10, 5),
      completedAt: at(yesterday, 11, 28),
      notes: '',
      createdAt: at(yesterday, 10, 5),
      updatedAt: at(yesterday, 11, 28),
      sampleTag,
    },
  ];
  const studies: Study[] = [
    {
      id: `${sampleTag}-study-1`,
      stopId: stops[0].id,
      date: today,
      sequenceNumber: 1,
      label: 'Study 1',
      patientOnVanAt: at(today, 8, 28),
      patientLeavesVanAt: at(today, 8, 48),
      documentationCompleteAt: at(today, 9, 4),
      complexity: 'Average',
      delayReason: 'Waiting on transport',
      createdAt: at(today, 8, 28),
      updatedAt: at(today, 9, 4),
      sampleTag,
    },
    {
      id: `${sampleTag}-study-2`,
      stopId: stops[0].id,
      date: today,
      sequenceNumber: 2,
      label: 'Study 2',
      patientOnVanAt: at(today, 9, 18),
      patientLeavesVanAt: at(today, 9, 40),
      documentationCompleteAt: at(today, 9, 54),
      complexity: 'Hard',
      delayReason: 'Positioning/mobility issue',
      createdAt: at(today, 9, 18),
      updatedAt: at(today, 9, 54),
      sampleTag,
    },
    {
      id: `${sampleTag}-study-3`,
      stopId: stops[1].id,
      date: yesterday,
      sequenceNumber: 1,
      label: 'Study 1',
      patientOnVanAt: at(yesterday, 10, 14),
      patientLeavesVanAt: at(yesterday, 10, 36),
      documentationCompleteAt: at(yesterday, 10, 50),
      complexity: 'Easy',
      delayReason: 'None',
      createdAt: at(yesterday, 10, 14),
      updatedAt: at(yesterday, 10, 50),
      sampleTag,
    },
    {
      id: `${sampleTag}-study-4`,
      stopId: stops[1].id,
      date: yesterday,
      sequenceNumber: 2,
      label: 'Study 2',
      patientOnVanAt: at(yesterday, 11, 3),
      patientLeavesVanAt: at(yesterday, 11, 17),
      documentationCompleteAt: at(yesterday, 11, 28),
      complexity: 'Average',
      delayReason: 'Documentation backlog',
      createdAt: at(yesterday, 11, 3),
      updatedAt: at(yesterday, 11, 28),
      sampleTag,
    },
  ];

  return {
    ...base,
    stops: [...base.stops, ...stops],
    studies: [...base.studies, ...studies],
  };
}
