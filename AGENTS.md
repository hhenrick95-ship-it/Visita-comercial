# Architecture rules

- Resolve dynamic survey dates through `get_form_submission_date` for records, PDFs and the unified dashboard; it prioritizes the visit-date identification role, then section/question order, and falls back to the submission calendar date while retaining the original timestamp for audit.
- Interpret date-only strings as local calendar dates, never UTC timestamps, to prevent display shifts.
- Generic submission lists filter by resolved visit_date and created_by; resolve collaborator labels from RLS-scoped profiles to preserve creator attribution without changing access permissions.