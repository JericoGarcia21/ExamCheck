# Example API boundary

The server-rendered app can use equivalent form routes; this API shape documents behavior if JSON is required.

| Method/path | Authorization | Input / output | Errors |
| --- | --- | --- | --- |
| GET /resources | Authenticated member or staff | Bounded page; active resources and available slots | 401; documented validation error |
| POST /bookings | Authenticated member | slotId; server derives memberId; 201 booking ID | 401, 403 inactive/forbidden, 409 occupied, validation error |
| GET /bookings | Authenticated user | Own bookings; explicit staff permission for wider scope | 401, validation error |
| DELETE /bookings/{id} | Owner or authorized staff | Idempotent cancellation; 204 | 401; consistent safe denial/missing response policy |

Cookie-based state-changing routes need framework CSRF protections. Bind input to allowed fields; clients cannot set memberId or role. Errors contain stable codes and no stack traces. An occupied-slot response tells the member to refresh availability; retain form context. Pagination is capped server-side. Choose and document whether denied resource lookup returns 403 or a non-disclosing 404 consistently.
