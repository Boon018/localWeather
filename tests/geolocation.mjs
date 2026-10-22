import assert from "node:assert/strict";
import { requestLocation } from "../src/api/geolocation.js";
function fixture() {
  const jobs = new Map();
  let id = 0,
    one,
    watch,
    success = 0,
    error = 0,
    cleared = [];
  const timers = {
    setTimeout(fn, ms) {
      jobs.set(++id, { fn, ms });
      return id;
    },
    clearTimeout(id) {
      jobs.delete(id);
    },
  };
  const geo = {
    getCurrentPosition(ok, fail) {
      one = { ok, fail };
    },
    watchPosition(ok, fail) {
      watch = { ok, fail };
      return 42;
    },
    clearWatch(id) {
      cleared.push(id);
    },
  };
  const cancel = requestLocation(
    geo,
    () => success++,
    () => error++,
    timers,
  );
  return {
    get one() {
      return one;
    },
    get watch() {
      return watch;
    },
    get success() {
      return success;
    },
    get error() {
      return error;
    },
    jobs,
    cleared,
    cancel,
    advance(ms) {
      for (const [id, j] of [...jobs])
        if (j.ms === ms) {
          jobs.delete(id);
          j.fn();
        }
    },
  };
}
const p = { coords: { latitude: 47.3, longitude: 15.06 } };
let f = fixture();
f.advance(15000);
assert(f.watch);
f.one.ok(p);
assert.equal(f.success, 1);
assert.deepEqual(f.cleared, [42]);
f.watch.ok(p);
assert.equal(f.success, 1);
assert.equal(f.jobs.size, 0);
f = fixture();
f.one.fail({ code: 1 });
assert.equal(f.error, 1);
assert.equal(f.watch, undefined);
assert.equal(f.jobs.size, 0);
f = fixture();
f.one.fail({ code: 2 });
assert(f.watch);
f.watch.ok(p);
assert.equal(f.success, 1);
f = fixture();
f.advance(15000);
f.advance(60000);
assert.equal(f.error, 1);
assert.deepEqual(f.cleared, [42]);
f.one.ok(p);
assert.equal(f.success, 0);
f = fixture();
f.advance(15000);
f.cancel();
f.one.ok(p);
f.watch.ok(p);
assert.equal(f.success, 0);
assert.equal(f.jobs.size, 0);
console.log(
  "PASS: delayed GPS success, denial, transient fallback, timeout and cancellation clean up the one-shot watch.",
);
