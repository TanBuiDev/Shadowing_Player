import React, { Component } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full w-full bg-background text-foreground p-8 text-center space-y-4">
          <div className="p-4 rounded-full bg-destructive/10 text-destructive mb-2">
            <AlertTriangle size={48} />
          </div>
          <h2 className="text-2xl font-bold">Something went wrong</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            The application encountered an unexpected error.
            <br />
            <span className="text-xs font-mono bg-secondary p-1 rounded mt-2 inline-block">
              {this.state.error?.message}
            </span>
          </p>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors mt-4"
          >
            <RefreshCcw size={16} />
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
