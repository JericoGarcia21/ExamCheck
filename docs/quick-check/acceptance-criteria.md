# Guest Quick Check acceptance criteria

Status: proposed requirements; none of these new feature tests has been executed.

Implementation follow-up: backend/schema acceptance checks have now run; see `implementation.md`. The original planning evidence below is retained for history. Interactive browser/device and real-provider acceptance remain unverified.

| Case | Requirement | Given / When / Then | Verification |
| --- | --- | --- | --- |
| AC-01 | QC-01 | Given no login, when opening Quick Check directly or from the login page, then key input is accessible without redirecting to login; protected account pages still require login. | Route integration |
| AC-02 | QC-02 | Given an empty, invalid, or unconfirmed key, when Check is requested, then no reader request occurs. Given 1 or 300 valid confirmed items, checking is allowed; 301 items is rejected. If D1 includes photos, uploaded key text is editable and requires explicit confirmation; unreadable extraction offers correction/reupload. | Parser, UI, server validation |
| AC-03 | QC-03 | Given an empty, unsupported, oversized, malformed, or signature-mismatched image, when submitted through the UI or direct API, then it is rejected before a paid call. Valid supported images within limits are accepted. Camera denial still permits file upload. | Client/server boundary tests; device smoke test |
| AC-04 | QC-04 | Given a confirmed key and valid sheet, when Check succeeds, then each key item appears once with awarded/max points and consistent totals. Missing readings count as zero. Editing the key invalidates confirmation and the old result. | End-to-end with mocked recognition |
| AC-05 | QC-05 | Given rules such as Uppercase letters only and No erasures, when reading a paper containing any supported answer type, then every rule is checked across the whole paper and each confident violation appears in the same teacher review flow. Rules do not silently change individual answer scores. Unreadable/uncertain readings and essays still expose review status. | Shared scoring plus recognition fixture |
| AC-06 | QC-06 | Given a completed guest check, when choosing another sheet, then the key remains and old sheet/result clear. Reset clears all guest content; refreshing starts empty. No teacher records or app image objects have been created. | Lifecycle and persistence inspection |
| AC-07 | QC-07 | Given a misread answer, when corrected and reviewed, then points recalculate from the answer key without hidden paper-rule penalties. Given a replacement sheet while an older request is pending, its late reply cannot populate the new result. | Review integration; deferred-response test |
| AC-08 | QC-08 | Given exhausted guest quota, global budget, app pause, or unavailable admission checks, when requesting key extraction or sheet reading, then no paid call occurs and a safe explanation appears. Concurrent requests cannot exceed the configured allowance. Repeated UI clicks start one active operation. | Server concurrency and UI tests; numeric fixtures pending D2 |
| AC-09 | QC-09 | Given timeout, network loss, or invalid provider output, when reading fails, then no final score appears, the key remains, busy state clears, and an explicit retry/reupload action is available. No automatic paid resubmission occurs. | Failure injection |
| AC-10 | QC-10 | Given a guest or forged teacher/session IDs, when calling protected read/write/admin operations, then access is denied with no data disclosure or changes. Public processing cannot fetch an account key by supplied ID. Secrets and answer/image payloads are absent from client bundles and application logs. | API/RLS regression and artifact/log inspection |

## Evidence and unresolved items

Executed for this requirements task: repository inspection of routes, current reader authentication/quota flow, image limits, key parser, scoring, and review contract. Only documentation is changed by this task; no guest endpoint or screen exists yet.

Not executed: guest feature tests, real photo extraction, anonymous abuse experiments, provider-retention verification, mobile/browser accessibility checks, or performance measurements. D1 input support and D2 guest/global limits remain open in `requirements.md`.
