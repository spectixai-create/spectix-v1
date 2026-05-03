// Update APP_VERSION, APP_SPIKE_NUMBER, APP_BUILD_DATE in PR description
// before each spike merge. Format per D-013: Spike #N • YYYY-MM-DD
export const APP_VERSION = '0.16.0';
export const APP_SPIKE_NUMBER = 16;
export const APP_BUILD_DATE = '2025-05-03';

export function getVersionString() {
  return `Spectix Spike #${APP_SPIKE_NUMBER.toString().padStart(2, '0')} • ${APP_BUILD_DATE}`;
}
