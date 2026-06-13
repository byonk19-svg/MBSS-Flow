import { describe, expect, it } from 'vitest';
import { sanitizeAppData } from './storage';

describe('sanitizeAppData', () => {
  it('drops studies whose stop is missing during restore', () => {
    const restored = sanitizeAppData({
      schemaVersion: 99,
      stops: [],
      studies: [
        {
          id: 'study-1',
          stopId: 'missing',
          date: '2026-06-12',
          sequenceNumber: 1,
          label: 'Study 1',
          createdAt: '2026-06-12T13:00:00.000Z',
          updatedAt: '2026-06-12T13:00:00.000Z',
        },
      ],
      settings: {},
    });

    expect(restored.studies).toEqual([]);
    expect(restored.schemaVersion).toBe(1);
  });
});
