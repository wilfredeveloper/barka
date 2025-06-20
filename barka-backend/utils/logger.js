/**
 * Enhanced logger utility for the application
 */

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',
  
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m'
};

/**
 * Format the current timestamp
 * @returns {string} Formatted timestamp
 */
const timestamp = () => {
  const now = new Date();
  return now.toISOString();
};

/**
 * Log an info message
 * @param {string} message - The message to log
 * @param {Object} data - Optional data to include
 */
const info = (message, data = null) => {
  console.log(`${colors.green}[INFO]${colors.reset} ${colors.dim}${timestamp()}${colors.reset} ${message}`);
  if (data) {
    console.log(data);
  }
};

/**
 * Log a warning message
 * @param {string} message - The message to log
 * @param {Object} data - Optional data to include
 */
const warn = (message, data = null) => {
  console.log(`${colors.yellow}[WARN]${colors.reset} ${colors.dim}${timestamp()}${colors.reset} ${message}`);
  if (data) {
    console.log(data);
  }
};

/**
 * Log an error message
 * @param {string} message - The message to log
 * @param {Error|Object} error - Optional error to include
 */
const error = (message, err = null) => {
  console.error(`${colors.red}[ERROR]${colors.reset} ${colors.dim}${timestamp()}${colors.reset} ${message}`);
  if (err) {
    if (err instanceof Error) {
      console.error(`${colors.red}${err.stack || err}${colors.reset}`);
    } else {
      console.error(err);
    }
  }
};

/**
 * Log a debug message (only in development)
 * @param {string} message - The message to log
 * @param {Object} data - Optional data to include
 */
const debug = (message, data = null) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`${colors.cyan}[DEBUG]${colors.reset} ${colors.dim}${timestamp()}${colors.reset} ${message}`);
    if (data) {
      console.log(data);
    }
  }
};

/**
 * Log an AI-related message
 * @param {string} message - The message to log
 * @param {Object} data - Optional data to include
 */
const ai = (message, data = null) => {
  console.log(`${colors.magenta}[AI]${colors.reset} ${colors.dim}${timestamp()}${colors.reset} ${message}`);
  if (data) {
    console.log(data);
  }
};

module.exports = {
  info,
  warn,
  error,
  debug,
  ai
};
