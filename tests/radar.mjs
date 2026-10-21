import assert from 'node:assert/strict';
import { normalizedPoint,geographicPoint,visibleTiles,screenPoint,anchorAt,placeAnchor } from '../src/radar/projection.js';
import { normalizeRadar } from '../src/api/rainViewer.js';
assert.deepEqual(normalizedPoint(0,0),{x:.5,y:.5});
for(const [lat,lon]of [[47.0707,15.4395],[48.2082,16.3738],[-33.8688,151.2093],[0,179.99],[0,-179.99]])for(const z of [3,5,7,9.5,12]){
 const p=normalizedPoint(lat,lon),geo=geographicPoint(p),view={...p,z};
 assert(Math.abs(lat-geo.latitude)<1e-8);assert(Math.abs(lon-geo.longitude)<1e-8);
 for(const [width,height]of [[240,300],[390,390],[900,520]]){
  assert.deepEqual(screenPoint(p,view,width,height),{x:width/2,y:height/2});
  for(const max of [7,12]){
   const tiles=visibleTiles(view,width,height,max);
   assert(tiles.length<=35);assert(tiles.every(t=>t.z<=max&&t.y>=0&&t.y<2**t.z&&t.x>=0&&t.x<2**t.z));
   // A projected geographic point is in the same place in both tile grids.
   const t=tiles.find(t=>t.left<=width/2&&t.left+t.size>width/2&&t.top<=height/2&&t.top+t.size>height/2);
   assert(t,'selected location must lie in a visible tile');
   const fx=p.x*2**t.z-t.x,fy=p.y*2**t.z-t.y;
   assert(Math.abs(t.left+fx*t.size-width/2)<1e-6);assert(Math.abs(t.top+fy*t.size-height/2)<1e-6);
  }
 }
}
const view={...normalizedPoint(47.0707,15.4395),z:7},anchor=anchorAt(view,70,100,390,390);
placeAnchor(view,anchor,70,100,390,390,9);
const fixed=screenPoint(anchor,view,390,390);assert(Math.abs(fixed.x-70)<1e-6&&Math.abs(fixed.y-100)<1e-6);
const past=normalizeRadar({host:'https://tilecache.rainviewer.com',radar:{past:[{time:2,path:'/v2/radar/two'},{time:1,path:'/v2/radar/one'},{time:2,path:'/v2/radar/two'},{time:4,path:'/../../evil'}]}});
assert.deepEqual(past.frames.map(f=>f.time),[1,2]);
assert.throws(()=>normalizeRadar({host:'https://evil.example',radar:{past:[]}}));
assert.throws(()=>normalizeRadar({host:'https://tilecache.rainviewer.com:4433',radar:{past:[]}}));
console.log('PASS: geographic round trips, centering, scaled radar/basemap alignment, wrapped tiles, pointer anchor and metadata validation.');
