"use client";

import { Component, ReactNode } from "react";
import { browserLogger } from "@/lib/logging/browser-logger";
import { getUserMessage } from "@/lib/errors/user-messages";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: undefined,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    browserLogger.error({
      scope: "browser.error.boundary",
      message: "Unhandled error caught in React tree",
      error,
      data: {
        componentStack: info.componentStack,
      },
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const userMessage = getUserMessage(this.state.error);

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 rounded-2xl border border-border bg-background/90 p-6 text-center shadow-lg shadow-black/5">
        <h2 className="text-lg font-semibold text-foreground">Something went wrong</h2>
        <p className="text-sm text-muted-foreground">{userMessage}</p>
        <button
          type="button"
          onClick={this.handleRetry}
          className="rounded-full border border-primary px-4 py-2 text-sm font-medium text-primary"
        >
          Try again
        </button>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-full border border-foreground/50 px-4 py-2 text-sm font-medium"
        >
          Refresh page
        </button>
      </div>
    );
  }
}
