# Radar contract

Reviewed 2026-10-21:
- https://www.rainviewer.com/api/weather-maps-api.html
- https://www.rainviewer.com/api.html
- https://operations.osmfoundation.org/policies/tiles/

The metadata endpoint is account-free. Only `radar.past` is used: the documented
past two-hour sequence in ten-minute frames. The general API page mentions a
five-minute refresh; metadata is therefore cached in memory for five minutes.
The specific endpoint documentation takes precedence over general FAQ references
to nowcasts. No future prediction is presented.

Use the returned HTTPS host/path after validation. Radar native zoom is capped
at 7; larger display zooms scale those same native tiles. Base and overlay tiles
share the same normalized Web Mercator viewport, with 256-pixel native tiles.
Latitude is clamped to Mercator bounds; longitude wraps and invalid Y tiles are
excluded. Pointer-anchored zoom preserves the world point under the gesture.

Only visible tiles are requested. Tile nodes are reused between frames of a pan;
browser HTTP caching is respected, no bulk download or offline tile cache is
offered. Missing radar tiles do not remove the basemap. Requests have a 12-second
display timeout and stale image callbacks are ignored. Playback waits for current
tiles to settle, stops when hidden/unmounted, and does not preload future frames.

OSM requires visible attribution and a Referer for web pages. Requests use
strict-origin-when-cross-origin (origin only, no search/location URL contents).
For `file:` standalone testing, street-map requests are disabled because that
context cannot provide the required web Referer; radar remains available when
the browser permits its requests. The HTTPS Pages app has the full map.

RainViewer permits personal/educational and small community use, requires linked
attribution and provides no availability guarantee. No hard rate limit is posted.
This prototype is not suitable for high-volume commercial use without revisiting
provider terms. Radar data is reflectivity, not an hourly rainfall total and not
an official weather warning. Transparent tiles are not evidence of an all-clear.
