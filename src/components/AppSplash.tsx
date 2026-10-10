export default function AppSplash() {
  return (
    <div className="app-splash" role="status" aria-live="polite">
      <img src="/favicon.svg" alt="" width="80" height="80" />
      <h1>ExamCheck</h1>
      <p>More time for teaching.</p>
      <span className="app-splash-loader" aria-hidden="true" />
      <span className="sr-only">Loading ExamCheck</span>
    </div>
  )
}
