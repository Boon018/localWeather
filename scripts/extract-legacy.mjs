// One-time, mechanical extraction from recovery/v1.2.0. Not part of the build.
import fs from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'acorn';
import { format } from 'prettier';
const html=await fs.readFile('index.html','utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const source=scripts[0], ast=parse(source,{ecmaVersion:'latest'});
const mapping=Object.create(null);
function assign(file,names){for(const name of names.split(' '))mapping[name]=file;}
assign('storage/storage.js','Store priorCacheProbe');
assign('storage/cache.js','cacheDiagnostics validCache cacheReport prune');
assign('app/state.js','DEFAULT settings state');
assign('ui/format.js','$ finite esc key fmt unit temp wind rain direction time dateKey condition');
assign('ui/status.js','status updated');
assign('api/http.js','json');
assign('api/openMeteo.js','CORE EXTRA MODELS Provider');
assign('weather/normalize.js','normalize');
assign('weather/consensus.js','weightedMedian weight consensus daily');
assign('weather/modelScoring.js','saveSnapshots scoresHTML score');
assign('weather/forecast.js','loadWeather');
assign('ui/components.js','metric upcoming hourstrip empty sumComplete');
assign('ui/weatherView.js','weatherView');
assign('ui/charts.js','chartOptions chartHTML tableHTML hourlyView drawChart');
assign('ui/historyView.js','historyView');
assign('ui/modelsView.js','modelView');
assign('ui/locationsView.js','locationControls locationsView searchResults');
assign('ui/settingsView.js','settingSelect settingsView exportData');
assign('app/navigation.js','NAV render');
assign('app/location.js','selectLocation locationMessage gps');
assign('weather/history.js','cachedHistory getHistory compareHistory');
assign('api/geoSphere.js','loadWarnings warningsCard');
assign('radar/legacy.js','radarBasemap radarContent normalizeRadar radar radarImages radarWorld radarTileURL renderInteractiveRadar radarImagesOriginal');
assign('app/events.js','bind');
const groups=new Map();
function add(file,text){groups.set(file,(groups.get(file)||'')+text+'\n');}
for(const node of ast.body){
 if(node.type==='FunctionDeclaration'&&ast.body.some(n=>n.type==='FunctionDeclaration'&&n.id.name===node.id.name&&n.start>node.start))continue;
 const text=source.slice(node.start,node.end);
 const names=node.type==='FunctionDeclaration'?[node.id.name]:node.type==='VariableDeclaration'?node.declarations.map(d=>d.id.name):[];
 if(names.length){const file=mapping[names[0]];if(!file)throw Error(names);add(file,'export '+text);}
 else if(text.startsWith('radarImages='))add('radar/legacy.js',text);
 else if(text.startsWith("Store.set('persistenceProbe'"))add('storage/storage.js',text);
 else if(text!=="'use strict';")add('main.js',text);
}
// Explicit imports, mechanically inferred from original identifier references.
for(const [file,body]of groups){
 const refs=new Set();function visit(n){if(!n||typeof n!=='object')return;if(n.type==='Identifier')refs.add(n.name);for(const v of Object.values(n))if(Array.isArray(v))v.forEach(visit);else if(v&&typeof v==='object')visit(v);}
 visit(parse(body,{sourceType:'module',ecmaVersion:'latest'}));
 const imports=new Map();for(const name of refs){const owner=mapping[name];if(owner&&owner!==file){const rel=path.relative(path.dirname(file),owner);const from=rel.startsWith('.')?rel:'./'+rel;imports.set(from,[...(imports.get(from)||[]),name]);}}
 let out=[...imports].map(([from,names])=>`import { ${names.join(', ')} } from '${from}';`).join('\n')+'\n'+body;
 if(file==='main.js')out=out.replace('loadWeather();\n','if (!window.__ALPEN_TEST__) loadWeather();\n')+'\n'+scripts[1];
 await fs.mkdir(path.dirname('src/'+file),{recursive:true});await fs.writeFile('src/'+file,await format(out,{parser:'babel'}));
}
const css=[...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m=>m[1]).join('\n');
await fs.mkdir('src/styles',{recursive:true});await fs.writeFile('src/styles/base.css',await format(css,{parser:'css'}));
let template=html.replace(/<style>[\s\S]*?<\/style>/g,'').replace(/<script>[\s\S]*?<\/script>/g,'');
template=template.replace('</head>','<style>/* APP_CSS */</style></head>').replace('</body>','<script>/* APP_JS */</script></body>').replaceAll('1.2.0','{{VERSION}}');
await fs.writeFile('src/index.html',template);
