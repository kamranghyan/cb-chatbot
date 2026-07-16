/**
 * ENV — single source of truth for configuration.
 *
 * THIS is the only file that changed when the project moved from CRA to
 * Next.js (REACT_APP_* → NEXT_PUBLIC_*). Every other layer — client,
 * endpoints, services, mocks, hooks, UI — was ported without edits.
 * That is the payoff of centralising configuration.
 *
 * NOTE: Next.js inlines NEXT_PUBLIC_* at build time, so each variable must
 * be referenced literally (no dynamic process.env[key] lookups).
 */

const bool = (v: string | undefined, fallback = false): boolean =>
  v === undefined || v === '' ? fallback : v.toLowerCase() === 'true';

export const ENV = {
  APP_ENVIRONMENT: process.env.NEXT_PUBLIC_ENVIRONMENT ?? 'DEV',

  /** Base URL of the backend API — THE value to change when the backend is ready. */
  API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL ?? '',

  /**
   * MOCK MODE SWITCH.
   * true  → all HTTP requests answered by src/core/api/mock (no network).
   * false → requests go to API_BASE_URL.
   * The UI cannot tell the difference: same URLs, envelopes and errors.
   */
  USE_MOCK_API: bool(process.env.NEXT_PUBLIC_USE_MOCK_API, false),

  /** Artificial latency (ms) for mock responses so loading states are visible. */
  MOCK_LATENCY_MS: Number(process.env.NEXT_PUBLIC_MOCK_LATENCY_MS ?? 400),
} as const;
