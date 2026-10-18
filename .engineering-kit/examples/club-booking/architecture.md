# Proposed example architecture

Status: PROPOSED, awaiting product-owner decisions. No implementation authorized by this example.

A framework PHP modular monolith with server-rendered templates and a supported relational database fits the assumed team and host. Use framework session authentication and server authorization policies. This minimizes operating services. A separate SPA/API is an alternative if offline or independent clients become requirements; it adds contract and deployment maintenance. Verify actual framework, PHP and database versions against the selected host before implementation.

Browser -> TLS web app -> relational database. Staff and members are separate roles enforced on every endpoint. Database credentials remain server-only. No third-party integration in MVP.

Proposed folders: app/Bookings, app/Resources, app/Policies, routes, database/migrations, resources/views, tests/Feature. A failed write rolls back; a slot conflict produces recoverable feedback while retaining form context. No long-lived worker is required. Shared hosting needs protected configuration, supported cron only if scheduled tasks are later added, and a documented backup/restore path.

UI uses compact resource/slot rows, a focused reservation form, clear status text, useful empty/loading/conflict states, and keyboard-visible actions. Avoid adding a dashboard to a task that needs a booking list.
