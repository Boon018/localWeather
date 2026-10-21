import { test, expect } from '@playwright/test';

const point={name:'Graz',latitude:47.0707,longitude:15.4395,timezone:'Europe/Vienna'};
const time=Math.floor(Date.now()/3600000)*3600;
function forecast(){return {timezone:'Europe/Vienna',current:{time,temperature_2m:12,weather_code:61},hourly:{time:Array.from({length:384},(_,i)=>time+i*3600),temperature_2m:Array(384).fill(12),precipitation:Array(384).fill(2.5),precipitation_probability:Array(384).fill(70),weather_code:Array(384).fill(61)}};}
export async function providers(page){
 await page.route('https://**/*',async route=>{
  const u=new URL(route.request().url());
  let body;
  if(u.hostname.includes('open-meteo'))body=u.hostname.includes('geocoding')?{results:[{name:'Vienna',latitude:48.2082,longitude:16.3738}]}:forecast();
  else if(u.hostname.includes('warnungen'))body={properties:{warnings:[],location:{properties:{name:'Graz'}}}};
  else if(u.hostname==='api.rainviewer.com')body={host:'https://tilecache.rainviewer.com',radar:{past:[0,1,2].map(i=>({time:time-1200+i*600,path:'/v2/radar/frame'+i}))}};
  else if(u.pathname.endsWith('.png'))return route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64')});
  else return route.abort();
  return route.fulfill({contentType:'application/json',body:JSON.stringify(body)});
 });
}
test.beforeEach(async({page})=>providers(page));
test('weather, favorites, views, search, history and offline reload',async({page,context})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('./');
 await expect(page.locator('.temperature')).toHaveText('12°');
 await expect(page.locator('.hourstrip').first()).toContainText('2.5 mm/h');
 await page.getByRole('button',{name:'Save place',exact:true}).click();
 await page.reload();
 await expect(page.locator('#savedLocation')).toContainText('Graz');
 await page.locator('[data-view="hourly"]').last().click();
 await expect(page.locator('table')).toContainText('Precip. / h');
 await page.locator('[data-view="models"]').click();
 await expect(page.getByRole('heading',{name:'Behind the forecast'})).toBeVisible();
 await page.locator('[data-view="history"]').click();
 await page.locator('#historyForm button').click();
 await expect(page.locator('table')).toBeVisible();
 await page.locator('[data-view="weather"]').click();
 await page.locator('#searchInput').fill('Vienna');
 await page.locator('#searchForm button').click();
 await page.locator('[data-search="0"]').click();
 await expect(page.locator('#locationTitle')).toHaveText('Vienna');
 // Fail only providers: a cached page shell is a separate PWA concern.
 await page.route('https://**/*',route=>route.abort());
 await page.reload();
 await expect(page.locator('.temperature')).toHaveText('12°');
 await page.locator('#refresh').click();
 await expect(page.locator('#status')).toContainText('Saved forecast retained');
 expect(errors).toEqual([]);
});
for(const width of [320,375,390,430,768,1024,1440])test(`layout ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto('./');
 await expect(page.locator('.temperature')).toBeVisible();
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
 expect(overflow).toBe(false);
});
