import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import {spawnSync} from 'node:child_process';
import {buildDossier} from './vendor/makefun-board.ts';
import {buildRadar,isRankable,calibrate} from './lib/model.ts';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const snapshotBytes=fs.readFileSync('input/snapshot.json'),s=JSON.parse(snapshotBytes),boardBytes=fs.readFileSync('out/board.json'),rows=JSON.parse(boardBytes).rows;
assert.equal(hash(snapshotBytes),'42a71213519479f3a180cc5010cbbf6bd18a2447fa0ad29e4c5122b6c9184393');
const files=fs.readdirSync('out/dashboard');assert.ok(files.includes('index.html')&&files.some(x=>x.endsWith('.css'))&&files.some(x=>x.endsWith('.js')));assert.ok(files.length<=400);
let dashBytes=0;
for(const name of files){assert.match(name,/^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$/);const p='out/dashboard/'+name;assert.ok(fs.lstatSync(p).isFile());const b=fs.readFileSync(p);dashBytes+=b.length;assert.doesNotMatch(b.toString(),/https?:\/\//i);assert.deepEqual(b,fs.readFileSync('dashboard/'+name));}
assert.ok(dashBytes<64000&&dashBytes<=4194304);
assert.ok(rows.length>=100&&rows.length<=4000&&boardBytes.length<=8388608);assert.equal(new Set(rows.map(r=>r.slug)).size,rows.length);
const source=new Map(s.protocols.map(p=>[p.slug,p]));
const excludedCategories=['Bridge','Canonical Bridge','Cross Chain Bridge','Liquid Staking','Liquid Restaking','Restaked BTC','CEX'];
const independentlyEligible=p=>p.mcap_usd===null&&p.gecko_id===null&&p.symbol===null&&!excludedCategories.includes(p.category)&&! /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/.test(p.name)&&! /\b(wrapped|staked|staking)\b/i.test(p.name)&&! /^(Binance|Coinbase|Bybit|Kraken|Bitget|OKX|Bitfinex|Gemini)/i.test(p.name);
const expected=new Set(s.protocols.filter(independentlyEligible).map(p=>p.slug));assert.deepEqual(new Set(rows.map(r=>r.slug)),expected);
assert.equal(rows.length,197);assert.equal(s.watchlist.length,40);assert.ok(s.protocols.every(p=>isRankable(p)===independentlyEligible(p)));
const radar=buildRadar(s).radar;
const formerlyRankable=s.protocols.filter(p=>p.mcap_usd===null&&p.gecko_id===null&&p.symbol===null&&p.category!=='CEX'&&! /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/.test(p.name));
const removed=formerlyRankable.filter(p=>!expected.has(p.slug));assert.equal(removed.length,92);assert.deepEqual(new Set(radar.excluded.map(p=>p.slug)),new Set(removed.map(p=>p.slug)));
assert.ok(radar.excluded.every(p=>!expected.has(p.slug)&&p.reasons.length>0&&!('rank' in p)&&!('implied_value_usd' in p)));
const delivered=fs.readFileSync('out/data.js','utf8');assert.deepEqual(JSON.parse(delivered.slice('window.RADAR='.length).trim().replace(/;$/,'')),radar);
assert.deepEqual(rows.slice(0,5).map(r=>r.slug),['steakhouse-financial','sentora-curator','gauntlet','veda','usdd']);

let minStep=Infinity,maxStep=0;
for(let i=0;i<rows.length;i++){const r=rows[i];assert.ok(source.has(r.slug));assert.match(r.slug,/^\S{1,128}$/);assert.ok(r.name.trim());assert.equal(r.rank,i+1);assert.ok(Number.isSafeInteger(r.implied_value_usd)&&r.implied_value_usd>0&&r.implied_value_usd<=1e14);if(i)assert.ok(r.implied_value_usd<=rows[i-1].implied_value_usd);assert.ok(r.farm_steps.length>=3&&r.farm_steps.length<=12);for(const step of r.farm_steps){const n=step.trim().length;assert.ok(n>=20&&n<=600);assert.match(step,/Cost: .+Time: /);minStep=Math.min(minStep,n);maxStep=Math.max(maxStep,n);}}
assert.ok(new Set(rows.map(r=>r.implied_value_usd)).size>1);assert.ok(s.watchlist.every(slug=>rows.some(r=>r.slug===slug)));
const calibration=calibrate(s),priced=s.protocols.filter(p=>p.mcap_usd>0&&p.tvl_usd>0&&p.category!=='CEX'&&(p.symbol!==null||p.gecko_id!==null));
function median(a){a.sort((a,b)=>a-b);let i=Math.floor(a.length/2);return a.length%2?a[i]:(a[i-1]+a[i])/2;}
assert.equal(calibration.base_multiple,median(priced.map(p=>p.mcap_usd/p.tvl_usd)));
for(const [category,c]of Object.entries(calibration.categories)){let peers=priced.filter(p=>(p.category??'Other')===category);assert.equal(c.count,peers.length);assert.equal(c.multiple,peers.length>=3?median(peers.map(p=>p.mcap_usd/p.tvl_usd)):calibration.base_multiple);}
for(const r of rows){let p=source.get(r.slug),age=p.listed_at?Math.max(0,Math.floor((Date.parse(s.as_of)-Date.parse(p.listed_at))/86400000)):365;let m=calibration.categories[p.category??'Other'].multiple;assert.equal(r.implied_value_usd,Math.max(1,Math.round(p.tvl_usd*m*(1+Math.min(120,Math.max(-60,p.change_7d??0))/100*.5)*(.6+Math.min(age,1095)/1095*.4))));}
const shots=fs.readdirSync('screenshots').sort();assert.deepEqual(shots,['1-board.png','2-detail.png','3-filtered.png']);
const crcTable=Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc(b){let c=0xffffffff;for(const x of b)c=crcTable[(c^x)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
const images=[];
for(const name of shots){const b=fs.readFileSync('screenshots/'+name);assert.deepEqual(b,fs.readFileSync('out/screenshots/'+name));assert.ok(b.length<=524288);assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a');let at=8,end=false,idats=[];while(at<b.length){const len=b.readUInt32BE(at),type=b.toString('ascii',at+4,at+8);assert.equal(crc(b.subarray(at+4,at+8+len)),b.readUInt32BE(at+8+len));if(type==='IDAT')idats.push(b.subarray(at+8,at+8+len));at+=12+len;if(type==='IEND'){end=true;break;}}assert.ok(end&&at===b.length);const w=b.readUInt32BE(16),h=b.readUInt32BE(20);assert.ok(Math.max(w,h)<=1440&&Math.min(w,h)>=800);const pixels=zlib.inflateSync(Buffer.concat(idats));assert.ok(new Set(pixels.subarray(0,300000)).size>20);images.push({name,bytes:b.length,width:w,height:h,sha256:hash(b)});}
const dossier=fs.readFileSync('out/dossier.json');assert.ok(dossier.length<=1572864);assert.deepEqual(dossier,Buffer.from(buildDossier('out',{text_max_bytes:65536})));assert.ok(!JSON.parse(dossier).text.includes('[Cut at'));
function manifest(dir){let o={};function visit(p){for(const e of fs.readdirSync(p,{withFileTypes:true})){if(e.isDirectory())visit(p+'/'+e.name);else o[(p+'/'+e.name).slice(dir.length+1)]=hash(fs.readFileSync(p+'/'+e.name));}}visit(dir);return o;}
const first=manifest('out');const run=spawnSync('/opt/node22/bin/node',['main.ts','--input','input/snapshot.json'],{env:{...process.env,MAKEFUN_OUTPUT_DIR:'out'},encoding:'utf8'});assert.equal(run.status,0,run.stderr);assert.deepEqual(manifest('out'),first);
const result={gates:{dashboard_files:'PASS',board_file:'PASS',sorted_by_value:'PASS',coverage:'PASS',farm_steps:'PASS',screenshots:'PASS',dossier_matches:'PASS'},rows:rows.length,watchlist_coverage:s.watchlist.length,strict_total:s.protocols.filter(p=>p.mcap_usd===null&&p.gecko_id===null&&p.symbol===null).length,rankable_total:expected.size,live:buildRadar(s).radar.live_size,priced_peers:priced.length,overall_multiple:calibration.base_multiple,categories:calibration.categories,top5:rows.slice(0,5).map(r=>({rank:r.rank,slug:r.slug,tvl_usd:r.tvl_usd,implied_value_usd:r.implied_value_usd})),top5_watchlist:rows.filter(r=>s.watchlist.includes(r.slug)).slice(0,5).map(r=>({rank:r.rank,slug:r.slug,implied_value_usd:r.implied_value_usd})),dashboard_source_bytes:dashBytes,board_bytes:boardBytes.length,dossier_bytes:dossier.length,farm_step_characters:{min:minStep,max:maxStep},images,deterministic_two_runs:true,snapshot_sha256:hash(snapshotBytes)};
fs.writeFileSync('verification-results.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,categories:'See verification-results.json'},null,2));
