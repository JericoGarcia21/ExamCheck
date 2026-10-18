# API contract

For each endpoint record method/path, authentication, resource authorization, bounded request schema, response schema, status codes, pagination, idempotency, rate/upload limits, and version compatibility.

Illustrative contract: POST /bookings accepts resourceId and slotId; server assigns memberId from the session. Returns 201 on creation, 401 without authentication, 403 for forbidden resources, 409 for an occupied slot, and a documented validation error for malformed input.

Errors use stable codes and safe user-facing messages without stack traces or secrets. Define retry behavior, ownership on nested routes, and third-party timeouts.
