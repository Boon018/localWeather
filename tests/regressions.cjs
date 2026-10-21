'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.join(__dirname,'..');const entry=process.env.ALPEN_ENTRY||'dist/index.html';
const script=fs.readFileSync(path.join(root,entry),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1].replace('};loadWeather();','};');
function storage(disk){return new Proxy({}, {get(t,k){if(k==='getItem')return k=>disk.get(k)??null;if(k==='setItem')return(k,v)=>{if(t.failWrite)throw Error('QuotaExceededError');disk.set(k,String(v))};if(k==='removeItem')return k=>disk.delete(k);return t[k]},set(t,k,v){t[k]=v;return true},ownKeys(){return [...disk.keys()]},getOwnPropertyDescriptor(t,k){if(disk.has(k))return{enumerable:true,configurable:true}}})}
const NOW=Math.floor(Date.now()/3600000)*3600;
function payload(){return {timezone:'Europe/Vienna',hourly:{time:Array.from({length:48},(_,i)=>NOW+i*3600),temperature_2m:Array(48).fill(12),precipitation:Array(48).fill(2.5),precipitation_probability:Array(48).fill(70)},current:{time:NOW,temperature_2m:12,precipitation:0}}}
function boot(disk=new Map()){
 const elements=new Map(),events={};let timerID=0;
 function el(id){if(!elements.has(id)){const e={id,innerHTML:'',textContent:'',value:id==='chartVar'?'temperature_2m':'',dataset:{},style:{},setAttribute(){},focus(){},querySelector(){return el(id+'button')},closest(){return null},getBoundingClientRect(){return{left:0,width:390}}};Object.defineProperty(e,'src',{set(v){e.request={url:v,loadHandlerAttached:typeof e.onload==='function',errorHandlerAttached:typeof e.onerror==='function'}},get(){return e.request?.url}});elements.set(id,e)}return elements.get(id)}
 const controls={fail:false,count:0,radar:null};const context={console,URL,URLSearchParams,AbortController,Intl,Date,Math,Map,Set,JSON,Number,String,Object,Array,Promise,Blob,setTimeout(){return ++timerID},clearTimeout(){},setInterval(){},navigator:{onLine:true},location:{search:'',protocol:'file:'},localStorage:storage(disk),document:{getElementById:el,querySelector(){return null},body:{dataset:{}},addEventListener(n,fn){events[n]=fn},hidden:false},MutationObserver:class{observe(){}},window:{__ALPEN_TEST__:true,addEventListener(){},scrollTo(){}},confirm(){return true},fetch:async url=>{const u=new URL(url);controls.count++;if(controls.fail)throw Error('offline');let d;if(u.hostname.includes('rainviewer'))d=controls.radar?await controls.radar():{host:'https://tilecache.rainviewer.com',radar:{past:[{time:NOW,path:'/v2/radar/abc123'}]}};else if(u.hostname.includes('warnungen'))d={properties:{warnings:[],location:{properties:{name:'Graz'}}}};else if(u.hostname.includes('geocoding'))d={results:[{name:'Vienna',latitude:48.2,longitude:16.3}]};else d=payload();return {ok:true,json:async()=>d}}};vm.createContext(context);vm.runInContext(script,context);return {A:context.window.Alpen,ctx:context,el,controls,disk,run:code=>vm.runInContext('with(window.Alpen){'+code+'}',context)};
}
(async()=>{
 const one=boot();await one.A.loadWeather(true);const savedAt=one.A.state.data.savedAt;assert(one.A.cacheDiagnostics().forecast);assert(one.A.cacheDiagnostics().write);assert(one.el('main').innerHTML.includes('id="searchForm"'));assert(one.el('main').innerHTML.includes('id="savedLocation"'));
 const strip=one.A.hourstrip([{time:NOW,temperature_2m:12,precipitation:2.5,precipitation_probability:70}]);assert(strip.includes('2.5 mm/h'));assert(strip.includes('70% chance'));
 // New JavaScript session, same disk: no memory map is shared.
 const two=boot(one.disk);two.ctx.navigator.onLine=false;await two.A.loadWeather(true);assert.equal(two.controls.count,0);assert.equal(two.A.state.data.savedAt,savedAt);assert(two.A.cacheDiagnostics().previousSession);
 two.ctx.navigator.onLine=true;two.controls.fail=true;await two.A.loadWeather(true);assert.equal(two.A.state.data.savedAt,savedAt);
 // A failed overwrite must not expose the older disk value during this session.
 two.A.Store.set('quota',1);two.ctx.localStorage.failWrite=true;two.A.Store.set('quota',2);assert.equal(two.A.Store.get('quota'),2);assert.equal(two.A.cacheDiagnostics().write,false);assert(two.A.Store.keys().includes('quota'));two.ctx.localStorage.failWrite=false;
 // Corrupt persisted forecast is rejected and replaced, without a render crash.
 const bad=new Map(one.disk);for(const k of bad.keys())if(k.includes('forecast:'))bad.set(k,JSON.stringify({savedAt:Date.now(),rows:'broken'}));const three=boot(bad);await three.A.loadWeather();assert.equal(three.A.state.data.rows.length,48);assert(three.controls.count>=4);
 // Radar persists through forecast-cache refresh and renders the interactive map.
 await one.A.radar();assert(one.A.state.radar);assert(one.el('main').innerHTML.includes('radarImage'));const frame=one.A.state.radar.frames[0].path;await one.A.loadWeather();assert.equal(one.A.state.radar.frames[0].path,frame);
 // Radar service failure stays next to the radar controls.
 one.controls.fail=true;await one.A.radar();assert(one.A.state.radarError.includes('could not load'));assert(one.el('main').innerHTML.includes('Radar could not load'));one.controls.fail=false;
 // A late radar response cannot populate a newly selected location.
 let release;one.controls.radar=()=>new Promise(r=>release=r);const pending=one.A.radar();one.A.selectLocation({name:'Vienna',latitude:48.2,longitude:16.3});release({host:'https://tilecache.rainviewer.com',radar:{past:[{time:NOW,path:'/v2/radar/old'}]}});await pending;assert.equal(one.A.state.radar,null);
 assert.throws(()=>one.A.normalizeRadar({host:'https://evil.example',radar:{past:[]}}));assert.throws(()=>one.A.normalizeRadar({host:'https://tilecache.rainviewer.com',radar:{past:[]}}));
 // Location controls work without GPS or a search provider.
 await one.A.gps();assert(one.A.state.gpsMessage.includes('unavailable'));one.A.state.view='weather';one.run('render()');one.el('searchInput').value='47.5, 14.2';await one.el('searchForm').onsubmit({preventDefault(){}});assert.equal(one.A.state.location.latitude,47.5);one.A.Store.set('favorites',[{name:'Salzburg',latitude:47.8,longitude:13.05}]);one.run('render()');one.el('savedLocation').value='0';one.el('savedLocation').onchange();assert.equal(one.A.state.location.name,'Salzburg');
 one.A.Store.clear();assert(![...one.disk.keys()].some(k=>k.startsWith(one.A.Store.prefix)));
 console.log('PASS: reload persistence, disk diagnostics, offline restart, failed refresh retention, quota overwrite, corrupt cache recovery, main-page search and favorites, hourly amount + probability, radar resume/error/race handling, GPS fallback. Tests use isolated JS sessions and a storage/DOM simulation; not an iPhone browser.');
})().catch(e=>{console.error(e);process.exitCode=1});
