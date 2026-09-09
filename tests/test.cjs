/* Built-in Node tests. Optional live fixtures: node tests/test.cjs /path/to/fixtures */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const entry=fs.existsSync(path.join(__dirname,'../dist/index.html'))?'../dist/index.html':'../index.html';
const html=fs.readFileSync(path.join(__dirname,entry),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1].replace('};loadWeather();','};');
const elements=new Map();const el=id=>{if(!elements.has(id))elements.set(id,{id,innerHTML:'',textContent:'',value:id==='chartVar'?'temperature_2m':'0',dataset:{},setAttribute(){},querySelector(){return el(id+'-button')},getBoundingClientRect(){return {left:0,width:400}}});return elements.get(id)};
let data=new Map(),requests=0,fail=new Set();
const fixtures=process.argv[2];
const baseTime=Date.UTC(2026,8,9)/1000;
function synthetic(model){return {timezone:'Europe/Vienna',current:{time:baseTime,temperature_2m:20,weather_code:0,is_day:1},hourly:{time:Array.from({length:384},(_,i)=>baseTime+i*3600),temperature_2m:Array(384).fill(model==='icon_seamless'?18:20),precipitation:Array(384).fill(0),wind_speed_10m:Array(384).fill(10),wind_gusts_10m:Array(384).fill(20),pressure_msl:Array(384).fill(1010),cloud_cover:Array(384).fill(30)}}}
function fixture(name){const p=fixtures&&path.join(fixtures,'alpen-'+name+'.json');return p&&fs.existsSync(p)?JSON.parse(fs.readFileSync(p)):synthetic(name)}
const context={console,URL,URLSearchParams,AbortController,Intl,Date,Map,Set,JSON,Math,Number,String,Object,Array,Promise,Blob,setTimeout,clearTimeout,setInterval(){},confirm(){return false},navigator:{onLine:true},location:{search:'',protocol:'file:'},localStorage:{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)},document:{getElementById:el,body:{dataset:{}},addEventListener(){},hidden:false,createElement:()=>({click(){}})},window:{addEventListener(){},scrollTo(){}},fetch:async u=>{requests++;u=new URL(u);const id=u.searchParams.get('models')||'search';if(fail.has(id)||fail.has('*'))throw Error('simulated network failure');return {ok:true,json:async()=>u.hostname.includes('warnungen')?{properties:{location:{properties:{name:'Graz'}},warnings:[]}}:u.hostname.includes('geocoding')?{results:[{name:'Graz',latitude:47.07,longitude:15.44}]}:fixture(id==='era5'?'history':id)}}};
vm.createContext(context);vm.runInContext(script,context);const A=context.window.Alpen;const run=s=>vm.runInContext(s,context);
(async()=>{
assert.throws(()=>A.normalize({hourly:{time:[1],temperature_2m:[null]}}));assert.equal(A.weightedMedian([{v:0,w:.8},{v:99,w:.2}]),0);
const single=A.consensus(null,[{id:'gfs_seamless',rows:[{time:baseTime,temperature_2m:5,precipitation:null}]}],baseTime);assert.equal(single[0].temperature_2m,5);assert.equal(single[0].precipitation,null);
const mixed=A.consensus({rows:[{time:baseTime,temperature_2m:100,precipitation_probability:70}]},[{id:'icon_seamless',rows:[{time:baseTime,temperature_2m:10,precipitation:0}]},{id:'gfs_seamless',rows:[{time:baseTime,temperature_2m:20,precipitation:50}]}],baseTime);assert(Math.abs(mixed[0].temperature_2m-12.857142857)<.0001);assert.equal(mixed[0].precipitation,0);assert.equal(mixed[0].precipitation_probability,70);assert.equal(mixed[0].contributors,2);
A.Store.set('test',{ok:true});assert.equal(A.Store.get('test').ok,true);context.localStorage.setItem=()=>{throw Error('quota')};A.Store.set('quota',42);assert.equal(A.Store.get('quota'),42);context.localStorage.setItem=(k,v)=>data.set(k,v);
await A.loadWeather(true);assert.equal(A.state.data.models.length,3);assert.equal(A.state.data.rows.length,384);assert(A.state.data.current);assert(A.daily(A.state.data.rows).length>=16);
for(const view of ['weather','hourly','history','models','locations','settings']){A.state.view=view;run('render()');assert(el('main').innerHTML.length>100,view)}
const cached=A.state.data,initial=requests;await A.loadWeather();assert.equal(requests,initial,'fresh cache avoids API calls');fail.add('icon_seamless');await A.loadWeather(true);assert.equal(A.state.data.models.length,2);assert(A.state.data.failures.includes('icon_seamless'));
fail.add('*');const previous=A.state.data;await A.loadWeather(true);assert.equal(A.state.data.savedAt,previous.savedAt,'failed refresh preserves cache');fail.clear();
const hist=await A.cachedHistory(A.state.location,'2025-09-09');assert(hist.rows.length>=24);const n=requests;await A.cachedHistory(A.state.location,'2025-09-09');assert.equal(requests,n);
assert.equal(run("esc('<img src=x onerror=alert(1)>')"),'&lt;img src=x onerror=alert(1)&gt;');
A.state.data.timezone='Europe/Vienna';assert.equal(A.dateKey(Date.UTC(2026,2,29,22)/1000),'2026-03-30');assert.equal(A.dateKey(Date.UTC(2026,9,25,23)/1000),'2026-10-26');
const dstStart=Date.UTC(2026,9,24,22)/1000,day=A.daily(Array.from({length:25},(_,i)=>({time:dstStart+i*3600,temperature_2m:10,precipitation:0})));assert.equal(day.length,1);assert.equal(day[0].rows.length,25);
context.navigator.onLine=false;const n2=requests;await A.loadWeather(true);assert.equal(requests,n2);assert(A.state.data,'offline cache exists');
console.log('PASS: syntax/runtime startup, six view renders, 384-hour normalization, consensus & missing values, independent provider failure, full failure with cache retention, cache TTL, history cache, storage quota fallback, escaping, timezone/DST and offline cache.');
})().catch(e=>{console.error(e);process.exitCode=1});
