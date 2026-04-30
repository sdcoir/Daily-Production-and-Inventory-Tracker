
const PRODUCT_KEY = 'products';
const ACTIVITY_KEY = 'activity';
const LEGACY_KEY = 'sd_coir_tracker_final_rebuilt_v1';
const CLEAN_BUILD_KEY = 'sdcoir_clean_fast_inventory_20260428_v3';

// One-time clean slate for this finalized build. It clears old/demo browser data once,
// then preserves all new production and dispatch entries normally.
try {
  if (localStorage.getItem(CLEAN_BUILD_KEY) !== '1') {
    localStorage.removeItem(PRODUCT_KEY);
    localStorage.removeItem(ACTIVITY_KEY);
    localStorage.removeItem(LEGACY_KEY);
    localStorage.setItem(CLEAN_BUILD_KEY, '1');
  }
} catch (e) {}

let S = { products: {}, log: [] };
let dispatchProduct = null;
function pad(n){ return String(n).padStart(2,'0'); }
function todayISO(){ const d=new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function clone(obj){ return JSON.parse(JSON.stringify(obj)); }
function save(){ localStorage.setItem(PRODUCT_KEY, JSON.stringify(S.products)); localStorage.setItem(ACTIVITY_KEY, JSON.stringify(S.log)); }
function load(){ try{ const products=localStorage.getItem(PRODUCT_KEY), activity=localStorage.getItem(ACTIVITY_KEY); if(products||activity){ S.products=products?JSON.parse(products):{}; S.log=activity?JSON.parse(activity):[]; return; } const legacy=localStorage.getItem(LEGACY_KEY); if(legacy){ const old=JSON.parse(legacy); S.products=old.products||{}; S.log=old.log||[]; save(); } }catch(e){ S={products:{},log:[]}; } }
function toast(msg){ const t=document.getElementById('toast'); t.textContent=msg; t.style.display='block'; t.classList.remove('toast-in'); void t.offsetWidth; t.classList.add('toast-in'); clearTimeout(window.__to); window.__to=setTimeout(()=>t.style.display='none',2200); }
function ensure(name){ if(!S.products[name]) S.products[name]={stock:0,unit:name==='Coir Pith'?'Bags':'Bundles'}; return S.products[name]; }
function addRipple(e){ const target=e.currentTarget, rect=target.getBoundingClientRect(), r=document.createElement('span'); r.className='ripple'; r.style.left=(e.clientX-rect.left)+'px'; r.style.top=(e.clientY-rect.top)+'px'; target.appendChild(r); setTimeout(()=>r.remove(),650); }
function produce(name){ const key=name==='Coir Pith'?'pith':'fiber'; const qty=Number(document.getElementById(key+'Qty').value||0); const date=document.getElementById(key+'Date').value||todayISO(); if(qty<=0){toast('Enter quantity');return;} const p=ensure(name); p.stock+=qty; S.log.unshift({type:'produce',product:name,qty,unit:p.unit,date,ts:Date.now()}); document.getElementById(key+'Qty').value=''; save(); render(); toast('Production logged'); }
function openDispatch(name){ dispatchProduct=name; const p=ensure(name); document.getElementById('dispatchDesc').textContent=`Dispatch from ${name}. Available: ${p.stock} ${p.unit}`; document.getElementById('dispatchQty').value=''; document.getElementById('dispatchModal').classList.add('show'); setTimeout(()=>document.getElementById('dispatchQty').focus(),80); }
function closeDispatch(){ document.getElementById('dispatchModal').classList.remove('show'); dispatchProduct=null; }
function confirmDispatch(){ if(!dispatchProduct)return; const qty=Number(document.getElementById('dispatchQty').value||0); const p=ensure(dispatchProduct); if(qty<=0){toast('Enter quantity');return;} if(qty>p.stock){toast('Not enough stock');return;} p.stock-=qty; S.log.unshift({type:'dispatch',product:dispatchProduct,qty,unit:p.unit,date:todayISO(),ts:Date.now()}); closeDispatch(); save(); render(); toast('Dispatch logged'); }
function recalc(){ const old=[...S.log].reverse(); S.products={}; old.forEach(e=>{ const p=ensure(e.product); if(e.type==='produce')p.stock+=Number(e.qty||0); else p.stock=Math.max(0,p.stock-Number(e.qty||0)); }); }
function editLog(i){ const e=S.log[i]; const q=Number(prompt('Edit quantity',e.qty)); if(!q||q<=0)return; e.qty=q; recalc(); save(); render(); toast('Activity updated'); }
function deleteLog(i){ if(!confirm('Delete this activity?'))return; S.log.splice(i,1); recalc(); save(); render(); toast('Activity deleted'); }
function clearLog(){ if(!confirm('Clear all activity and inventory?'))return; S={products:{},log:[]}; save(); render(); toast('Tracker cleared'); }
function formatNum(v){ return Number(v||0).toLocaleString('en-IN'); }
function formatDateExport(value){ let d; if(value && /^\d{4}-\d{2}-\d{2}$/.test(value)){ const p=value.split('-').map(Number); d=new Date(p[0],p[1]-1,p[2]); } else { d=new Date(value||Date.now()); } return `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`; }
function inputId(name){ return 'fastDispatch_'+name.replace(/[^a-z0-9]/gi,'_'); }
function cleanQty(v){ return String(v||'').replace(/[^0-9]/g,''); }
function dispatchNow(name, qty){
  const p=ensure(name);
  qty=Number(qty||0);
  if(qty<=0){toast('Enter quantity');return false;}
  if(qty>Number(p.stock||0)){toast('Not enough stock');return false;}
  p.stock-=qty;
  S.log.unshift({type:'dispatch',product:name,qty,unit:p.unit,date:todayISO(),ts:Date.now()});
  save();
  return true;
}
let lastDispatchedProduct = null;
function focusInventoryInput(name){ const el=document.getElementById(inputId(name)); if(el){ el.focus(); el.select(); } }
function customDispatch(name){
  const el=document.getElementById(inputId(name));
  const qty=Number(cleanQty(el?.value));
  if(!dispatchNow(name, qty)) return;
  lastDispatchedProduct = name;
  if(el) el.value='';
  render();
  setTimeout(()=>focusInventoryInput(name), 40);
}
function renderInventory(){
  const rows=Object.entries(S.products).sort((a,b)=>a[0].localeCompare(b[0]));
  document.getElementById('inventoryList').innerHTML=rows.length?rows.map(([n,x])=>{
    const stock=Number(x.stock||0), id=inputId(n), teal=n==='Coir Fiber'?'teal':'';
    return `<div class="prod product-card fast-card ${lastDispatchedProduct===n?'is-dispatched':''}" onclick="if(!event.target.closest('button,input'))focusInventoryInput('${n}')"><div><div class="prod-name">${n}</div></div><div class="stock ${teal}">${formatNum(stock)}<div class="kpi-l">${x.unit}</div></div><div class="actions fast-actions"><div class="custom-dispatch"><input class="fast-input" id="${id}" type="text" placeholder="Qty" inputmode="numeric" enterkeyhint="done" autocomplete="off" oninput="this.value=cleanQty(this.value)" onfocus="this.select()" onkeydown="if(event.key==='Enter'){event.preventDefault();customDispatch('${n}')}"><button class="fast-submit" onclick="customDispatch('${n}')" ${stock<=0?'disabled':''}>Dispatch</button></div></div></div>`;
  }).join(''):`<div class="empty">No inventory yet. Log production first.</div>`;
}
function render(){ const p=ensure('Coir Pith'), f=ensure('Coir Fiber'); document.getElementById('kpiPith').textContent=formatNum(p.stock); document.getElementById('kpiFiber').textContent=formatNum(f.stock); renderInventory(); document.getElementById('activityList').innerHTML=S.log.length?S.log.map((e,i)=>{ const prod=e.type==='produce'; return `<div class="act ${prod?'is-production':'is-dispatch'}"><div class="act-ico">${prod?'▲':'↘'}</div><div><div class="act-title">${prod?'+':'-'}${formatNum(e.qty)} ${e.unit} ${prod?'→':'from'} <b>${e.product}</b></div><div class="act-meta">${formatDateExport(e.date||e.ts)} · ${prod?'Production':'Dispatch'}</div><div class="act-actions"><button class="btn" onclick="editLog(${i})">✎ Edit</button><button class="btn danger" onclick="deleteLog(${i})">× Delete</button></div></div></div>`; }).join(''):'<div class="empty">No activity yet</div>'; bindRipples(); if(lastDispatchedProduct){ const done=lastDispatchedProduct; setTimeout(()=>{ if(lastDispatchedProduct===done){ lastDispatchedProduct=null; renderInventory(); bindRipples(); } },650); } }
function showPage(n,b){ document.querySelectorAll('.page').forEach(p=>p.classList.remove('active')); document.getElementById('page-'+n).classList.add('active'); document.querySelectorAll('.nav button').forEach(x=>x.classList.remove('active')); b.classList.add('active'); }
function tick(){ const d = new Date(); document.getElementById('dateMain').textContent=d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}); document.getElementById('dateSub').textContent=d.toLocaleDateString('en-GB',{weekday:'long'}); document.getElementById('clock').textContent=`${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; }
function exportActivityExcel(){ if(typeof XLSX==='undefined'){toast('Excel library not loaded');return;} if(!S.log.length){toast('No activity to export');return;} const headers=['Sl.No','Date','Product','Activity','Quantity','Unit','Type']; const rows=S.log.map((e,i)=>[i+1,formatDateExport(e.date||e.ts),e.product,e.type==='produce'?'Production':'Dispatch',Number(e.qty||0),e.unit,e.type==='produce'?'Production':'Dispatch']); const ws=XLSX.utils.aoa_to_sheet([headers,...rows]); ws['!cols']=[{wch:8},{wch:14},{wch:24},{wch:16},{wch:12},{wch:14},{wch:16}]; ws['!rows']=[{hpt:28},...rows.map(()=>({hpt:24}))]; ws['!autofilter']={ref:`A1:G${rows.length+1}`}; const range=XLSX.utils.decode_range(ws['!ref']); const border={top:{style:'thin',color:{rgb:'D9E2EC'}},bottom:{style:'thin',color:{rgb:'D9E2EC'}},left:{style:'thin',color:{rgb:'D9E2EC'}},right:{style:'thin',color:{rgb:'D9E2EC'}}}; const headerStyle={font:{bold:true,color:{rgb:'FFFFFF'},sz:12},fill:{fgColor:{rgb:'111827'}},alignment:{horizontal:'center',vertical:'center'},border}; const bodyBase={font:{color:{rgb:'111827'},sz:11},alignment:{vertical:'center'},border}; const prodStyle={fill:{fgColor:{rgb:'FFF2CC'}},font:{color:{rgb:'7A4E00'},bold:true,sz:11},alignment:{horizontal:'center',vertical:'center'},border}; const dispatchStyle={fill:{fgColor:{rgb:'FCE4D6'}},font:{color:{rgb:'9C2F00'},bold:true,sz:11},alignment:{horizontal:'center',vertical:'center'},border}; for(let C=range.s.c;C<=range.e.c;C++){const cell=XLSX.utils.encode_cell({r:0,c:C}); if(ws[cell])ws[cell].s=headerStyle;} for(let R=1;R<=range.e.r;R++){ const activity=ws[`D${R+1}`]?.v; for(let C=range.s.c;C<=range.e.c;C++){ const cell=XLSX.utils.encode_cell({r:R,c:C}); if(!ws[cell])continue; ws[cell].s=clone(bodyBase); if([0,1,3,4,5,6].includes(C))ws[cell].s.alignment={horizontal:'center',vertical:'center'}; if(C===3||C===6)ws[cell].s=activity==='Production'?prodStyle:dispatchStyle; else if(R%2===0)ws[cell].s.fill={fgColor:{rgb:'F8FAFC'}}; if(C===4)ws[cell].z='#,##0'; } } const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Activity Log'); XLSX.writeFile(wb,`activity_log_${todayISO()}.xlsx`); toast('Excel exported'); }
function bindRipples(){ document.querySelectorAll('button:not([data-ripple])').forEach(btn=>{ btn.dataset.ripple='true'; btn.addEventListener('click', addRipple); }); }
if('serviceWorker' in navigator){ window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{})); }
document.getElementById('pithDate').value=todayISO(); document.getElementById('fiberDate').value=todayISO(); load(); render(); tick(); setInterval(tick,1000); bindRipples();

window.addEventListener('load',()=>setTimeout(()=>document.getElementById('appLaunch')?.classList.add('hide'),450));
/* Elite micro-interactions */
(function(){const header=document.querySelector('.header');const clock=document.getElementById('clock');if(header){header.addEventListener('pointermove',e=>{const r=header.getBoundingClientRect();header.style.setProperty('--mx',((e.clientX-r.left)/r.width*100).toFixed(2)+'%');header.style.setProperty('--my',((e.clientY-r.top)/r.height*100).toFixed(2)+'%')},{passive:true});header.addEventListener('pointerleave',()=>{header.style.setProperty('--mx','50%');header.style.setProperty('--my','50%')},{passive:true});const onScroll=()=>header.classList.toggle('is-scrolled',window.scrollY>8);window.addEventListener('scroll',onScroll,{passive:true});onScroll()}if(clock){let last='';setInterval(()=>{const now=clock.textContent;if(now&&now!==last){last=now;clock.classList.remove('tick-pop');void clock.offsetWidth;clock.classList.add('tick-pop')}},1000)}})();

