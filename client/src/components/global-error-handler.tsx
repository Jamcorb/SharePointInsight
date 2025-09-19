import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface GlobalError {
  message: string;
  details?: any;
  timestamp: Date;
}

export function GlobalErrorHandler() {
  const [globalError, setGlobalError] = useState<GlobalError | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('🚨 Unhandled Promise Rejection:', event.reason);
      
      const errorMessage = event.reason?.message || String(event.reason);
      setGlobalError({
        message: errorMessage,
        details: event.reason,
        timestamp: new Date()
      });

      toast({
        title: "Application Error",
        description: `Network or authentication error: ${errorMessage}`,
        variant: "destructive",
        duration: 10000,
      });
    };

    // Handle global JavaScript errors
    const handleGlobalError = (event: ErrorEvent) => {
      console.error('🚨 Global JavaScript Error:', event.error);
      
      setGlobalError({
        message: event.message,
        details: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error
        },
        timestamp: new Date()
      });

      toast({
        title: "JavaScript Error",
        description: `Application error: ${event.message}`,
        variant: "destructive",
        duration: 10000,
      });
    };

    // Handle fetch errors globally
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        
        if (!response.ok && response.status >= 500) {
          const url = typeof args[0] === 'string' ? args[0] : 
                      args[0] instanceof Request ? args[0].url : 
                      args[0] instanceof URL ? args[0].toString() : 
                      String(args[0]);
          const errorText = await response.text();
          
          console.error(`🚨 HTTP ${response.status} Error:`, {
            url,
            status: response.status,
            statusText: response.statusText,
            response: errorText
          });

          setGlobalError({
            message: `HTTP ${response.status}: ${response.statusText}`,
            details: {
              url,
              status: response.status,
              response: errorText
            },
            timestamp: new Date()
          });

          toast({
            title: `Server Error (${response.status})`,
            description: `Request to ${url} failed. Check console for details.`,
            variant: "destructive",
            duration: 15000,
          });
        }
        
        return response;
      } catch (error) {
        const url = typeof args[0] === 'string' ? args[0] : 
                    args[0] instanceof Request ? args[0].url : 
                    args[0] instanceof URL ? args[0].toString() : 
                    String(args[0]);
        console.error('🚨 Fetch Error:', { url, error });
        
        setGlobalError({
          message: `Network error: ${error instanceof Error ? error.message : String(error)}`,
          details: { url, error },
          timestamp: new Date()
        });

        toast({
          title: "Network Error",
          description: `Failed to connect to ${url}`,
          variant: "destructive",
          duration: 15000,
        });
        
        throw error;
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleGlobalError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleGlobalError);
      window.fetch = originalFetch;
    };
  }, [toast]);

  // Display global error overlay if error is severe
  if (globalError && globalError.message.includes('500')) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 border-2 border-red-500 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-auto">
          <h3 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-4">
            Server Error Detected
          </h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Error:</h4>
              <p className="text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded border text-red-700 dark:text-red-300">
                {globalError.message}
              </p>
            </div>
            {globalError.details && (
              <div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Details:</h4>
                <pre className="text-sm bg-gray-100 dark:bg-gray-900 p-3 rounded border overflow-auto whitespace-pre-wrap text-gray-600 dark:text-gray-400">
                  {JSON.stringify(globalError.details, null, 2)}
                </pre>
              </div>
            )}
            <div className="flex gap-2">
              <button 
                onClick={() => window.location.reload()} 
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                data-testid="button-reload-error"
              >
                Reload Application
              </button>
              <button 
                onClick={() => setGlobalError(null)} 
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                data-testid="button-dismiss-error"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}