// One user-requested fix. A short high-accuracy watch is a fallback only; it is
// cleared on success, cancellation or the final deadline, never kept tracking.
export function requestLocation(geo, success, failure, timers = globalThis) {
  let ended = false,
    watch = null,
    retry = null,
    deadline = null;
  const cancel = () => {
    ended = true;
    timers.clearTimeout(retry);
    timers.clearTimeout(deadline);
    if (watch !== null) geo.clearWatch(watch);
  };
  const finish = (fn, value) => {
    if (!ended) {
      cancel();
      fn(value);
    }
  };
  const ok = (p) => {
    if (
      !Number.isFinite(p?.coords?.latitude) ||
      !Number.isFinite(p?.coords?.longitude)
    )
      return;
    finish(success, p);
  };
  const error = (e) => {
    if (ended) return;
    if (e.code === 1) finish(failure, e);
    else fallback();
  };
  let attempted = false;
  function fallback() {
    if (ended || attempted) return;
    attempted = true;
    try {
      if (typeof geo.watchPosition === "function") {
        const id = geo.watchPosition(
          ok,
          (e) => {
            if (e.code === 1) finish(failure, e);
          },
          { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 },
        );
        watch = id;
        if (ended) geo.clearWatch(id);
      } else
        geo.getCurrentPosition(
          ok,
          (e) => {
            if (e.code === 1) finish(failure, e);
          },
          { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 },
        );
    } catch {
      finish(failure, { code: 2 });
    }
  }
  deadline = timers.setTimeout(() => finish(failure, { code: 3 }), 60000);
  retry = timers.setTimeout(fallback, 15000);
  try {
    geo.getCurrentPosition(ok, error, {
      enableHighAccuracy: false,
      timeout: 20000,
      maximumAge: 60000,
    });
  } catch {
    finish(failure, { code: 2 });
  }
  return cancel;
}
