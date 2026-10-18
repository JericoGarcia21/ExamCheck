# Database design

| Entity | Key / relationships | Integrity constraints | Retention / privacy |
| --- | --- | --- | --- |
| Booking | id, member_id, resource_id | Unique slot; bounded duration | Decide retention with owner |

Document actual types, nullability, foreign keys, timestamps/timezones, deletion rules, and engine-specific concurrency strategy.

## Query and migration plan

List critical queries, proposed indexes and their justification, transaction/isolation behavior, additive migration order, backfills, application-version compatibility, backup/restore, and rollback or forward repair. Mark unmeasured optimizations as hypotheses.
