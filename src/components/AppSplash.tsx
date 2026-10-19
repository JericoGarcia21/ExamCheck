export default function AppSplash() {
  return (
    <div className="app-splash" role="status" aria-live="polite">
      <img src="/favicon.svg" alt="" width="88" height="88" />
      <h1>ExamCheck</h1>
      <p>More time for teaching.</p>
      <span className="app-splash-loader" aria-hidden="true" />
      <p className="app-splash-status">Opening your workspace...</p>
    </div>
  )
}
