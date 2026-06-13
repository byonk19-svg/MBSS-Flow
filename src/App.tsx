import {
  Activity,
  BarChart3,
  Check,
  Clock,
  Download,
  FileText,
  Home,
  LockKeyhole,
  Pencil,
  Play,
  RotateCcw,
  SquareCheckBig,
  Trash2,
  Upload,
} from 'lucide-react';
import { useMemo, useState, type ChangeEvent, type Dispatch, type SetStateAction } from 'react';
import { COMPLEXITIES, DELAY_REASONS, DEFAULT_DATA, PHI_HELPER_TEXT } from './constants';
import { buildStopsCsv, buildStudiesCsv, downloadTextFile } from './csv';
import {
  formatClock,
  formatDateKey,
  formatDateLabel,
  formatMetric,
  fromDateTimeLocalValue,
  toDateTimeLocalValue,
} from './date';
import { createId } from './ids';
import {
  activeStop as findActiveStop,
  activeStudy as findActiveStudy,
  deriveStopMetrics,
  deriveStudyMetrics,
  sortStops,
  studiesForStop,
  validateStopTimeline,
  validateStudyTimeline,
} from './metrics';
import { createSampleData } from './sampleData';
import { sanitizeAppData } from './storage';
import type { AppData, Complexity, Stop, Study, ViewKey } from './types';
import { useAppData } from './useAppData';

const navItems: Array<{ key: ViewKey; label: string; icon: typeof Home }> = [
  { key: 'today', label: 'Today', icon: Home },
  { key: 'logs', label: 'Logs', icon: FileText },
  { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { key: 'export', label: 'Export', icon: Download },
];

function nowIso(): string {
  return new Date().toISOString();
}

function classNames(...values: Array<string | false | undefined>): string {
  return values.filter(Boolean).join(' ');
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat-tile">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <section className="empty-state">
      <Activity size={22} aria-hidden="true" />
      <h2>{title}</h2>
      <p>{body}</p>
    </section>
  );
}

function MetricList({ metrics }: { metrics: Array<[string, string | number]> }) {
  return (
    <div className="metric-list">
      {metrics.map(([label, value]) => (
        <div key={label} className="metric-row">
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}

type CorrectionDraft = {
  facilityLabel: string;
  parkedAt: string;
  stopNotes: string;
  patientOnVanAt: string;
  patientLeavesVanAt: string;
  documentationCompleteAt: string;
  complexity: '' | Complexity;
  delayReason: string;
  studyNotes: string;
};

function createCorrectionDraft(stop: Stop, study: Study | null): CorrectionDraft {
  return {
    facilityLabel: stop.facilityLabel,
    parkedAt: toDateTimeLocalValue(stop.parkedAt),
    stopNotes: stop.notes ?? '',
    patientOnVanAt: toDateTimeLocalValue(study?.patientOnVanAt),
    patientLeavesVanAt: toDateTimeLocalValue(study?.patientLeavesVanAt),
    documentationCompleteAt: toDateTimeLocalValue(study?.documentationCompleteAt),
    complexity: study?.complexity ?? '',
    delayReason: study?.delayReason ?? 'None',
    studyNotes: study?.notes ?? '',
  };
}

function CorrectionPanel({
  stop,
  study,
  data,
  onSave,
  onClose,
}: {
  stop: Stop;
  study: Study | null;
  data: AppData;
  onSave: (stop: Stop, study: Study | null) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<CorrectionDraft>(() => createCorrectionDraft(stop, study));
  const [errors, setErrors] = useState<string[]>([]);

  function update(field: keyof CorrectionDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function save() {
    const updatedStop: Stop = {
      ...stop,
      facilityLabel: draft.facilityLabel.trim() || 'Facility A',
      parkedAt: fromDateTimeLocalValue(draft.parkedAt) ?? stop.parkedAt,
      notes: draft.stopNotes,
      updatedAt: nowIso(),
    };
    const updatedStudy: Study | null = study
      ? {
          ...study,
          patientOnVanAt: fromDateTimeLocalValue(draft.patientOnVanAt),
          patientLeavesVanAt: fromDateTimeLocalValue(draft.patientLeavesVanAt),
          documentationCompleteAt: fromDateTimeLocalValue(draft.documentationCompleteAt),
          complexity: draft.complexity || undefined,
          delayReason: draft.delayReason || 'None',
          notes: draft.studyNotes,
          updatedAt: nowIso(),
        }
      : null;
    const siblingStudies = studiesForStop(data, stop.id).map((candidate) =>
      updatedStudy && candidate.id === updatedStudy.id ? updatedStudy : candidate,
    );
    const validationErrors = [
      ...(updatedStudy ? validateStudyTimeline(updatedStudy) : []),
      ...validateStopTimeline(updatedStop, siblingStudies),
    ];
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }
    onSave(updatedStop, updatedStudy);
    onClose();
  }

  return (
    <section className="panel correction-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Manual correction</p>
          <h2>Current timestamps</h2>
        </div>
        <button className="icon-button" type="button" onClick={onClose} aria-label="Close correction panel">
          <Check size={18} aria-hidden="true" />
        </button>
      </div>

      {errors.length > 0 ? (
        <div className="error-list" role="alert">
          {errors.map((error) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      ) : null}

      <div className="form-grid">
        <label>
          Facility label
          <input value={draft.facilityLabel} onChange={(event) => update('facilityLabel', event.target.value)} />
        </label>
        <label>
          Parked
          <input
            type="datetime-local"
            value={draft.parkedAt}
            onChange={(event) => update('parkedAt', event.target.value)}
          />
        </label>
      </div>
      <label className="stacked-field">
        Stop notes
        <textarea value={draft.stopNotes} onChange={(event) => update('stopNotes', event.target.value)} />
        <span>{PHI_HELPER_TEXT}</span>
      </label>

      {study ? (
        <>
          <div className="form-grid">
            <label>
              Pt On Van
              <input
                type="datetime-local"
                value={draft.patientOnVanAt}
                onChange={(event) => update('patientOnVanAt', event.target.value)}
              />
            </label>
            <label>
              Pt Leaves Van
              <input
                type="datetime-local"
                value={draft.patientLeavesVanAt}
                onChange={(event) => update('patientLeavesVanAt', event.target.value)}
              />
            </label>
            <label>
              Documentation Complete
              <input
                type="datetime-local"
                value={draft.documentationCompleteAt}
                onChange={(event) => update('documentationCompleteAt', event.target.value)}
              />
            </label>
            <label>
              Complexity
              <select value={draft.complexity} onChange={(event) => update('complexity', event.target.value)}>
                <option value="">Unselected</option>
                {COMPLEXITIES.map((complexity) => (
                  <option key={complexity} value={complexity}>
                    {complexity}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Delay reason
              <select value={draft.delayReason} onChange={(event) => update('delayReason', event.target.value)}>
                {DELAY_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="stacked-field">
            Study notes
            <textarea value={draft.studyNotes} onChange={(event) => update('studyNotes', event.target.value)} />
            <span>{PHI_HELPER_TEXT}</span>
          </label>
        </>
      ) : null}

      <button className="primary-action compact-action" type="button" onClick={save}>
        <Check size={20} aria-hidden="true" />
        Save correction
      </button>
    </section>
  );
}

function TodayView({
  data,
  setData,
}: {
  data: AppData;
  setData: Dispatch<SetStateAction<AppData>>;
}) {
  const [facilityLabel, setFacilityLabel] = useState(data.settings.defaultFacilityLabels[0] ?? 'Facility A');
  const [showCorrection, setShowCorrection] = useState(false);
  const todayKey = formatDateKey();
  const todayStops = data.stops.filter((stop) => stop.date === todayKey);
  const todayStudies = data.studies.filter((study) => study.date === todayKey);
  const currentStop = findActiveStop(data);
  const currentStudy = currentStop ? findActiveStudy(data, currentStop.id) : null;
  const currentStudies = currentStop ? studiesForStop(data, currentStop.id) : [];
  const latestStudy = currentStudies.at(-1) ?? null;
  const correctionStudy = currentStudy ?? latestStudy;
  const stopMetrics = currentStop ? deriveStopMetrics(currentStop, currentStudies) : null;
  const studyMetrics = correctionStudy ? deriveStudyMetrics(correctionStudy) : null;

  function startStop() {
    if (findActiveStop(data)) {
      alert('Finish or reopen the active stop before starting another stop.');
      return;
    }
    const now = nowIso();
    const date = formatDateKey(new Date(now));
    const stopNumber =
      Math.max(0, ...data.stops.filter((stop) => stop.date === date).map((stop) => stop.stopNumber)) + 1;
    const stop: Stop = {
      id: createId('stop'),
      date,
      stopNumber,
      facilityLabel: facilityLabel.trim() || 'Facility A',
      parkedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    setData((current) => ({ ...current, stops: [...current.stops, stop] }));
  }

  function startStudy() {
    if (!currentStop || currentStudy) return;
    const now = nowIso();
    const sequenceNumber = Math.max(0, ...currentStudies.map((study) => study.sequenceNumber)) + 1;
    const study: Study = {
      id: createId('study'),
      stopId: currentStop.id,
      date: currentStop.date,
      sequenceNumber,
      label: `Study ${sequenceNumber}`,
      patientOnVanAt: now,
      delayReason: 'None',
      createdAt: now,
      updatedAt: now,
    };
    setData((current) => ({ ...current, studies: [...current.studies, study] }));
  }

  function updateActiveStudy(patch: Partial<Study>) {
    if (!currentStudy) return;
    const updated = { ...currentStudy, ...patch, updatedAt: nowIso() };
    const errors = validateStudyTimeline(updated);
    if (errors.length > 0) {
      alert(errors.join('\n'));
      return;
    }
    setData((current) => ({
      ...current,
      studies: current.studies.map((study) => (study.id === currentStudy.id ? updated : study)),
    }));
  }

  function finishStop() {
    if (!currentStop) return;
    if (currentStudy) {
      alert('Complete or correct the active study before finishing this stop.');
      return;
    }
    if (!currentStudies.some((study) => study.documentationCompleteAt)) {
      alert('A stop needs at least one completed study before it can be finished.');
      return;
    }
    setData((current) => ({
      ...current,
      stops: current.stops.map((stop) =>
        stop.id === currentStop.id ? { ...stop, completedAt: nowIso(), updatedAt: nowIso() } : stop,
      ),
    }));
  }

  function cancelEmptyStop() {
    if (!currentStop || currentStudies.length > 0) return;
    if (!confirm('Delete this empty stop?')) return;
    setData((current) => ({
      ...current,
      stops: current.stops.filter((stop) => stop.id !== currentStop.id),
    }));
  }

  const nextAction = (() => {
    if (!currentStop) return { label: 'Start Stop', icon: Play, onClick: startStop };
    if (!currentStudy) return { label: 'Pt On Van', icon: Play, onClick: startStudy };
    if (!currentStudy.patientLeavesVanAt) {
      return { label: 'Pt Leaves Van', icon: SquareCheckBig, onClick: () => updateActiveStudy({ patientLeavesVanAt: nowIso() }) };
    }
    return {
      label: 'Documentation Complete',
      icon: Check,
      onClick: () => updateActiveStudy({ documentationCompleteAt: nowIso() }),
    };
  })();
  const NextIcon = nextAction.icon;

  function saveCorrection(updatedStop: Stop, updatedStudy: Study | null) {
    setData((current) => ({
      ...current,
      stops: current.stops.map((stop) => (stop.id === updatedStop.id ? updatedStop : stop)),
      studies: updatedStudy
        ? current.studies.map((study) => (study.id === updatedStudy.id ? updatedStudy : study))
        : current.studies,
    }));
  }

  return (
    <main className="screen">
      <section className="today-hero">
        <div>
          <p className="date-line">{formatDateLabel(todayKey)}</p>
          <h1>MBSS Flow</h1>
        </div>
        <div className="privacy-chip">
          <LockKeyhole size={15} aria-hidden="true" />
          Local only
        </div>
      </section>

      <section className="stat-grid">
        <StatTile label="Stops today" value={todayStops.length} />
        <StatTile label="Studies today" value={todayStudies.length} />
        <StatTile label="Active stop" value={currentStop ? `#${currentStop.stopNumber}` : 'None'} />
      </section>

      {!currentStop ? (
        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Next stop</p>
              <h2>Facility label</h2>
            </div>
          </div>
          <input
            className="facility-input"
            list="facility-labels"
            value={facilityLabel}
            onChange={(event) => setFacilityLabel(event.target.value)}
            aria-label="Facility label"
          />
          <datalist id="facility-labels">
            {data.settings.defaultFacilityLabels.map((label) => (
              <option key={label} value={label} />
            ))}
          </datalist>
        </section>
      ) : (
        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Active stop</p>
              <h2>{currentStop.facilityLabel}</h2>
            </div>
            <span className="time-pill">
              <Clock size={14} aria-hidden="true" />
              {formatClock(currentStop.parkedAt)}
            </span>
          </div>
          <MetricList
            metrics={[
              ['Studies', stopMetrics?.studyCount ?? 0],
              ['Load delay', formatMetric(stopMetrics?.loadDelayMin ?? null)],
              ['Stop total', formatMetric(stopMetrics?.totalStopMin ?? null)],
              ['Minutes per study', formatMetric(stopMetrics?.minutesPerStudy ?? null)],
            ]}
          />
        </section>
      )}

      {correctionStudy ? (
        <section className="panel study-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{correctionStudy.label}</p>
              <h2>{currentStudy ? 'Active study' : 'Latest study'}</h2>
            </div>
          </div>
          <div className="timeline">
            <span className={classNames('timeline-step', correctionStudy.patientOnVanAt && 'done')}>
              Pt On Van <strong>{formatClock(correctionStudy.patientOnVanAt)}</strong>
            </span>
            <span className={classNames('timeline-step', correctionStudy.patientLeavesVanAt && 'done')}>
              Pt Leaves Van <strong>{formatClock(correctionStudy.patientLeavesVanAt)}</strong>
            </span>
            <span className={classNames('timeline-step', correctionStudy.documentationCompleteAt && 'done')}>
              Documentation Complete <strong>{formatClock(correctionStudy.documentationCompleteAt)}</strong>
            </span>
          </div>
          <MetricList
            metrics={[
              ['Study time', formatMetric(studyMetrics?.studyDurationMin ?? null)],
              ['Documentation', formatMetric(studyMetrics?.documentationDurationMin ?? null)],
              ['Patient cycle', formatMetric(studyMetrics?.totalPatientCycleMin ?? null)],
            ]}
          />
        </section>
      ) : null}

      <button className="primary-action" type="button" onClick={nextAction.onClick}>
        <NextIcon size={24} aria-hidden="true" />
        {nextAction.label}
      </button>

      <div className="secondary-actions">
        {currentStop ? (
          <>
            <button className="secondary-button" type="button" onClick={() => setShowCorrection((value) => !value)}>
              <Pencil size={17} aria-hidden="true" />
              Correction
            </button>
            {!currentStudy && currentStudies.length > 0 ? (
              <button className="secondary-button" type="button" onClick={finishStop}>
                <SquareCheckBig size={17} aria-hidden="true" />
                Finish Stop
              </button>
            ) : null}
            {currentStudies.length === 0 ? (
              <button className="secondary-button danger-text" type="button" onClick={cancelEmptyStop}>
                <Trash2 size={17} aria-hidden="true" />
                Delete Empty Stop
              </button>
            ) : null}
          </>
        ) : null}
      </div>

      {showCorrection && currentStop ? (
        <CorrectionPanel
          stop={currentStop}
          study={correctionStudy}
          data={data}
          onSave={saveCorrection}
          onClose={() => setShowCorrection(false)}
        />
      ) : null}
    </main>
  );
}

function LogsView({
  data,
  setData,
  setView,
}: {
  data: AppData;
  setData: Dispatch<SetStateAction<AppData>>;
  setView: (view: ViewKey) => void;
}) {
  const stops = sortStops(data.stops);

  function deleteStop(stop: Stop) {
    if (!confirm(`Delete stop #${stop.stopNumber} and its studies?`)) return;
    setData((current) => ({
      ...current,
      stops: current.stops.filter((candidate) => candidate.id !== stop.id),
      studies: current.studies.filter((study) => study.stopId !== stop.id),
    }));
  }

  function deleteStudy(study: Study) {
    if (!confirm(`Delete ${study.label}?`)) return;
    setData((current) => ({
      ...current,
      studies: current.studies
        .filter((candidate) => candidate.id !== study.id)
        .map((candidate) => {
          if (candidate.stopId !== study.stopId) return candidate;
          const remainingForStop = current.studies
            .filter((item) => item.id !== study.id && item.stopId === study.stopId)
            .sort((a, b) => a.sequenceNumber - b.sequenceNumber);
          const nextIndex = remainingForStop.findIndex((item) => item.id === candidate.id) + 1;
          return {
            ...candidate,
            sequenceNumber: nextIndex,
            label: `Study ${nextIndex}`,
            updatedAt: nowIso(),
          };
        }),
    }));
  }

  function reopenStop(stop: Stop) {
    if (findActiveStop(data)) {
      alert('Finish the current active stop before reopening another stop.');
      return;
    }
    setData((current) => ({
      ...current,
      stops: current.stops.map((candidate) =>
        candidate.id === stop.id ? { ...candidate, completedAt: undefined, updatedAt: nowIso() } : candidate,
      ),
    }));
    setView('today');
  }

  if (stops.length === 0) {
    return <EmptyState title="No logs yet" body="Start a stop to create the first local log entry." />;
  }

  return (
    <main className="screen">
      <div className="screen-title">
        <h1>Logs</h1>
        <p>{stops.length} stops stored on this device</p>
      </div>
      <div className="log-stack">
        {stops.map((stop) => {
          const studies = studiesForStop(data, stop.id);
          const metrics = deriveStopMetrics(stop, studies);
          return (
            <article key={stop.id} className="panel log-card">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">{formatDateLabel(stop.date)}</p>
                  <h2>
                    Stop #{stop.stopNumber} · {stop.facilityLabel}
                  </h2>
                </div>
                <span className={classNames('status-dot', stop.completedAt ? 'complete' : 'active')}>
                  {stop.completedAt ? 'Finished' : 'Active'}
                </span>
              </div>
              <MetricList
                metrics={[
                  ['Parked', formatClock(stop.parkedAt)],
                  ['First Pt On Van', formatClock(metrics.firstPatientOnVanAt)],
                  ['Last Documentation Complete', formatClock(metrics.lastDocumentationCompleteAt)],
                  ['Studies', metrics.studyCount],
                  ['Load Delay', formatMetric(metrics.loadDelayMin)],
                  ['Total Stop', formatMetric(metrics.totalStopMin)],
                  ['Min Per Study', formatMetric(metrics.minutesPerStudy)],
                ]}
              />
              <div className="study-log-list">
                {studies.map((study, index) => {
                  const studyMetrics = deriveStudyMetrics(study, studies[index + 1]);
                  return (
                    <div key={study.id} className="study-log-item">
                      <div>
                        <strong>{study.label}</strong>
                        <span>{study.delayReason || 'None'}</span>
                      </div>
                      <MetricList
                        metrics={[
                          ['Pt On Van', formatClock(study.patientOnVanAt)],
                          ['Pt Leaves Van', formatClock(study.patientLeavesVanAt)],
                          ['Documentation Complete', formatClock(study.documentationCompleteAt)],
                          ['Study Min', formatMetric(studyMetrics.studyDurationMin)],
                          ['Documentation Min', formatMetric(studyMetrics.documentationDurationMin)],
                          ['Total Cycle', formatMetric(studyMetrics.totalPatientCycleMin)],
                          ['Complexity', study.complexity ?? 'Unselected'],
                        ]}
                      />
                      <button className="text-button danger-text" type="button" onClick={() => deleteStudy(study)}>
                        <Trash2 size={16} aria-hidden="true" />
                        Delete Study
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="secondary-actions align-left">
                {stop.completedAt ? (
                  <button className="secondary-button" type="button" onClick={() => reopenStop(stop)}>
                    <RotateCcw size={17} aria-hidden="true" />
                    Reopen
                  </button>
                ) : null}
                <button className="secondary-button danger-text" type="button" onClick={() => deleteStop(stop)}>
                  <Trash2 size={17} aria-hidden="true" />
                  Delete Stop
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}

type AggregateRow = {
  label: string;
  stopCount: number;
  studyCount: number;
  loadDelay: number | null;
  studyDuration: number | null;
  documentation: number | null;
  patientCycle: number | null;
  minutesPerStudy: number | null;
  interStudyGap: number | null;
  commonDelay: string;
};

function average(values: Array<number | null>): number | null {
  const complete = values.filter((value): value is number => value !== null && Number.isFinite(value));
  if (complete.length === 0) return null;
  return complete.reduce((total, value) => total + value, 0) / complete.length;
}

function mostCommon(values: string[]): string {
  const counts = new Map<string, number>();
  values.forEach((value) => {
    if (value && value !== 'None') counts.set(value, (counts.get(value) ?? 0) + 1);
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'None';
}

function aggregateByStops(label: string, stops: Stop[], data: AppData): AggregateRow {
  const stopMetrics = stops.map((stop) => deriveStopMetrics(stop, studiesForStop(data, stop.id)));
  const studies = stops.flatMap((stop) => studiesForStop(data, stop.id));
  const studyMetrics = studies.map((study, index, siblings) => deriveStudyMetrics(study, siblings[index + 1]));
  return {
    label,
    stopCount: stops.length,
    studyCount: studies.length,
    loadDelay: average(stopMetrics.map((metric) => metric.loadDelayMin)),
    studyDuration: average(studyMetrics.map((metric) => metric.studyDurationMin)),
    documentation: average(studyMetrics.map((metric) => metric.documentationDurationMin)),
    patientCycle: average(studyMetrics.map((metric) => metric.totalPatientCycleMin)),
    minutesPerStudy: average(stopMetrics.map((metric) => metric.minutesPerStudy)),
    interStudyGap: average(stopMetrics.map((metric) => metric.averageInterStudyGapMin)),
    commonDelay: mostCommon(studies.map((study) => study.delayReason ?? 'None')),
  };
}

function DashboardView({ data }: { data: AppData }) {
  const todayKey = formatDateKey();
  const dashboard = useMemo(() => {
    const todayStops = data.stops.filter((stop) => stop.date === todayKey);
    const today = aggregateByStops('Today', todayStops, data);
    const since = (days: number) => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - (days - 1));
      const cutoffKey = formatDateKey(cutoff);
      return data.stops.filter((stop) => stop.date >= cutoffKey);
    };
    const facilityRows = [...new Set(data.stops.map((stop) => stop.facilityLabel))]
      .sort()
      .map((facility) =>
        aggregateByStops(
          facility,
          data.stops.filter((stop) => stop.facilityLabel === facility),
          data,
        ),
      );
    const bottlenecks = [
      ['Parking to first patient', today.loadDelay],
      ['Study time', today.studyDuration],
      ['Documentation time', today.documentation],
      ['Inter-study gaps', today.interStudyGap],
    ] as const;
    const biggestDrag = [...bottlenecks]
      .filter(([, value]) => value !== null)
      .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0]?.[0];
    return {
      today,
      sevenDay: aggregateByStops('7-day', since(7), data),
      thirtyDay: aggregateByStops('30-day', since(30), data),
      facilityRows,
      bottlenecks,
      biggestDrag: biggestDrag ?? 'Incomplete',
    };
  }, [data, todayKey]);

  if (data.stops.length === 0) {
    return <EmptyState title="No dashboard data yet" body="Dashboard metrics appear after completed study timestamps exist." />;
  }

  return (
    <main className="screen">
      <div className="screen-title">
        <h1>Dashboard</h1>
        <p>Incomplete timestamps stay incomplete instead of being averaged.</p>
      </div>

      <section className="stat-grid">
        <StatTile label="Stops today" value={dashboard.today.stopCount} />
        <StatTile label="Studies today" value={dashboard.today.studyCount} />
        <StatTile label="Biggest drag" value={dashboard.biggestDrag} />
      </section>

      <section className="panel">
        <div className="section-heading">
          <h2>Today Summary</h2>
        </div>
        <MetricList
          metrics={[
            ['Average study duration', formatMetric(dashboard.today.studyDuration)],
            ['Average documentation duration', formatMetric(dashboard.today.documentation)],
            ['Average patient cycle', formatMetric(dashboard.today.patientCycle)],
            ['Average minutes per study', formatMetric(dashboard.today.minutesPerStudy)],
          ]}
        />
      </section>

      <section className="panel">
        <div className="section-heading">
          <h2>Rolling Averages</h2>
        </div>
        <div className="comparison-grid">
          {[dashboard.sevenDay, dashboard.thirtyDay].map((row) => (
            <div key={row.label} className="mini-panel">
              <h3>{row.label}</h3>
              <MetricList
                metrics={[
                  ['Load delay', formatMetric(row.loadDelay)],
                  ['Study duration', formatMetric(row.studyDuration)],
                  ['Documentation', formatMetric(row.documentation)],
                  ['Patient cycle', formatMetric(row.patientCycle)],
                  ['Stop min/study', formatMetric(row.minutesPerStudy)],
                  ['Studies/day', row.studyCount],
                ]}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <h2>Facility Averages</h2>
        </div>
        <div className="facility-table">
          {dashboard.facilityRows.map((row) => (
            <article key={row.label} className="facility-row">
              <div>
                <strong>{row.label}</strong>
                <span>
                  {row.stopCount} stops · {row.studyCount} studies
                </span>
              </div>
              <MetricList
                metrics={[
                  ['Load delay', formatMetric(row.loadDelay)],
                  ['Study duration', formatMetric(row.studyDuration)],
                  ['Documentation', formatMetric(row.documentation)],
                  ['Min/study', formatMetric(row.minutesPerStudy)],
                  ['Common delay', row.commonDelay],
                ]}
              />
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <h2>Bottleneck Breakdown</h2>
        </div>
        <div className="bar-list">
          {dashboard.bottlenecks.map(([label, value]) => {
            const width = value === null ? 0 : Math.min(100, Math.max(6, value * 3));
            return (
              <div key={label} className="bar-row">
                <div>
                  <span>{label}</span>
                  <strong>{formatMetric(value)}</strong>
                </div>
                <div className="bar-track">
                  <span style={{ width: `${width}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function ExportView({
  data,
  setData,
}: {
  data: AppData;
  setData: Dispatch<SetStateAction<AppData>>;
}) {
  function restore(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const restored = sanitizeAppData(parsed);
        if (!confirm('Replace local tracker data with this backup?')) return;
        setData(restored);
      } catch {
        alert('Backup file could not be restored.');
      } finally {
        event.target.value = '';
      }
    };
    reader.readAsText(file);
  }

  function clearAllData() {
    if (!confirm('Clear all local tracker data from this browser?')) return;
    setData(DEFAULT_DATA);
  }

  function removeSampleData() {
    setData((current) => ({
      ...current,
      stops: current.stops.filter((stop) => !stop.sampleTag),
      studies: current.studies.filter((study) => !study.sampleTag),
    }));
  }

  return (
    <main className="screen">
      <div className="screen-title">
        <h1>Export</h1>
        <p>Data stays on this device unless a file is downloaded or restored.</p>
      </div>

      <section className="panel action-panel">
        <button
          className="secondary-button strong"
          type="button"
          onClick={() => downloadTextFile('stops.csv', buildStopsCsv(data), 'text/csv')}
        >
          <Download size={18} aria-hidden="true" />
          Export stops.csv
        </button>
        <button
          className="secondary-button strong"
          type="button"
          onClick={() => downloadTextFile('studies.csv', buildStudiesCsv(data), 'text/csv')}
        >
          <Download size={18} aria-hidden="true" />
          Export studies.csv
        </button>
        <button
          className="secondary-button strong"
          type="button"
          onClick={() =>
            downloadTextFile('mbss-tracker-backup.json', JSON.stringify(data, null, 2), 'application/json')
          }
        >
          <Download size={18} aria-hidden="true" />
          Download JSON backup
        </button>
        <label className="file-button">
          <Upload size={18} aria-hidden="true" />
          Restore JSON backup
          <input type="file" accept="application/json,.json" onChange={restore} />
        </label>
      </section>

      <section className="panel action-panel">
        <button className="secondary-button" type="button" onClick={() => setData((current) => createSampleData(current))}>
          <Play size={18} aria-hidden="true" />
          Add sample data
        </button>
        <button className="secondary-button danger-text" type="button" onClick={removeSampleData}>
          <Trash2 size={18} aria-hidden="true" />
          Delete sample data
        </button>
        <button className="secondary-button danger-text" type="button" onClick={clearAllData}>
          <Trash2 size={18} aria-hidden="true" />
          Clear all data
        </button>
      </section>
    </main>
  );
}

export default function App() {
  const [data, setData] = useAppData();
  const [view, setView] = useState<ViewKey>('today');

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <span className="app-mark">MB</span>
          <span>Flow</span>
        </div>
        <span className="sync-state">
          <LockKeyhole size={14} aria-hidden="true" />
          Private
        </span>
      </header>

      {view === 'today' ? <TodayView data={data} setData={setData} /> : null}
      {view === 'logs' ? <LogsView data={data} setData={setData} setView={setView} /> : null}
      {view === 'dashboard' ? <DashboardView data={data} /> : null}
      {view === 'export' ? <ExportView data={data} setData={setData} /> : null}

      <nav className="bottom-nav" aria-label="Primary">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              className={classNames(view === item.key && 'selected')}
              onClick={() => setView(item.key)}
            >
              <Icon size={20} aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
