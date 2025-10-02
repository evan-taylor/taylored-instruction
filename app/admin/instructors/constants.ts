// Time constants for date calculations
export const MILLISECONDS_PER_SECOND = 1000;
export const SECONDS_PER_MINUTE = 60;
export const MINUTES_PER_HOUR = 60;
export const HOURS_PER_DAY = 24;
export const MILLISECONDS_PER_DAY =
  MILLISECONDS_PER_SECOND *
  SECONDS_PER_MINUTE *
  MINUTES_PER_HOUR *
  HOURS_PER_DAY;

// Last login thresholds (in days)
export const DAYS_IN_WEEK = 7;
export const DAYS_IN_MONTH = 30;

// Admin email addresses
export const ADMIN_EMAILS: readonly string[] = [
  "admin@tayloredinstruction.com",
  "evan@tayloredinstruction.com",
];
