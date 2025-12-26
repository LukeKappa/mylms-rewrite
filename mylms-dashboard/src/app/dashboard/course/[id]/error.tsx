'use client';

export default function CourseError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isAuthError = error.message?.includes('token') || 
                      error.message?.includes('auth') ||
                      error.message?.includes('Not authenticated');
  
  const isAPIError = error.message?.includes('Module not found') ||
                     error.message?.includes('Failed to fetch');

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-neutral-900 rounded-lg border border-neutral-800 p-8">
        <div className="text-center">
          {/* Error Icon */}
          <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
               d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          {/* Error Title */}
          <h1 className="text-2xl font-bold text-white mb-2">
            {isAuthError 
              ? 'Authentication Error' 
              : isAPIError 
              ? 'Course Load Error' 
              : 'Something Went Wrong'}
          </h1>

          {/* Error Message */}
          <p className="text-neutral-400 mb-6">
            {isAuthError
              ? 'Your session may have expired. Please log in again.'
              : isAPIError
              ? 'Unable to load course content from Moodle. The course may not be available or you may not have access.'
              : 'An unexpected error occurred while loading this course.'}
          </p>

          {/* Error Details (in development) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mb-6 p-4 bg-neutral-950 rounded border border-neutral-800 text-left">
              <p className="text-xs font-mono text-neutral-500 break-all">
                {error.message}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3">
            {isAuthError ? (
              <a
                href="/"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                Return to Login
              </a>
            ) : (
              <>
                <button
                  onClick={reset}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
                >
                  Try Again
                </button>
                <a
                  href="/dashboard"
                  className="w-full bg-neutral-800 hover:bg-neutral-700 text-white font-medium py-2 px-4 rounded transition-colors"
                >
                  Back to Dashboard
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
