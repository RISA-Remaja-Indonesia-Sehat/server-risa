const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const JAKARTA_OFFSET = '+07:00';

/**
 * Parses a date string (YYYY-MM-DD) to a Date object at midnight Jakarta time.
 * The resulting Date is stored in MongoDB as UTC (7 hours behind).
 *
 * Example: '2024-10-22' → 2024-10-22T00:00:00+07:00 → stored as 2024-10-21T17:00:00Z
 *
 * @param {string|Date} value - Date string or Date object
 * @param {string} label - Label for error messages (e.g., 'start date')
 * @param {Object} options - Optional validation { allowFuture: boolean, maxYearsAhead: number }
 * @returns {Date|null} Parsed Date object or null
 */
const parseDate = (value, label, options = {}) => {
  if (!value) return null;
  if (value instanceof Date) return value;

  const dateString = String(value).trim();

  // Validate format
  if (!DATE_PATTERN.test(dateString)) {
    const error = new Error(`Invalid ${label} format. Expected YYYY-MM-DD.`);
    error.code = 'INVALID_DATE_FORMAT';
    throw error;
  }

  // Parse date
  const parsed = new Date(`${dateString}T00:00:00${JAKARTA_OFFSET}`);

  if (Number.isNaN(parsed.getTime())) {
    const error = new Error(`Invalid ${label} value.`);
    error.code = 'INVALID_DATE';
    throw error;
  }

  // Optional: Validate not too far in future
  if (options.maxYearsAhead && !options.allowFuture) {
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + (options.maxYearsAhead || 1));

    if (parsed > maxDate) {
      const error = new Error(`${label} cannot be more than ${options.maxYearsAhead} year(s) in the future.`);
      error.code = 'INVALID_DATE_RANGE';
      throw error;
    }
  }

  return parsed;
};

/**
 * Extracts and validates userId from authenticated request.
 *
 * @param {Object} req - Express request object
 * @returns {string} User ID
 * @throws {Error} If user is not authenticated
 */
const ensureUser = (req) => {
  const userId = req.user?.userId ?? req.user?.id;
  if (!userId) {
    const error = new Error('Unauthorized. Please log in.');
    error.code = 'UNAUTHORIZED';
    throw error;
  }
  return userId;
};

/**
 * Centralized error response handler.
 * Supports custom error handlers and default HTTP status codes.
 *
 * @param {Object} res - Express response object
 * @param {Error} error - Error object with optional `code` property
 * @param {Object} customHandlers - Custom error handlers { CODE: (err, res) => {...} }
 */
const respondWithError = (res, error, customHandlers = {}) => {
  // Custom handlers have priority
  if (error.code && typeof customHandlers[error.code] === 'function') {
    return customHandlers[error.code](error, res);
  }

  const message = error.message || 'An unexpected error occurred';

  // Map error codes to HTTP status codes
  switch (error.code) {
    // 400 - Bad Request
    case 'INVALID_DATE_FORMAT':
    case 'INVALID_DATE':
    case 'INVALID_DATE_RANGE':
    case 'INVALID_CYCLE_ID':
    case 'INVALID_MOOD':
    case 'INVALID_FLOW_LEVEL':
    case 'INVALID_SYMPTOMS':
      return res.status(400).json({ message });

    // 401 - Unauthorized
    case 'UNAUTHORIZED':
      return res.status(401).json({ message });

    // 404 - Not Found
    case 'CYCLE_NOT_FOUND':
    case 'NOTE_NOT_FOUND':
      return res.status(404).json({ message });

    // 409 - Conflict
    case 'CYCLE_OVERLAP':
      return res.status(409).json({ message });

    // 422 - Unprocessable Entity (validation errors)
    case 'VALIDATION_ERROR':
      return res.status(422).json({
        message,
        details: error.details || null,
      });

    // 500 - Internal Server Error
    default:
      // Don't leak internal errors to client
      console.error('Unhandled error:', error);
      return res.status(500).json({
        message: 'Internal server error. Please try again later.',
        // Only include error details in development
        ...(process.env.NODE_ENV === 'development' && { error: message }),
      });
  }
};

/**
 * Validates that a date is within a reasonable range.
 * Useful for preventing obvious data entry errors.
 *
 * @param {Date} date - Date to validate
 * @param {Object} options - { minYearsAgo: number, maxYearsAhead: number }
 * @returns {boolean} True if valid
 */
const isDateInReasonableRange = (date, options = {}) => {
  const { minYearsAgo = 3, maxYearsAhead = 1 } = options;

  const now = new Date();
  const minDate = new Date();
  minDate.setFullYear(now.getFullYear() - minYearsAgo);

  const maxDate = new Date();
  maxDate.setFullYear(now.getFullYear() + maxYearsAhead);

  return date >= minDate && date <= maxDate;
};

module.exports = {
  parseDate,
  ensureUser,
  respondWithError,
  isDateInReasonableRange,
};
