# CanisVET Data Import Plan

Last updated: 2026-04-13

## Objective

Allow clinics to import historical data from other applications/databases into CanisVET in a safe, auditable, and repeatable way, without losing non-standard fields.

## Core principles

- Tenant-safe: every imported record is scoped to the active clinic.
- No data loss: unmapped fields are preserved.
- Deterministic first: rule-based mapping is primary; AI only assists.
- Human-in-the-loop: low-confidence mappings require user confirmation.
- Replayable imports: idempotent jobs and versioned mapping templates.
- Production-grade observability: full audit log, error reports, rollback strategy.

## Target scope (initial)

- Sources:
  - CSV / XLSX upload (Phase 1)
  - External API connectors (Phase 2)
  - Direct DB connector import (Phase 3, optional)
- Entities:
  - `clients`, `pets`, `appointments`, `records`, `prescriptions`, `vets`, `reminders`, `sales`

## Architecture

1. Ingestion
- Upload source file or connect source system.
- Parse into canonical raw rows with source metadata.

2. Staging (raw, immutable)
- Store raw payload exactly as received for traceability.
- Never write directly from source into final business tables.

3. Mapping & transformation
- Run deterministic mapping rules first.
- Use AI suggestions only for ambiguous or unknown fields.
- Validate required fields, data types, constraints, relationships.

4. Load to production tables
- Batch insert/update with clinic scoping.
- Dedupe and relation linking (client -> pet -> record etc.).
- Persist import results + row-level errors.

## AI mapping strategy (safe mode)

AI is used as a suggestion engine, not as final authority.

- Input to AI:
  - source field names + sample values
  - target schema fields + constraints
  - locale context (Romania, vet domain)
- Output required:
  - suggested target field
  - confidence score (0-1)
  - short reasoning
- Acceptance policy:
  - confidence >= 0.90: auto-accept (still visible in review)
  - 0.60 - 0.89: pending manual review
  - < 0.60: reject suggestion
- Guardrails:
  - AI cannot generate SQL
  - AI cannot bypass required-field validation
  - AI cannot create destructive schema changes

## Handling additional fields (not in CanisVET schema)

Do not drop them. Use a 3-layer strategy:

1. Preserve immediately in JSONB
- Save unknown source fields into `extra_data`/`custom_fields` JSONB at row level.

2. Promote to clinic-defined custom fields (optional)
- If a field is used often by a clinic, allow definition in a `clinic_custom_fields` catalog.

3. Promote to core schema (rare)
- Only when repeated across many clinics and important for product roadmap.

## Proposed database additions

- `import_jobs`
  - `id`, `clinic_id`, `source_type`, `source_name`, `status`, `started_at`, `finished_at`, `created_by`
  - `idempotency_key`, `mapping_template_id`, `summary_json`

- `import_job_rows`
  - `id`, `job_id`, `source_row_index`, `raw_payload` (jsonb), `normalized_payload` (jsonb)
  - `status` (`pending|loaded|error|skipped`), `error_message`

- `import_mapping_templates`
  - `id`, `clinic_id`, `source_fingerprint`, `name`, `version`, `is_active`
  - `mapping_json` (source->target), `created_by`, `approved_at`

- `import_mapping_suggestions`
  - `id`, `job_id`, `source_field`, `target_field`, `confidence`, `reason`, `accepted`

- `import_conflicts`
  - `id`, `job_id`, `row_id`, `conflict_type`, `details_json`, `resolution_status`

## API plan

- `POST /api/import/jobs`
  - Create job, upload metadata, return job id.

- `POST /api/import/jobs/[id]/analyze`
  - Parse source + generate deterministic/AI mapping suggestions.

- `POST /api/import/jobs/[id]/mapping`
  - Save approved mapping template.

- `POST /api/import/jobs/[id]/dry-run`
  - Validate and simulate load, no writes to business tables.

- `POST /api/import/jobs/[id]/execute`
  - Execute batch import.

- `GET /api/import/jobs/[id]`
  - Job status, counters, error summary.

- `GET /api/import/jobs/[id]/errors`
  - Row-level error export.

## Phase 1 implementation status (2026-04-13)

Implemented in code:

- `GET/POST /api/import/jobs`
- `GET /api/import/jobs/[id]`
- `POST /api/import/jobs/[id]/analyze`
- `POST /api/import/jobs/[id]/dry-run`
- `POST /api/import/jobs/[id]/execute`

Current behavior:

- Single target entity per job (`targetTable`).
- Deterministic mapping suggestions are generated and stored.
- Dry-run validates and stages normalized payloads.
- Execute loads valid rows into target business table and marks row-level errors.
- Unmapped source fields are preserved in staging payload (`extra_fields`).

## Validation and deduplication rules

- Required fields: enforce per entity.
- Type checks: numeric/date/email/phone normalization.
- Relationship integrity:
  - pets must resolve `client_id` via mapping key.
  - records/prescriptions must resolve linked entities.
- Dedupe strategy (configurable):
  - clients: email/phone + name fuzzy
  - pets: chip number + owner link
  - appointments: date + patient + vet + service

## Security and compliance

- Imports are admin-only.
- Row-level access enforced by `clinic_id`.
- All import actions logged into `audit_logs`.
- PII in logs must be masked where possible.
- Upload retention policy configurable (e.g. 30-90 days).

## UX workflow

1. Upload source.
2. Field mapping screen:
  - deterministic matches prefilled
  - AI suggestions highlighted with confidence
  - unknown fields shown under “Additional fields”
3. Dry-run report:
  - expected inserts/updates/skips/errors
4. Execute import.
5. Post-import report:
  - summary + downloadable error CSV

## Rollout plan

### Phase 1 (MVP)
- CSV/XLSX import, staging tables, deterministic mapping, manual mapping UI, dry-run, execute.
- Unknown fields saved to JSONB.

### Phase 2
- AI-assisted mapping suggestions with confidence workflow.
- Mapping templates versioning and reuse.

### Phase 3
- Source connectors (API/DB), scheduled imports, advanced dedupe and conflict resolution.

## Definition of done

- Dry-run and execute flow works end-to-end on local + staging.
- No cross-clinic data leakage in import paths.
- Re-running same import with same idempotency key does not duplicate data.
- Unknown fields are preserved and queryable from JSONB payload.
- Import report provides actionable row-level errors.
- Audit trails exist for creation, mapping approval, dry-run, execute, and rollback actions.
