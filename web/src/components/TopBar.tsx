const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "2-digit",
  year: "numeric",
};

export function TopBar() {
  // Server and browser can sit in different time zones, so the rendered date is
  // allowed to differ across hydration rather than being an error.
  const today = new Date().toLocaleDateString("en-US", DATE_FORMAT).toUpperCase();

  return (
    <header className="topbar">
      <div>
        <p className="kicker kicker--accent">Control room / 01</p>
        <h1>Observation desk</h1>
      </div>
      <p className="topbar__meta">
        <span className="dot" aria-hidden="true" />
        Localhost
        <span className="topbar__rule" aria-hidden="true" />
        <time suppressHydrationWarning>{today}</time>
      </p>
    </header>
  );
}
