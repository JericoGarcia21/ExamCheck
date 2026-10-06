# Future Improvements

## Offline session preparation and answer entry

Allow teachers to prepare selected classes and checking sessions while online,
then access the saved session data without an internet connection. The offline
data should include the class and student list, answer key, and checking rules.

When offline, teachers should be able to enter answers manually. Save those
entries in a local queue and sync them to Supabase when the app reconnects.
Show whether changes are pending, synced, or need attention so teachers can
resolve sync problems without losing work.

### Offline access and login

- Keep account sign-in, sign-out verification, and password recovery online.
- After a successful online sign-in, let the teacher opt in to offline access
  for selected class/session data.
- When offline, offer access to the previously signed-in account using a
  device-local PIN or biometrics where supported. This unlocks data stored on
  that device; it does not authenticate with Supabase.
- Clearly distinguish offline access from an active server session, since
  Supabase credentials can expire while the device is disconnected.
- Provide a way to clear downloaded student data and pending local data from
  the device, especially on shared devices.
- Keep AI paper/photo reading online-only in the first iteration. A later
  improvement could explore an on-device or local-network Ollama vision model;
  it would require a compatible model already downloaded and Ollama running.

### Suggested rollout

1. Cache selected session details, students, answer key, and rules on the
   device.
2. Add offline unlock for a previously authenticated teacher.
3. Queue manual answer entries and sync them safely when connectivity returns.
4. Consider offline AI reading as a separate follow-up.
