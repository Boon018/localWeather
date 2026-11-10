import assert from "node:assert/strict";
import {
  displayWeatherCode,
  currentDisplayRow,
  dailyDisplayRow,
} from "../src/weather/conditions.js";
const dry = {
  weather_code: 61,
  precipitation: 0,
  precipitation_probability: 30,
  cloud_cover: 90,
};
for (const weather_code of [51, 53, 55, 61, 63, 65, 80, 81, 82])
  assert.equal(displayWeatherCode({ ...dry, weather_code }), 3);
for (const [cloud_cover, expected] of [
  [0, 0],
  [20, 1],
  [50, 2],
  [90, 3],
  [null, 3],
])
  assert.equal(displayWeatherCode({ ...dry, cloud_cover }), expected);
assert.equal(
  displayWeatherCode({
    ...dry,
    precipitation: 0.049,
    precipitation_probability: 39.9,
  }),
  3,
);
for (const patch of [
  { precipitation: 0.05 },
  { precipitation: 2 },
  { precipitation_probability: 40 },
  { precipitation_probability: null },
  { precipitation: null },
  { precipitation: -1 },
])
  assert.equal(displayWeatherCode({ ...dry, ...patch }), 61);
for (const weather_code of [
  0, 3, 45, 48, 56, 57, 66, 67, 71, 73, 75, 77, 85, 86, 95, 96, 99,
])
  assert.equal(displayWeatherCode({ ...dry, weather_code }), weather_code);
const current = { ...dry, time: 10000, precipitation: 0.2 };
assert.equal(
  displayWeatherCode(currentDisplayRow(current, [{ ...dry, time: 10000 }])),
  61,
);
assert.equal(
  displayWeatherCode(
    currentDisplayRow({ ...current, precipitation: 0 }, [
      { ...dry, time: 10000 },
    ]),
  ),
  3,
);
assert.equal(
  displayWeatherCode(
    currentDisplayRow({ ...current, precipitation: 0 }, [{ ...dry, time: 0 }]),
  ),
  61,
);
assert.equal(
  displayWeatherCode(
    dailyDisplayRow({ code: 61, precip: 0, prob: 30, rows: [dry] }),
  ),
  3,
);
assert.equal(
  displayWeatherCode(
    dailyDisplayRow({ code: 61, precip: 0.2, prob: 30, rows: [dry] }),
  ),
  61,
);
assert.equal(dry.weather_code, 61);
assert.equal(
  displayWeatherCode(
    currentDisplayRow({ ...current, time: 12700, precipitation: 0 }, [
      { ...dry, time: 10000 },
      { ...dry, time: 13600, precipitation_probability: 80 },
    ]),
  ),
  3,
);
console.log(
  "PASS: dry/low-probability rain icons, thresholds, missing values, hazardous codes and current/daily interval handling.",
);
