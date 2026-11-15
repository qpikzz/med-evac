import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("ORBITA encountered a render error.", error, errorInfo);
  }

  render() {
    const { error } = this.state;
    if (!error) {
      return this.props.children;
    }

    return (
      <main className="app-error-boundary" role="alert">
        <section className="app-error-boundary-card">
          <p className="app-error-boundary-kicker">ORBITA runtime error</p>
          <h1>The app could not render this screen</h1>
          <p className="app-error-boundary-message">
            Reload the app to try again. Technical details are available below.
          </p>
          <details>
            <summary>Error details</summary>
            <pre>{error.stack ?? error.message}</pre>
          </details>
          <button type="button" onClick={() => window.location.reload()}>
            Reload app
          </button>
        </section>
      </main>
    );
  }
}

export default ErrorBoundary;
