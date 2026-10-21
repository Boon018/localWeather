// Web Mercator projection shared by basemap, RainViewer tiles and the marker.
export const TILE_SIZE = 256;
export const MIN_LATITUDE = -85.05112878;
export const MAX_LATITUDE = 85.05112878;

export function worldPoint(latitude, longitude, zoom) {
  const n = 2 ** zoom;
  const lat = Math.max(MIN_LATITUDE, Math.min(MAX_LATITUDE, Number(latitude)));
  const radians = (lat * Math.PI) / 180;
  return {
    x: ((Number(longitude) + 180) / 360) * n * TILE_SIZE,
    y: ((1 - Math.asinh(Math.tan(radians)) / Math.PI) / 2) * n * TILE_SIZE,
  };
}

export function tilePoint(latitude, longitude, zoom) {
  const world = worldPoint(latitude, longitude, zoom);
  return {
    x: Math.floor(world.x / TILE_SIZE),
    y: Math.floor(world.y / TILE_SIZE),
  };
}

export function wrapTileX(x, zoom) {
  const n = 2 ** zoom;
  return ((x % n) + n) % n;
}

export function validTileY(y, zoom) {
  const n = 2 ** zoom;
  return y >= 0 && y < n;
}

// Normalized world coordinates let the view remain stable across zoom levels.
export function normalizedPoint(latitude, longitude) {
  const p = worldPoint(latitude, longitude, 0);
  return { x: p.x / TILE_SIZE, y: p.y / TILE_SIZE };
}
export function geographicPoint({ x, y }) {
  return {
    latitude: (Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180) / Math.PI,
    longitude: ((((x * 360) % 360) + 360) % 360) - 180,
  };
}
export function wrapDelta(delta) {
  return delta - Math.round(delta);
}
export function constrainView(view) {
  view.x = ((view.x % 1) + 1) % 1;
  view.y = Math.max(0, Math.min(1, view.y));
  view.z = Math.max(3, Math.min(12, view.z));
  return view;
}
export function screenPoint(point, view, width, height) {
  const size = TILE_SIZE * 2 ** view.z;
  return {
    x: width / 2 + wrapDelta(point.x - view.x) * size,
    y: height / 2 + (point.y - view.y) * size,
  };
}
export function anchorAt(view, x, y, width, height) {
  const size = TILE_SIZE * 2 ** view.z;
  return {
    x: view.x + (x - width / 2) / size,
    y: view.y + (y - height / 2) / size,
  };
}
export function placeAnchor(view, anchor, x, y, width, height, zoom) {
  const z = Math.max(3, Math.min(12, zoom)),
    size = TILE_SIZE * 2 ** z;
  return constrainView(
    Object.assign(view, {
      z,
      x: anchor.x - (x - width / 2) / size,
      y: anchor.y - (y - height / 2) / size,
    }),
  );
}
// Both layers use this layout. RainViewer native zoom is capped at 7; scaling
// those tiles preserves geographic registration without requesting unsupported URLs.
export function visibleTiles(view, width, height, maxNativeZoom = 12) {
  const z = Math.min(Math.floor(view.z), maxNativeZoom),
    n = 2 ** z;
  const size = TILE_SIZE * 2 ** (view.z - z);
  const originX = view.x * n * size - width / 2;
  const originY = view.y * n * size - height / 2;
  const out = [];
  for (
    let y = Math.max(0, Math.floor(originY / size));
    y < Math.min(n, Math.ceil((originY + height) / size));
    y++
  ) {
    for (
      let x = Math.floor(originX / size);
      x < Math.ceil((originX + width) / size);
      x++
    ) {
      out.push({
        z,
        x: wrapTileX(x, z),
        y,
        key: `${z}/${x}/${y}`,
        left: x * size - originX,
        top: y * size - originY,
        size,
      });
    }
  }
  return out;
}
