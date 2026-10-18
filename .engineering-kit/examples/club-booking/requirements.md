# Example requirements and acceptance

| ID | MVP requirement | Acceptance / test |
| --- | --- | --- |
| R1 | Authenticated member reserves an available predefined slot | Valid submission persists one booking; repeated occupied-slot submission returns conflict |
| R2 | Member sees only their bookings | Another member cannot read or cancel the booking, including by direct ID |
| R3 | Staff manage resources and inspect bookings | Member write attempt denied server-side; staff action authorized and recorded |
| R4 | Member cancels their upcoming booking | Cancellation releases the slot atomically and is safe to retry |

Boundary tests include invalid IDs, unavailable resources, past slots, exact start time, duplicate submissions, and concurrent requests. Use the club's chosen timezone for display and UTC instants for storage.

Proposed nonfunctional baseline: WCAG 2.2 AA for critical flows; no member email in list responses; bounded pagination. Latency budget requires representative hosting measurements and is undecided.

Open decisions: staff approval required? maximum booking duration? cancellation cutoff? retention after cancellation? Expected deliverables are implementation, tests, setup docs, and a hosting runbook. Future work: recurring reservations and email reminders.
