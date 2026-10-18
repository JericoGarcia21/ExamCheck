# Example data model

| Entity | Important fields | Invariants |
| --- | --- | --- |
| Member | id, email, password_hash, role | Unique normalized email; role server controlled |
| Resource | id, name, active | Only active resources accept new bookings |
| Slot | id, resource_id, starts_at, ends_at | Foreign key; positive interval; unique resource/start for predefined non-overlapping slots |
| Booking | id, member_id, slot_id, created_at, cancelled_at | Foreign keys; ownership retained for history |
| ActiveReservation | slot_id (primary key), booking_id (unique FK) | At most one active booking for each slot |

Create Booking and ActiveReservation in one transaction; a duplicate slot key is a conflict. Cancellation updates Booking and removes ActiveReservation in one transaction. Authorization scopes the booking before modification. Predefined slots are generated through a validated non-overlap path; arbitrary interval booking is excluded. Lock/check resource active state consistently during creation and deactivation to avoid a race.

Index member/date lookups based on measured query plans. Migrations begin additively; rehearsal includes backup restoration and rollback compatibility. No migration or performance benchmark has run.
