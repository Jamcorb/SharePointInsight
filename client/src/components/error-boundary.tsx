import React from 'react';

interface ErrorBoundaryState {
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white dark:bg-gray-800 border-2 border-dashed border-red-500 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-4">
              Something broke.
            </h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Error:</h4>
                <pre className="text-sm bg-gray-100 dark:bg-gray-900 p-3 rounded border overflow-auto whitespace-pre-wrap text-red-600 dark:text-red-400">
                  {String(this.state.error)}
                </pre>
              </div>
              {this.state.errorInfo && (
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Stack Trace:</h4>
                  <pre className="text-sm bg-gray-100 dark:bg-gray-900 p-3 rounded border overflow-auto whitespace-pre-wrap text-gray-600 dark:text-gray-400">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </div>
              )}
              <button 
                onClick={() => window.location.reload()} 
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                data-testid="button-reload"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}