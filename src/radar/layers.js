import { visibleTiles } from "./projection.js";

export class TileLayer {
  constructor(element, onChange, nativeZoom) {
    this.element = element;
    this.onChange = onChange;
    this.nativeZoom = nativeZoom;
    this.tiles = new Map();
    this.alive = true;
  }
  update(view, width, height, urlFor) {
    const wanted = new Set();
    for (const tile of visibleTiles(view, width, height, this.nativeZoom)) {
      const url = urlFor(tile);
      if (!url) continue;
      const id = tile.key + "|" + url;
      wanted.add(id);
      let entry = this.tiles.get(id);
      if (!entry) {
        const image = document.createElement("img");
        image.alt = "";
        image.draggable = false;
        image.decoding = "async";
        // OSM requires a Referer from web pages. Browser HTTP caching remains on.
        image.referrerPolicy = "strict-origin-when-cross-origin";
        entry = { image, status: "loading", timer: null };
        this.tiles.set(id, entry);
        const complete = (ok) => {
          if (
            !this.alive ||
            this.tiles.get(id) !== entry ||
            entry.status !== "loading"
          )
            return;
          clearTimeout(entry.timer);
          entry.status = ok ? "loaded" : "error";
          image.style.visibility = ok ? "visible" : "hidden";
          this.onChange();
        };
        image.onload = () => complete(true);
        image.onerror = () => complete(false);
        entry.timer = setTimeout(() => complete(false), 12000);
        image.src = url;
        this.element.append(image);
      }
      Object.assign(entry.image.style, {
        left: tile.left + "px",
        top: tile.top + "px",
        width: tile.size + "px",
        height: tile.size + "px",
      });
    }
    for (const [id, entry] of this.tiles)
      if (!wanted.has(id)) {
        clearTimeout(entry.timer);
        entry.image.onload = entry.image.onerror = null;
        entry.image.remove();
        this.tiles.delete(id);
      }
  }
  counts() {
    const result = { loading: 0, error: 0, loaded: 0 };
    for (const tile of this.tiles.values()) result[tile.status]++;
    return result;
  }
  destroy() {
    this.alive = false;
    for (const tile of this.tiles.values()) {
      clearTimeout(tile.timer);
      tile.image.onload = tile.image.onerror = null;
      tile.image.remove();
    }
    this.tiles.clear();
  }
}
