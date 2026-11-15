import fs from 'node:fs';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const root=process.cwd(), profile=root+'/.chrome-check';
try { fs.unlinkSync(profile+'/DevToolsActivePort'); } catch {}
const child=spawn('google-chrome',['--headless','--disable-gpu','--no-sandbox','--hide-scrollbars','--disable-background-networking','--no-first-run','--remote-debugging-port=0','--remote-allow-origins=*','--user-data-dir='+profile,'about:blank'],{stdio:'ignore'});
let ws;
try {
 let port;
 for(let i=0;i<100;i++){try{port=Number(fs.readFileSync(profile+'/DevToolsActivePort','utf8').split('\n')[0]);break;}catch{}await new Promise(r=>setTimeout(r,100));}
 const targets=await (await fetch('http://127.0.0.1:'+port+'/json')).json();
 ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);
 await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
 let id=0;const pending=new Map(),errors=[],requests=[];
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}else {if(m.method==='Runtime.exceptionThrown')errors.push(m.params);if(m.method==='Network.requestWillBeSent')requests.push(m.params.request.url);}};
 const call=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));});
 const evaluate=async expression=>{const x=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(x.exceptionDetails)throw Error(JSON.stringify(x.exceptionDetails));return x.result.value;};
 await call('Runtime.enable');await call('Network.enable');await call('Page.enable');
 await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1200,deviceScaleFactor:1,mobile:false});
 async function load(hash=''){await call('Page.navigate',{url:'about:blank'});await call('Page.navigate',{url:'file://'+root+'/out/dashboard/index.html'+hash});for(let i=0;i<100;i++){if(await evaluate("document.querySelector('#results tbody tr')!==null"))return;await new Promise(r=>setTimeout(r,50));}throw Error('Render timeout');}
 async function shot(name){const x=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync('screenshots/'+name,Buffer.from(x.data,'base64'));}
 const snapshotPath=process.env.SNAPSHOT||(fs.existsSync('input/snapshot.json')?'input/snapshot.json':'/input/snapshot.json');
 const s=JSON.parse(fs.readFileSync(snapshotPath)),board=JSON.parse(fs.readFileSync('out/board.json')).rows;
 await load();
 assert.equal(await evaluate("document.querySelectorAll('#results tbody tr').length"),board.length);
 await shot('1-board.png');
 await evaluate("document.querySelector('[data-sort=tvl_usd]').click()");
 assert.equal(await evaluate("document.querySelector('#results tbody tr').dataset.slug"),board.slice().sort((a,b)=>b.tvl_usd-a.tvl_usd)[0].slug);
 await evaluate("document.querySelector('[data-sort=tvl_usd]').click()");
 assert.equal(await evaluate("document.querySelector('#results tbody tr').dataset.slug"),board.slice().sort((a,b)=>a.tvl_usd-b.tvl_usd)[0].slug);
 const featured=board.find(r=>s.watchlist.includes(r.slug));
 await load('#p='+featured.slug);
 assert.equal(await evaluate("document.querySelector('#detail[open] #detail-title').textContent"),featured.name);
 assert.equal(await evaluate("document.querySelectorAll('#detail .steps li').length"),6);
 assert.ok(await evaluate("document.querySelector('#detail').textContent.includes('matches board.json')"));
 await shot('2-detail.png');
 await load();
 await evaluate("document.querySelector('#watch').click()");
 assert.equal(await evaluate("document.querySelectorAll('#results tbody tr').length"),s.watchlist.length);
 const category=featured.category,chain=featured.chains[0];
 await evaluate(`(()=>{const e=document.querySelector('#category');e.value=${JSON.stringify(category)};e.dispatchEvent(new Event('change'));const c=document.querySelector('#chain');c.value=${JSON.stringify(chain)};c.dispatchEvent(new Event('change'));const m=document.querySelector('#min');m.value='50';m.dispatchEvent(new Event('input'));})()`);
 const expected=board.filter(r=>s.watchlist.includes(r.slug)&&r.category===category&&r.chains.includes(chain)&&r.tvl_usd>=50e6);
 assert.equal(await evaluate("document.querySelectorAll('#results tbody tr').length"),expected.length);
 await shot('3-filtered.png');
 await evaluate("(()=>{const e=document.querySelector('#q');e.value='NO-SUCH-PROTOCOL-123';e.dispatchEvent(new Event('input'));})()");
 assert.ok(await evaluate("document.querySelector('#results').textContent.includes('No protocols match')"));
 await load();
 await evaluate("document.querySelectorAll('.view-tabs button')[1].click()");
 assert.ok(await evaluate("document.querySelector('#results caption').textContent.includes('Live token')"));
 await evaluate("document.querySelector('#excluded-tab').click()");
 assert.equal(await evaluate("document.querySelectorAll('#results tbody tr').length"),92);
 assert.ok(await evaluate("document.querySelector('#results').textContent.includes('not launch candidates')"));
 const excludedSlugs=await evaluate("Array.from(document.querySelectorAll('#results tbody tr'),r=>r.dataset.slug)");
 assert.ok(['wbtc','usdt0','binance-staked-eth','coinbase-bridge'].every(slug=>excludedSlugs.includes(slug)));
 assert.ok(excludedSlugs.every(slug=>!board.some(r=>r.slug===slug)));
 assert.ok(await evaluate("!document.querySelector('#results [data-sort=rank]')&&!document.querySelector('#results [data-sort=implied_value_usd]')"));
 await evaluate("document.querySelectorAll('.view-tabs button')[0].click()");
 assert.equal(await evaluate("document.querySelectorAll('#results tbody tr').length"),197);
 assert.equal(requests.filter(x=>/^https?:/.test(x)).length,0);
 assert.equal(errors.length,0);
 const result={rendered_rows:board.length,detail:featured.slug,filtered_rows:expected.length,excluded_rows:excludedSlugs.length,checks:['TVL sorting both directions','watchlist filter','category + chain + minimum TVL combined','search empty state','detail exact model + six farm steps','separate live token table','92 excluded products unranked with reasons and disjoint from board','return to 197 launch candidates'],js_errors:errors.length,external_requests:0,screenshots:fs.readdirSync('screenshots').map(name=>({name,bytes:fs.statSync('screenshots/'+name).size}))};
 fs.writeFileSync('browser-results.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
} finally {if(ws)ws.close();child.kill('SIGTERM');}
