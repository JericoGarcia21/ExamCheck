# Example feature plan

1. After approval: authentication/roles and resource/slot schema; test role escalation denial and constraints.
2. Create booking slice: transactional reservation, authorized route, focused form, duplicate-submit and conflict states; test concurrent writes and server validation.
3. Own booking list/cancel slice: ownership scope, retry-safe cancellation and UI feedback; test direct-ID cross-user denial and cancellation race.
4. Staff management slice: policies, resource status changes and booking inspection; test member denial and resource-deactivation race.
5. Release preparation: responsive/keyboard checks, dependency review, host configuration, migration/restore rehearsal, rollback and operator docs.

Threats: cross-user disclosure, staff role escalation, double reservation, CSRF, log exposure and abusive slot enumeration. Verification is planned, not executed. Unit tests cover date/cutoff rules after decisions; integration tests cover authorization, transactions and constraints; a browser journey covers login -> reserve -> see booking -> cancel.

Acceptance, security, accessibility and hosting checks all remain NOT VERIFIED. No product code or live infrastructure changes are included in this example.
