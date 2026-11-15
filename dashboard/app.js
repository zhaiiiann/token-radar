// Offline view of buildRadar: ranks, exact model inputs and plans all come from the same board.
(function () {
'use strict';
const D = window.RADAR, root = document.getElementById('board');
if (!D) { root.textContent = 'Run main.ts, then open out/dashboard/index.html.'; return; }
const params = new URLSearchParams(location.hash.slice(1));
const state = { q:params.get('q')||'', category:params.get('category')||'all', chain:params.get('chain')||'all', min:Number(params.get('min'))||0, watch:params.has('watch'), live:false, excluded:false, sort:'implied_value_usd', dir:-1 };
const dollars = new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0});
const exact = n => n == null ? 'Not recorded' : dollars.format(n);
const money = n => n == null ? 'Not recorded' : n>=1e9?'$'+(n/1e9).toFixed(2)+'B':n>=1e6?'$'+(n/1e6).toFixed(1)+'M':exact(n);
const pct = n => n == null?'—':(n>0?'+':'')+n.toFixed(2)+'%';
const mult = n => n.toFixed(6)+'×';
const age = n => n==null?'Unknown':n>=365?(n/365).toFixed(1)+'y':n+'d';
function el(tag,attrs,...children) {
 const node=document.createElement(tag);
 for(const [k,v] of Object.entries(attrs||{})) {
  if(k==='text')node.textContent=v; else if(k==='class')node.className=v;
  else if(k.startsWith('on'))node.addEventListener(k.slice(2),v); else if(v!==null&&v!==false)node.setAttribute(k,v===true?'':v);
 }
 for(const child of children.flat(Infinity))if(child!=null)node.append(typeof child==='string'?document.createTextNode(child):child);
 return node;
}
function sync() {
 const p=new URLSearchParams();
 for(const k of ['q','category','chain','min'])if(state[k]&&state[k]!=='all')p.set(k,state[k]);
 if(state.watch)p.set('watch','1');
 history.replaceState(null,'','#'+p.toString());
}
const header=el('header',{class:'top'},el('div',{class:'brand'},el('span',{class:'mark'}),el('b',{text:'TOKEN / RADAR'})),el('div',{class:'top-meta'},el('span',{text:'SEALED SNAPSHOT · '+D.as_of}),el('span',{text:'OFFLINE / '+D.model_version.toUpperCase()})));
const totalTVL=D.rows.reduce((sum,r)=>sum+r.tvl_usd,0);
const lede=el('section',{class:'lede'},el('div',{},el('span',{class:'eyebrow',text:'RESEARCH DESK / 01'}),el('h1',{text:'Before the token.\nFollow the value.'}),el('p',{text:'All eligible protocols with no token recorded, ranked against live market comparables. A research map of implied capitalization — no launch or reward is confirmed.'})),el('div',{class:'facts'},...[['Watchlist covered',D.watchlist_size+' / '+D.watchlist_size],['Strict pre-token board',D.board_size],['Beyond the watchlist',D.early_size],['TVL under observation',money(totalTVL)]].map(([k,v])=>el('div',{class:'fact'},el('span',{text:k}),el('b',{text:String(v)})))));
const view=el('section',{id:'results','aria-live':'polite'}), count=el('span',{class:'count'});
const controls=el('div',{class:'controls'});
function field(label,input){return el('div',{class:'field'},el('label',{for:input.id,text:label}),input);}
function change(k,v){state[k]=v;sync();renderTable();}
const search=el('input',{id:'q',type:'search',placeholder:'Name or slug…',value:state.q,oninput:e=>change('q',e.target.value)});
controls.append(field('Find a protocol',search));
for(const [k,label,values] of [['category','Category',[...new Set(D.rows.concat(D.live,D.excluded).map(r=>r.category||'Other'))].sort()],['chain','Chain',[...new Set(D.rows.concat(D.live,D.excluded).flatMap(r=>r.chains))].sort()]]) {
 const select=el('select',{id:k,onchange:e=>change(k,e.target.value)},el('option',{value:'all',text:'All '+label.toLowerCase()+'s'}),values.map(v=>el('option',{value:v,text:v})));
 select.value=state[k]; controls.append(field(label,select));
}
const minimum=el('input',{id:'min',type:'number',min:0,step:5,value:state.min||'',placeholder:'0',oninput:e=>change('min',Math.max(0,Number(e.target.value)||0))});
controls.append(field('Min TVL ($M)',minimum));
const watch=el('input',{id:'watch',type:'checkbox',checked:state.watch,onchange:e=>change('watch',e.target.checked)});
controls.append(el('label',{class:'check'},watch,'Watchlist only'),el('button',{class:'close',text:'Reset',onclick:()=>{Object.assign(state,{q:'',category:'all',chain:'all',min:0,watch:false});search.value='';minimum.value='';document.getElementById('category').value='all';document.getElementById('chain').value='all';watch.checked=false;sync();renderTable();}}));
const pre=el('button',{text:'Pre-token board',onclick:()=>setTab(false)}),live=el('button',{text:'Live token / market caps',onclick:()=>setTab(true)});
const excluded=el('button',{id:'excluded-tab',text:'Wrapped, bridged & staked ('+D.excluded.length+')',onclick:()=>setTab(false,true)});
const tabs=el('div',{class:'view-tabs'},el('div',{class:'tabs'},pre,live,excluded),count);
function setTab(value,products=false){state.live=value;state.excluded=products;state.sort=products?'tvl_usd':value?'mcap_usd':'implied_value_usd';state.dir=-1;renderTable();}
function filtered(){return (state.excluded?D.excluded:state.live?D.live:D.rows).filter(r=>(!state.q||[r.name,r.slug].join(' ').toLowerCase().includes(state.q.toLowerCase().trim()))&&(state.category==='all'||(r.category||'Other')===state.category)&&(state.chain==='all'||r.chains.includes(state.chain))&&r.tvl_usd>=state.min*1e6&&(!state.watch||r.watchlist));}
function sorted(list){return list.slice().sort((a,b)=>{let x=a[state.sort],y=b[state.sort];if(x==null)return y==null?a.slug.localeCompare(b.slug):1;if(y==null)return -1;if(typeof x==='string'){x=x.toLowerCase();y=y.toLowerCase();}return (x<y?-1:x>y?1:0)*state.dir||a.slug.localeCompare(b.slug);});}
function th(key,label){return el('th',{'aria-sort':state.sort===key?(state.dir<0?'descending':'ascending'):'none'},el('button',{'data-sort':key,text:label+(state.sort===key?(state.dir<0?' ↓':' ↑'):''),onclick:()=>{if(state.sort===key)state.dir*=-1;else{state.sort=key;state.dir=key==='name'||key==='rank'?1:-1;}renderTable();}}));}
function renderTable(){
 pre.setAttribute('aria-pressed',String(!state.live&&!state.excluded));live.setAttribute('aria-pressed',String(state.live));excluded.setAttribute('aria-pressed',String(state.excluded));
 const rows=sorted(filtered()); count.textContent=rows.length+' / '+(state.excluded?D.excluded.length:state.live?D.live.length:D.board_size)+' protocols';view.textContent='';
 if(state.excluded){
  view.append(el('section',{class:'panel model'},el('h2',{text:'Wrapped, bridged & staked — not launch candidates'}),el('p',{text:'These products represent assets whose tokens already trade in another form. Missing token metadata does not make them protocols awaiting a launch. Excluded by category, asset wording or exchange branding; no launch rank, implied valuation or farm plan is assigned. Each row shows its exclusion reason.'})));
  const body=el('tbody');for(const r of rows)body.append(el('tr',{'data-slug':r.slug},el('td',{text:r.name}),el('td',{text:r.category||'Other'}),el('td',{text:r.chains.join(', ')}),el('td',{class:'num',text:money(r.tvl_usd)}),el('td',{text:r.reasons.join('; ')})));
  view.append(el('div',{class:'panel table-wrap'},el('table',{},el('caption',{text:'Excluded products · unranked, separate from launch research'}),el('thead',{},el('tr',{},th('name','Product'),el('th',{text:'Category'}),el('th',{text:'Chains'}),th('tvl_usd','TVL'),el('th',{text:'Why excluded'}))),body)));return;
 }
 if(!rows.length){view.append(el('div',{class:'empty panel'},el('h2',{text:'No protocols match these filters'}),el('p',{text:'Use Reset to restore the complete board.'})));return;}
 const body=el('tbody'),max=Math.max(...D.rows.map(r=>r.implied_value_usd));
 for(const r of rows){
 const tr=el('tr',{'data-slug':r.slug,tabindex:state.live?null:0,onclick:()=>{if(!state.live)openDetail(r.slug);},onkeydown:e=>{if(!state.live&&(e.key==='Enter'||e.key===' ')){e.preventDefault();openDetail(r.slug);}}},
 el('td',{class:'num rank',text:state.live?'LIVE':String(r.rank).padStart(2,'0')}),
 el('td',{},el('div',{class:'name'},el('b',{text:r.name}),el('span',{class:'sub',text:(r.category||'Other')+' · '+(r.chains.slice(0,2).join(', ')||'Chain not recorded')+(r.chains.length>2?' +'+(r.chains.length-2):'')}))),
 el('td',{class:'num',text:money(r.tvl_usd)}),el('td',{class:'num '+(r.change_7d>=0?'pos':'neg'),text:pct(r.change_7d)}));
 if(state.live)tr.append(el('td',{class:'num',text:r.mcap_usd==null?'Cap not recorded':mult(r.mcap_usd/r.tvl_usd)}),el('td',{class:'num',text:money(r.mcap_usd)}),el('td',{class:'sub',text:'Token recorded'}));
 else tr.append(el('td',{class:'num',text:age(r.age_days)}),el('td',{},el('div',{class:'implied'},el('div',{class:'bar'},el('i',{style:'width:'+Math.max(2,r.implied_value_usd/max*100)+'%'})),el('b',{class:'num',text:money(r.implied_value_usd)}))),el('td',{},el('span',{class:r.watchlist?'badge':'status',text:r.watchlist?'WATCHLIST':'EXTENDED'})));
 body.append(tr);
 }
 view.append(el('div',{class:'panel table-wrap'},el('table',{},el('caption',{text:state.live?'Live token · recorded market caps, excluded from the ranked board. Missing caps are not treated as zero.':'No token recorded · click any row for the value bridge, comparables and six-step farm plan.'}),el('thead',{},el('tr',{},state.live?el('th',{text:'Status'}):th('rank','Rank'),th('name','Protocol'),th('tvl_usd','TVL'),th('change_7d','7d TVL'),state.live?el('th',{text:'Mcap / TVL'}):th('age_days','Listed age'),th(state.live?'mcap_usd':'implied_value_usd',state.live?'Market cap':'Implied cap'),el('th',{text:state.live?'Record':'Universe'}))),body)));
}
function modelPanel(){
 const panel=el('section',{class:'panel model'},el('div',{class:'model-heading'},el('div',{},el('span',{class:'eyebrow',text:'TRANSPARENT BY DESIGN'}),el('h2',{text:'How the value is built'})),el('span',{class:'badge',text:D.model.peer_count+' PRICED PEERS'})),
 el('p',{class:'formula',text:'Implied cap = TVL × category multiple × growth × maturity'}),
 el('p',{text:'Base = median live market cap / TVL in the same category (minimum 3 priced peers). Sparse or absent categories use the overall '+mult(D.model.base_multiple)+' median. Growth = 1 + clamp(7d change, −60, 120) / 100 × 0.5. Maturity = 0.6 + min(listed age, 1095) / 1095 × 0.4. Round the result to whole dollars.'}),
 el('p',{class:'sub',text:'Missing growth uses 0%; missing listed age uses 365 days. Listing age is an observation proxy, not proof of launch age or tokenless history. Caps are circulating market caps, not FDV. Ratios can inherit shared-token or stale-data distortions. No launch probability, token price or airdrop allocation is inferred.'}));
 const detail=el('details',{},el('summary',{text:'Inspect all category medians and applied multiples'}));
 const body=el('tbody');
 for(const [category,c]of Object.entries(D.model.categories))body.append(el('tr',{},el('td',{text:category}),el('td',{class:'num',text:String(c.count)}),el('td',{class:'num',text:c.count?mult(c.median):'No priced peers'}),el('td',{class:'num',text:mult(c.multiple)}),el('td',{text:c.fallback?'Overall fallback':'Category median'})));
 detail.append(el('div',{class:'table-wrap'},el('table',{},el('thead',{},el('tr',{},...['Category','Peers','Raw median','Applied','Basis'].map(t=>el('th',{text:t})))),body)));panel.append(detail);return panel;
}
const dialog=el('dialog',{class:'detail',id:'detail','aria-labelledby':'detail-title'});
function openDetail(slug){
 const r=D.rows.find(x=>x.slug===slug);if(!r)return;
 dialog.textContent='';
 const c=D.model.categories[r.category||'Other'], growth=1+Math.min(120,Math.max(-60,r.change_7d??0))/100*.5,maturity=.6+Math.min(r.age_days??365,1095)/1095*.4;
 const section=(title,...children)=>el('section',{class:'detail-section'},el('h3',{text:title}),children);
 const stat=(k,v)=>el('div',{},el('span',{text:k}),el('b',{class:'num',text:v}));
 dialog.append(el('div',{class:'detail-head'},el('div',{},el('span',{class:'eyebrow',text:'PROTOCOL FILE / RANK '+r.rank}),el('h2',{id:'detail-title',text:r.name}),el('p',{class:'sub',text:r.slug+' · '+(r.category||'Other')})),el('button',{class:'close',text:'Close ×',onclick:()=>dialog.close()})),
 section('Value bridge',el('div',{class:'equation'},stat('TVL',exact(r.tvl_usd)),stat('Base multiple',mult(r.base_multiple)),stat('Base value',exact(r.tvl_usd*r.base_multiple)),stat('7d change → growth',pct(r.change_7d)+' → '+mult(growth)),stat('Listed age → maturity',age(r.age_days)+' → '+mult(maturity)),stat('Implied capitalization',exact(r.implied_value_usd))),el('p',{class:'sub',text:exact(r.tvl_usd)+' × '+mult(r.base_multiple)+' × '+mult(growth)+' × '+mult(maturity)+'; rounded only at the end. '+(c.fallback?'Overall median: category has only '+c.count+' priced peers.':'Category median from '+c.count+' priced peers.')+' Unrounded model recomputation '+(Math.round(r.tvl_usd*r.base_multiple*growth*maturity)===r.implied_value_usd?'matches board.json.':'FAILED.')})),
 section('Snapshot record',el('p',{class:'sub',text:'Listed '+(r.listed_at||'unknown')+' · TVL '+exact(r.tvl_usd)+' · Market cap, symbol and Gecko ID: all unrecorded. '+(r.watchlist?'Official watchlist.':'Extended candidate passing the watchlist product exclusions, without a TVL floor.')}),el('p',{class:'sub',text:'Chains: '+(r.chains.join(', ')||'Not recorded')})),
 section('Farm plan · conditional research, no rewards confirmed',el('p',{class:'sub',text:'Category-based playbook, not verified live instructions. Costs are planning estimates; supported assets, contracts, fees and eligibility must be checked in the official app.'}),el('ol',{class:'steps'},r.farm_steps.map(s=>{const i=s.indexOf(' Cost: ');return el('li',{},el('b',{text:s.slice(0,i)}),el('span',{class:'cost',text:s.slice(i+1)}));}))));
 const peers=D.live.filter(p=>p.mcap_usd>0&&p.tvl_usd>0&&(c.fallback||p.category===r.category)).sort((a,b)=>Math.abs(a.mcap_usd/a.tvl_usd-r.base_multiple)-Math.abs(b.mcap_usd/b.tvl_usd-r.base_multiple)||a.slug.localeCompare(b.slug)).slice(0,4);
 const body=el('tbody');for(const p of peers)body.append(el('tr',{},el('td',{text:p.name}),el('td',{class:'num',text:exact(p.mcap_usd)}),el('td',{class:'num',text:mult(p.mcap_usd/p.tvl_usd)})));
 dialog.append(section('Comparable live tokens',el('p',{class:'sub',text:(c.fallback?'Overall fallback peers':'Same-category peers')+' closest to the applied median; full peer universe is in the Live token tab.'}),el('table',{},el('thead',{},el('tr',{},...['Protocol','Market cap','Mcap / TVL'].map(t=>el('th',{text:t})))),body)));
 if(!dialog.open)dialog.showModal();dialog.scrollTop=0;
}
const shell=el('div',{class:'shell'},header,lede,controls,tabs,view,modelPanel(),el('footer',{text:'SOURCE / DefiLlama sealed protocol index · '+D.as_of+' · '+D.board_size+' ranked, '+D.live_size+' token-recorded protocols separated. Snapshot records are not proof that a token does not exist.'}));
root.replaceChildren(shell,dialog);root.setAttribute('aria-busy','false');renderTable();
if(params.get('p'))openDetail(params.get('p'));
})();
