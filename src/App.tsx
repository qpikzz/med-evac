import "./App.css";

function App() {
  return (
    <main className="app-shell">
      <div className="orbital-ring" aria-hidden="true" />

      <header className="app-header">
        <img className="app-logo" src="/med-evac.svg" alt="" />
        <div>
          <h1>MED-EVAC</h1>
          <p className="tagline">Autonomous Spaceflight Medical Assistant</p>
        </div>
      </header>

      <section className="status-panel">
        <p className="status-label">System Status</p>
        <p className="status-value">Placeholder shell — monitoring modules coming online</p>
      </section>

      <footer className="app-footer">
        Team CyberAstro · NASA Space Apps Challenge 2026
      </footer>
    </main>
  );
}

export default App;
