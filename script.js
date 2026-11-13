const $=s=>document.querySelector(s),ls={
 get:(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}},
 set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}}};
const esc=t=>t.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let cat='All',q='',cur=null;
const CATS=['All',...new Set(DESTINATIONS.map(d=>d.cat))];

function start(){
  $('#welcome').hidden=true;$('#app').hidden=false;
  const n=ls.get('name','Traveller');$('#hello').textContent=`Hello, ${n}! 👋`;$('#profName').value=n;
  unlock('welcome');renderAll();
}
$('#enterBtn').onclick=()=>{const v=$('#nameInput').value.trim();if(!v)return $('#nameInput').focus();ls.set('name',v);start()};
if(ls.get('name'))start();

function renderAll(){chips();cards();trips();hot();mems();ach();
  $('#tripPlace').innerHTML=DESTINATIONS.map(d=>`<option>${esc(d.name)}</option>`).join('')}
function chips(){$('#chips').innerHTML=CATS.map(c=>`<button class="chip ${c===cat?'on':''}" data-c="${esc(c)}">${esc(c)}</button>`).join('')}
$('#chips').onclick=e=>{if(e.target.dataset.c){cat=e.target.dataset.c;chips();cards()}};
$('#search').oninput=e=>{q=e.target.value.toLowerCase();show('home');cards()};
function cards(){
  const list=DESTINATIONS.filter(d=>(cat==='All'||d.cat===cat)&&(d.name+d.loc+d.cat).toLowerCase().includes(q));
  $('#cards').innerHTML=list.map(d=>`<div class="card" data-id="${d.id}">${d.img?`<img loading="lazy" src="${d.img}" alt="">`:'<div class="ph"></div>'}<div><b>${esc(d.name)}</b><span class="muted">${esc(d.loc)}</span></div></div>`).join('')||'<p>No destinations found.</p>'}
$('#cards').onclick=e=>{const c=e.target.closest('.card');if(c)open(c.dataset.id)};
function open(id){cur=DESTINATIONS.find(d=>d.id===id);
  $('#mImg').src=cur.img;$('#mImg').hidden=!cur.img;$('#mName').textContent=cur.name;$('#mLoc').textContent=cur.loc+' · '+cur.cat;
  $('#mInfo').innerHTML=cur.info;
  $('#mMap').href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(cur.name+', '+cur.loc);
  $('#modal').hidden=false}
$('#close').onclick=()=>$('#modal').hidden=true;
$('#modal').onclick=e=>{if(e.target.id==='modal')e.target.hidden=true};
$('#mTrip').onclick=()=>{$('#tripPlace').value=cur.name;$('#modal').hidden=true;show('schedule')};

function show(t){document.querySelectorAll('.tab').forEach(s=>s.hidden=s.id!==t);
  document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('on',b.dataset.tab===t));scrollTo(0,0)}
$('#nav').onclick=e=>{const b=e.target.closest('button');if(b)show(b.dataset.tab)};

function trips(){const t=ls.get('trips',[]).sort((a,b)=>a.date.localeCompare(b.date));
  $('#trips').innerHTML=t.map((x,i)=>`<div class="item"><div><b>${esc(x.place)}</b><br><span class="muted">${x.date}${x.note?' · '+esc(x.note):''}</span></div><button class="x" data-i="${i}">🗑️</button></div>`).join('')||'<p class="muted">No trips planned yet.</p>'}
$('#tripForm').onsubmit=e=>{e.preventDefault();const t=ls.get('trips',[]);
  t.push({place:$('#tripPlace').value,date:$('#tripDate').value,note:$('#tripNote').value});ls.set('trips',t);e.target.reset();trips()};
$('#trips').onclick=e=>{const i=e.target.dataset.i;if(i==null)return;const t=ls.get('trips',[]).sort((a,b)=>a.date.localeCompare(b.date));t.splice(i,1);ls.set('trips',t);trips()};

function hot(){$('#hotList').innerHTML=HOTLINES.map(h=>`<div class="item"><div><b>${esc(h.name)}</b><br><span class="muted">${h.num}</span></div><a class="btn" href="tel:${h.num}">Call</a></div>`).join('')}

function mems(){const m=ls.get('mems',[]);
  $('#memories').innerHTML=m.map((x,i)=>`<div class="item" style="display:block"><div style="display:flex;justify-content:space-between"><b>${esc(x.title)}</b><button class="x" data-i="${i}">🗑️</button></div><span class="muted">${x.date}</span><p>${esc(x.text)}</p>${x.photo?`<img src="${x.photo}" alt="">`:''}</div>`).join('')||'<p class="muted">Add new memories with the form above.</p>'}
$('#memForm').onsubmit=e=>{e.preventDefault();const f=$('#memPhoto').files[0];
  const save=photo=>{const m=ls.get('mems',[]);m.unshift({title:$('#memTitle').value,text:$('#memText').value,photo,date:new Date().toLocaleDateString()});ls.set('mems',m);e.target.reset();mems();ach()};
  if(!f)return save('');const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{const c=document.createElement('canvas'),k=Math.min(1,500/im.width);c.width=im.width*k;c.height=im.height*k;c.getContext('2d').drawImage(im,0,0,c.width,c.height);save(c.toDataURL('image/jpeg',.7))};im.src=r.result};r.readAsDataURL(f)};
$('#memories').onclick=e=>{const i=e.target.dataset.i;if(i==null)return;const m=ls.get('mems',[]);m.splice(i,1);ls.set('mems',m);mems();ach()};

const ACH=[['Welcome traveller','Enter the app','welcome',()=>true],['Note taker','Create 5 notes','n5',()=>ls.get('mems',[]).length>=5],['Journalist','Create 20 notes','n20',()=>ls.get('mems',[]).length>=20]];
function unlock(k){const u=ls.get('ach',{});u[k]=1;ls.set('ach',u)}
function ach(){ACH.forEach(a=>{if(a[3]())unlock(a[2])});const u=ls.get('ach',{});
  $('#ach').innerHTML=ACH.map(a=>`<div class="item ${u[a[2]]?'':'lock'}"><div><b>${u[a[2]]?'🏆':'🔒'} ${a[0]}</b><br><span class="muted">${a[1]}</span></div></div>`).join('')}
$('#saveName').onclick=()=>{const v=$('#profName').value.trim();if(v){ls.set('name',v);$('#hello').textContent=`Hello, ${v}! 👋`}};
