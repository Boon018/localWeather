import { anchorAt, placeAnchor, constrainView } from "./projection.js";

export function installGestures(surface, view, draw) {
  const pointers = new Map();
  let gesture = null;
  const position = (e) => {
    const r = surface.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const dimensions = () => ({
    width: surface.clientWidth,
    height: surface.clientHeight,
  });
  function reset() {
    const p = [...pointers.values()];
    if (!p.length) {
      gesture = null;
      return;
    }
    const mid =
      p.length > 1
        ? { x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2 }
        : p[0];
    const { width, height } = dimensions();
    gesture = {
      anchor: anchorAt(view, mid.x, mid.y, width, height),
      zoom: view.z,
      distance:
        p.length > 1
          ? Math.max(1, Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y))
          : 0,
    };
  }
  surface.onpointerdown = (e) => {
    if (e.button !== 0 || e.target.closest("button, a, input")) return;
    pointers.set(e.pointerId, position(e));
    try {
      surface.setPointerCapture(e.pointerId);
    } catch {
      /* Pointer may have ended before capture. */
    }
    reset();
    surface.classList.add("dragging");
  };
  surface.onpointermove = (e) => {
    if (!pointers.has(e.pointerId) || !gesture) return;
    pointers.set(e.pointerId, position(e));
    const p = [...pointers.values()];
    const mid =
      p.length > 1
        ? { x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2 }
        : p[0];
    const distance =
      p.length > 1
        ? Math.max(1, Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y))
        : 0;
    const z = gesture.distance
      ? gesture.zoom + Math.log2(distance / gesture.distance)
      : gesture.zoom;
    const { width, height } = dimensions();
    placeAnchor(view, gesture.anchor, mid.x, mid.y, width, height, z);
    draw();
  };
  const end = (e) => {
    pointers.delete(e.pointerId);
    reset();
    if (!pointers.size) surface.classList.remove("dragging");
  };
  surface.onpointerup =
    surface.onpointercancel =
    surface.onlostpointercapture =
      end;
  const wheel = (e) => {
    e.preventDefault();
    const p = position(e),
      { width, height } = dimensions();
    placeAnchor(
      view,
      anchorAt(view, p.x, p.y, width, height),
      p.x,
      p.y,
      width,
      height,
      view.z + (e.deltaY < 0 ? 0.5 : -0.5),
    );
    draw();
  };
  surface.addEventListener("wheel", wheel, { passive: false });
  surface.onkeydown = (e) => {
    if (e.target !== surface) return;
    const step = 80 / (256 * 2 ** view.z);
    const delta = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    }[e.key];
    if (delta) {
      e.preventDefault();
      view.x += delta[0];
      view.y += delta[1];
      constrainView(view);
      draw();
    }
    if (["+", "=", "-"].includes(e.key)) {
      e.preventDefault();
      view.z = Math.max(3, Math.min(12, view.z + (e.key === "-" ? -1 : 1)));
      draw();
    }
  };
  return () => {
    surface.removeEventListener("wheel", wheel);
    surface.onpointerdown =
      surface.onpointermove =
      surface.onpointerup =
      surface.onpointercancel =
      surface.onlostpointercapture =
      surface.onkeydown =
        null;
    pointers.clear();
  };
}
