import { expect, test } from '@playwright/test';

test('tracks a complete stop and exposes logs, dashboard, and export actions', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await expect(page.getByRole('heading', { name: 'MBSS Flow' })).toBeVisible();
  await page.getByRole('button', { name: /Start Stop/i }).click();
  await expect(page.getByRole('heading', { name: 'Facility A' })).toBeVisible();

  await page.getByRole('button', { name: /^Pt On Van$/i }).click();
  await expect(page.getByRole('heading', { name: 'Active study' })).toBeVisible();
  await page.getByRole('button', { name: /Pt Leaves Van/i }).click();
  await page.getByRole('button', { name: /Documentation Complete/i }).click();
  await page.getByRole('button', { name: /Finish Stop/i }).click();

  await page.getByRole('button', { name: /Logs/i }).click();
  await expect(page.getByText(/Stop #1/)).toBeVisible();
  await expect(page.getByText('Study 1')).toBeVisible();

  await page.getByRole('button', { name: /Dashboard/i }).click();
  await expect(page.getByText('Selected day')).toBeVisible();
  await expect(page.getByText('Bottleneck Breakdown')).toBeVisible();

  await page.getByRole('button', { name: /Export/i }).click();
  await expect(page.getByRole('button', { name: /Export stops.csv/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Export studies.csv/i })).toBeVisible();
});

test('keeps active facility labels editable and persistent across reloads', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.getByLabel('Facility label').fill('North Clinic');
  await page.getByRole('button', { name: /Start Stop/i }).click();
  await expect(page.getByRole('heading', { name: 'North Clinic' })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { name: 'North Clinic' })).toBeVisible();

  await page.getByLabel('Active facility label').fill('South Clinic');
  await page.getByRole('button', { name: /Save Facility/i }).click();
  await expect(page.getByRole('heading', { name: 'South Clinic' })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { name: 'South Clinic' })).toBeVisible();

  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('mbss-efficiency-tracker-data') ?? '{}'));
  expect(saved.stops[0].facilityLabel).toBe('South Clinic');
  expect(saved.settings.defaultFacilityLabels).toContain('North Clinic');
  expect(saved.settings.defaultFacilityLabels).toContain('South Clinic');
});

test('captures study delay details before Pt On Van without closing the stop', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.getByRole('button', { name: /Start Stop/i }).click();
  await expect(page.getByRole('heading', { name: 'Study details' })).toBeVisible();

  await page.getByLabel('Delay reason').selectOption('Waiting on patient');
  await page.getByLabel('Study notes').fill('Running behind at facility');
  await page.getByRole('button', { name: /Save Details/i }).click();

  let saved = await page.evaluate(() => JSON.parse(localStorage.getItem('mbss-efficiency-tracker-data') ?? '{}'));
  expect(saved.studies).toHaveLength(1);
  expect(saved.studies[0].delayReason).toBe('Waiting on patient');
  expect(saved.studies[0].notes).toBe('Running behind at facility');
  expect(saved.studies[0].patientOnVanAt).toBeUndefined();

  await expect(page.getByRole('button', { name: /^Pt On Van$/i })).toBeVisible();
  await page.getByRole('button', { name: /^Pt On Van$/i }).click();

  saved = await page.evaluate(() => JSON.parse(localStorage.getItem('mbss-efficiency-tracker-data') ?? '{}'));
  expect(saved.studies).toHaveLength(1);
  expect(saved.studies[0].delayReason).toBe('Waiting on patient');
  expect(saved.studies[0].notes).toBe('Running behind at facility');
  expect(saved.studies[0].patientOnVanAt).toBeTruthy();
});

test('shows selected-date dashboard averages from the saved dated log', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem(
      'mbss-efficiency-tracker-data',
      JSON.stringify({
        schemaVersion: 1,
        stops: [
          {
            id: 'stop-day-1',
            date: '2026-06-12',
            stopNumber: 1,
            facilityLabel: 'Facility A',
            parkedAt: '2026-06-12T13:00:00.000Z',
            completedAt: '2026-06-12T13:50:00.000Z',
            createdAt: '2026-06-12T13:00:00.000Z',
            updatedAt: '2026-06-12T13:50:00.000Z',
          },
          {
            id: 'stop-day-2',
            date: '2026-06-13',
            stopNumber: 1,
            facilityLabel: 'Facility B',
            parkedAt: '2026-06-13T13:00:00.000Z',
            completedAt: '2026-06-13T14:30:00.000Z',
            createdAt: '2026-06-13T13:00:00.000Z',
            updatedAt: '2026-06-13T14:30:00.000Z',
          },
        ],
        studies: [
          {
            id: 'study-day-1',
            stopId: 'stop-day-1',
            date: '2026-06-12',
            sequenceNumber: 1,
            label: 'Study 1',
            patientOnVanAt: '2026-06-12T13:10:00.000Z',
            patientLeavesVanAt: '2026-06-12T13:30:00.000Z',
            documentationCompleteAt: '2026-06-12T13:50:00.000Z',
            delayReason: 'None',
            createdAt: '2026-06-12T13:10:00.000Z',
            updatedAt: '2026-06-12T13:50:00.000Z',
          },
          {
            id: 'study-day-2',
            stopId: 'stop-day-2',
            date: '2026-06-13',
            sequenceNumber: 1,
            label: 'Study 1',
            patientOnVanAt: '2026-06-13T13:30:00.000Z',
            patientLeavesVanAt: '2026-06-13T14:00:00.000Z',
            documentationCompleteAt: '2026-06-13T14:30:00.000Z',
            delayReason: 'Waiting on patient',
            createdAt: '2026-06-13T13:30:00.000Z',
            updatedAt: '2026-06-13T14:30:00.000Z',
          },
        ],
        settings: {
          defaultFacilityLabels: ['Facility A', 'Facility B', 'Facility C'],
          useFacilityAliases: true,
        },
      }),
    );
  });
  await page.reload();

  await page.getByRole('button', { name: /Dashboard/i }).click();
  await page.getByLabel('Dashboard date').fill('2026-06-12');
  await expect(page.getByText('Fri, Jun 12')).toBeVisible();
  await expect(page.getByText('20 min').first()).toBeVisible();
  await expect(page.getByText('None').first()).toBeVisible();

  await page.getByLabel('Dashboard date').fill('2026-06-13');
  await expect(page.getByText('Sat, Jun 13')).toBeVisible();
  await expect(page.getByText('30 min').first()).toBeVisible();
  await expect(page.getByText('Waiting on patient').first()).toBeVisible();
});

test('edits finished log stop and study timestamps without reopening the stop', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem(
      'mbss-efficiency-tracker-data',
      JSON.stringify({
        schemaVersion: 1,
        stops: [
          {
            id: 'stop-log-1',
            date: '2026-06-12',
            stopNumber: 1,
            facilityLabel: 'Facility A',
            parkedAt: '2026-06-12T13:00:00.000Z',
            completedAt: '2026-06-12T13:45:00.000Z',
            createdAt: '2026-06-12T13:00:00.000Z',
            updatedAt: '2026-06-12T13:45:00.000Z',
          },
        ],
        studies: [
          {
            id: 'study-log-1',
            stopId: 'stop-log-1',
            date: '2026-06-12',
            sequenceNumber: 1,
            label: 'Study 1',
            patientOnVanAt: '2026-06-12T13:10:00.000Z',
            patientLeavesVanAt: '2026-06-12T13:30:00.000Z',
            documentationCompleteAt: '2026-06-12T13:45:00.000Z',
            delayReason: 'None',
            createdAt: '2026-06-12T13:10:00.000Z',
            updatedAt: '2026-06-12T13:45:00.000Z',
          },
        ],
        settings: {
          defaultFacilityLabels: ['Facility A', 'Facility B', 'Facility C'],
          useFacilityAliases: true,
        },
      }),
    );
  });
  await page.reload();

  await page.getByRole('button', { name: /Logs/i }).click();
  await expect(page.getByText('Finished')).toBeVisible();

  await page.getByRole('button', { name: /Edit Stop/i }).click();
  await page.getByLabel('Facility label').fill('Facility B');
  await page.getByRole('button', { name: /Save stop/i }).click();
  await expect(page.getByText(/Stop #1.*Facility B/)).toBeVisible();
  await expect(page.getByText('Finished')).toBeVisible();

  await page.getByRole('button', { name: /Edit Study/i }).click();
  await page.getByLabel('Documentation Complete').fill('2026-06-12T08:05');
  await page.getByRole('button', { name: /Save study/i }).click();
  await expect(page.getByText('Documentation Complete cannot be before Pt Leaves Van.')).toBeVisible();

  await page.getByLabel('Pt Leaves Van').fill('2026-06-12T08:15');
  await page.getByLabel('Pt On Van').fill('2026-06-13T08:05');
  await page.getByLabel('Pt Leaves Van').fill('2026-06-13T08:15');
  await page.getByLabel('Documentation Complete').fill('2026-06-13T08:35');
  await page.getByRole('button', { name: /Save study/i }).click();

  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('mbss-efficiency-tracker-data') ?? '{}'));
  expect(saved.stops[0].facilityLabel).toBe('Facility B');
  expect(saved.stops[0].completedAt).toBeTruthy();
  expect(saved.studies[0].date).toBe('2026-06-13');
  expect(saved.studies[0].patientLeavesVanAt).toBeTruthy();
  expect(saved.studies[0].documentationCompleteAt).toBeTruthy();
  expect(new Date(saved.studies[0].documentationCompleteAt).getTime()).toBeGreaterThan(
    new Date(saved.studies[0].patientLeavesVanAt).getTime(),
  );
});
