// Storage contracts are intentionally kept compatible with the v1 application.
export const STORAGE_PREFIX = 'alpen.v1.';
export const storageKey = (kind, suffix = '') => `${STORAGE_PREFIX}${kind}${suffix ? `:${suffix}` : ''}`;
export const locationKey = (location) => `${Number(location.latitude).toFixed(3)},${Number(location.longitude).toFixed(3)}`;
