# MBSS Flow PRD

MBSS Flow is a private, mobile-first workflow timer for a mobile MBSS job. It tracks how long each facility stop and study takes, summarizes workflow bottlenecks, and keeps MVP data local to the browser/device.

## Goals

- Track timing for each facility stop and MBSS study.
- Calculate average time by workflow stage.
- Normalize stop time by number of studies at a stop.
- Identify bottlenecks by facility, day, and workflow stage.
- Work well from an iPhone Home Screen icon.
- Keep entered data local/private for MVP.
- Export CSV and JSON backup files.

## Non-Goals

- Patient names, MRNs, DOBs, diagnoses, room numbers, diet recommendations, clinical findings, images, or identifying patient information.
- Clinical documentation or medical record storage.
- HIPAA compliance claims.
- Cloud sync, shared database, analytics, remote logging, accounts, billing, or route optimization.

## MVP Requirements

- Today screen with current date, total studies, total stops, active stop, active study, and one large state-based next action.
- Stop tracking with facility alias, parked timestamp, optional non-PHI notes, and derived stop metrics.
- Study tracking with neutral labels, milestone timestamps, complexity, delay reason, optional non-PHI notes, and derived study metrics.
- Dashboard with today, rolling, facility, and bottleneck summaries.
- Logs rendered as mobile-friendly cards.
- Export `stops.csv`, export `studies.csv`, download JSON backup, restore JSON backup, clear all data with confirmation, and sample data with deletion.
- PWA manifest and offline app shell.
- Privacy guardrails: no PHI fields, no analytics, no backend, no cloud sync, no HIPAA compliance claim.

## Implementation Guardrails

- React, TypeScript, Vite.
- Local storage persistence with schema versioning.
- Derived metrics in helper functions.
- Tests for duration calculations and restore integrity.
- No Supabase, Firebase, analytics, Sentry, or remote services.
