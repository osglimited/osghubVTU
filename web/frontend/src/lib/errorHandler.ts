// Error types
type ErrorWithMessage = {
  message: string;
  status?: number;
  code?: string;
  stack?: string;
};

/**
 * Checks if the error is an object with a message property
 */
function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  );
}

/**
 * Converts unknown error to ErrorWithMessage
 */
function toErrorWithMessage(error: unknown): ErrorWithMessage {
  if (isErrorWithMessage(error)) return error;

  try {
    return {
      message: error instanceof Error ? error.message : JSON.stringify(error),
      stack: error instanceof Error ? error.stack : undefined,
    };
  } catch {
    // Fallback in case there's an error during stringification
    return { message: String(error) };
  }
}

/**
 * Logs errors to the console with additional context
 */
export function logError(
  error: unknown,
  context: Record<string, unknown> = {}
): ErrorWithMessage {
  const errorWithMessage = toErrorWithMessage(error);
  
  // Log to console with context
  console.error('\n--- ERROR ---');
  console.error('Message:', errorWithMessage.message);
  
  if (errorWithMessage.status) {
    console.error('Status:', errorWithMessage.status);
  }
  
  if (errorWithMessage.code) {
    console.error('Code:', errorWithMessage.code);
  }
  
  if (Object.keys(context).length > 0) {
    console.error('Context:', context);
  }
  
  if (errorWithMessage.stack) {
    console.error('Stack trace:');
    console.error(errorWithMessage.stack);
  }
  
  console.error('--- END ERROR ---\n');
  
  return errorWithMessage;
}

/**
 * Creates an error handler that logs errors with context
 */
export function createErrorHandler(context: Record<string, unknown> = {}) {
  return (error: unknown): ErrorWithMessage => {
    return logError(error, context);
  };
}
