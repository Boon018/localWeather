import {test,expect} from '@playwright/test';
import {providers} from './fixtures.js';
for(const [name,amount,probability,expected] of [
  ['dry with low probability',0,30,'☁️'],
  ['wet despite low probability',1,30,'🌧️'],
  ['dry amount with substantial probability',0,40,'🌧️']
]) test(`consistent icons: ${name}`,async({page})=>{
 await providers(page,(data,url)=>{
   data.current.precipitation=amount;
   data.current.cloud_cover=90;
   // Best Match can disagree with the explicit-model consensus: reproduce it.
   data.hourly.precipitation.fill(url.searchParams.get('models')==='best_match' ? 2 : amount);
   data.hourly.precipitation_probability.fill(probability);
   data.hourly.cloud_cover=Array(384).fill(90);
   return data;
 });
 await page.goto('./');
 await expect(page.locator('.temperature')).toBeVisible();
 await expect(page.locator('.condition-icon')).toHaveText(expected);
 await expect(page.locator('.hourstrip .wi').first()).toHaveText(expected);
 const summaries=await page.locator('.dayrow').allTextContents();
 expect(summaries.length).toBeGreaterThan(1);
 expect(summaries.every(s=>s.includes(expected))).toBe(true);
 if(expected==='☁️') expect(summaries.every(s=>!s.includes('🌧️')&&!s.includes('🌦️'))).toBe(true);
 await page.locator('.dayrow').first().click();
 await expect(page.locator('.dayextra .wi').first()).toHaveText(expected);
 await page.locator('#nav [data-view="hourly"]').click();
 await expect(page.locator('tbody tr').first().locator('td').nth(1)).toHaveText(expected);
});
