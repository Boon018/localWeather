// Web Mercator projection shared by basemap, RainViewer tiles and the marker.
export const TILE_SIZE = 256;
export const MIN_LATITUDE = -85.05112878;
export const MAX_LATITUDE = 85.05112878;

export function worldPoint(latitude, longitude, zoom) {
  const n = 2 ** zoom;
  const lat = Math.max(MIN_LATITUDE, Math.min(MAX_LATITUDE, Number(latitude)));
  const radians = lat * Math.PI / 180;
  return {
    x: (Number(longitude) + 180) / 360 * n * TILE_SIZE,
    y: (1 - Math.asinh(Math.tan(radians)) / Math.PI) / 2 * n * TILE_SIZE
  };
}

export function tilePoint(latitude, longitude, zoom) {
  const world = worldPoint(latitude, longitude, zoom);
  return { x: Math.floor(world.x / TILE_SIZE), y: Math.floor(world.y / TILE_SIZE) };
}

export function wrapTileX(x, zoom) {
  const n = 2 ** zoom;
  return ((x % n) + n) % n;
}

export function validTileY(y, zoom) {
  const n = 2 ** zoom;
  return y >= 0 && y < n;
}
