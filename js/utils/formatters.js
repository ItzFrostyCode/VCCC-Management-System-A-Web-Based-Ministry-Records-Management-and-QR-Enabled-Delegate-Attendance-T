/**
 * formatters.js — Shared formatting utilities
 * Previously empty. Populated with common formatters used across the app.
 * Import what you need: import { formatDate, formatDateRelative } from '../utils/formatters.js'
 */

/**
 * Format an ISO date string to a readable short date.
 * @param {string} isoStr - ISO 8601 date string
 * @param {string} precision - 'year' | 'month' | 'exact' (default)
 * @returns {string}
 */
export function formatDate(isoStr, precision = 'exact') {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return 'Invalid Date';

  if (precision === 'year')  return d.getFullYear().toString();
  if (precision === 'month') return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Format a date as a relative time string ("Just now", "3m ago", "2h ago", "5d ago").
 * @param {string} isoStr - ISO 8601 date/datetime string
 * @returns {string}
 */
export function formatDateRelative(isoStr) {
  if (!isoStr) return '';
  const d   = new Date(isoStr);
  const now = new Date();
  const diffSec = Math.floor((now - d) / 1000);

  if (diffSec < 60)    return 'Just now';
  if (diffSec < 3600)  return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

/**
 * Format a datetime string to time only (e.g. "09:45 AM").
 * @param {string} isoStr
 * @returns {string}
 */
export function formatTimeOnly(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Capitalize the first letter of each word in a string.
 * @param {string} str
 * @returns {string}
 */
export function capitalizeWords(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Format a snake_case or UPPER_CASE status code to a human-readable label.
 * E.g. 'status_code', 'ACTIVE' -> 'Active'
 * @param {string} code
 * @returns {string}
 */
export function formatStatusCode(code) {
  if (!code) return '—';
  return code
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Truncate a string to maxLength characters, appending '…' if truncated.
 * @param {string} str
 * @param {number} maxLength
 * @returns {string}
 */
export function truncate(str, maxLength = 50) {
  if (!str) return '';
  return str.length > maxLength ? str.slice(0, maxLength) + '…' : str;
}

/**
 * Format a number with optional locale separators (e.g. 1234 -> "1,234").
 * @param {number} num
 * @returns {string}
 */
export function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  return Number(num).toLocaleString();
}
