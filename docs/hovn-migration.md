# Hovn catalog migration

The catalog importer is an operator-only Convex internal mutation:
`registrationMigration:importHovnCatalog`. It accepts at most 100 courses and 100
materials in a transaction. Source IDs are indexed, imports never overwrite an
existing source ID, conflicting source snapshots abort the transaction, and unknown
material references or duplicate slugs fail the entire batch. Importing creates no
sessions, registrations, payment operations, emails, or keycode assignments.

Active Hovn offerings become closed drafts; historical offerings remain archived.
Hovn INCLUDED maps to an included attachment with zero added cents. BUNDLED maps
to an included attachment charged at its material price. OPTIONAL and WAIVABLE
retain their selection and waiver behavior. Source configurations are retained in
staff-only sourceData fields for reconciliation, including original visibility,
class segment durations, default capacities, and rubric choices.

Materials retain their source ID, SKU, descriptions, summary, catalog price, tax
selection, and student redemption/pickup instructions. Instructions are snapshotted
into paid entitlements, so later edits do not rewrite delivered instructions.
Physical items stay pending until staff records a handoff, require an active paid
registration, and never create a digital download or consume a keycode.

Private exports and redemption data belong in the gitignored `migration-backups/`
directory, never in source control. The October 21 capture includes 28 courses
(13 published, 15 archived), 15 materials (5 physical), 28 course-material
attachments, and a separate backup of 13 available AHA codes (6 instructor, 7 BLS).
Previously assigned codes are not available inventory. Do not activate the same
unassigned codes in two systems: reconcile source availability at cutover.

The owner selected an 80% passing threshold for the five active offerings with
percentage grading. Historical percentage fields retain their source definition
without an invented threshold. Publication, session scheduling, and moving live
keycode allocation require separate reconciliation from catalog staging.

Validation: lint, TypeScript, 96 regression tests, and a production build passed.
A local test of the actual capture verified all 28 courses, 15 materials, and 28
attachments, closed enrollment, archived statuses, active 80% thresholds, and
idempotent replay with no email jobs. Production verification must be recorded
separately after import.
