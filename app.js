const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const places=window.DESTINATIONS;
let favorites=JSON.parse(localStorage.getItem('tv-favorites')||'[]');
let itinerary=JSON.parse(localStorage.getItem('tv-itinerary')||'[]');
let memories=JSON.parse(localStorage.getItem('tv-memories')||'[]');
let traveler=localStorage.getItem('tv-name')||'Traveler', currentPlace=null, currentPage='home', homeCategory='All';
let memoryDate=new Date(), memoryPhoto='';
const save=()=>{localStorage.setItem('tv-favorites',JSON.stringify(favorites));localStorage.setItem('tv-itinerary',JSON.stringify(itinerary));localStorage.setItem('tv-memories',JSON.stringify(memories));};
const safe=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(msg){let t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>t.classList.remove('show'),2300)}
function card(p){let saved=favorites.includes(p.name);return `<article class="destination-card"><div class="card-image"><img src="assets/${p.image}" alt="${safe(p.name)}" loading="lazy"><span class="category-label">${safe(p.category)}</span><button class="heart-btn ${saved?'saved':''}" data-fav="${safe(p.name)}" aria-label="${saved?'Remove':'Save'} ${safe(p.name)}" aria-pressed="${saved}">${saved?'♥':'♡'}</button></div><div class="card-info"><h3>${safe(p.name)}</h3><div class="card-place">⌖ ${safe(p.place)}</div><div class="card-bottom"><span>CAMARINES NORTE</span><button data-detail="${safe(p.name)}">View details ↗</button></div></div></article>`}
function renderGrid(el,list){$(el).innerHTML=list.map(card).join('')||'';if(!list.length)$(el).innerHTML='<div class="no-results">No destinations found. Try another search.</div>'}
function updateCounts(){$('#favCount').textContent=favorites.length;$('#tripCount').textContent=itinerary.length?`${itinerary.length} destination${itinerary.length===1?'':'s'} in your plan`:'No destinations added yet';$('#profileFav').textContent=favorites.length;$('#profileMem').textContent=memories.length;$('#profileTrip').textContent=itinerary.length;$('#profileName').textContent=traveler;const welcome=$('.top-profile span');if(welcome)welcome.textContent=`Welcome, ${traveler}`;const hello=$('#helloName');if(hello)hello.textContent=traveler;}
function renderHome(category=homeCategory){homeCategory=category;const query=$('#homePlaceSearch').value.trim().toLowerCase();let list=places.filter(p=>(category==='All'||p.category===category)&&`${p.name} ${p.place} ${p.category}`.toLowerCase().includes(query));if(!query)list=list.slice(0,10);const count=$('#homeSearchCount');count.textContent=query?`${list.length} place${list.length===1?'':'s'} found`:'';count.hidden=!query;renderGrid('#featuredGrid',list)}
function renderAll(){let q=$('#searchInput').value.toLowerCase(),cat=$('#categoryFilter').value;let list=places.filter(p=>(cat==='All categories'||p.category===cat)&&`${p.name} ${p.place} ${p.category}`.toLowerCase().includes(q));$('#resultCount').textContent=`${list.length} destination${list.length===1?'':'s'}`;renderGrid('#allGrid',list)}
function renderFavorites(){let savedPlaces=places.filter(p=>favorites.includes(p.name)),query=$('#favoriteSearch').value.trim().toLowerCase(),list=savedPlaces.filter(p=>`${p.name} ${p.place} ${p.category}`.toLowerCase().includes(query));renderGrid('#favoriteGrid',list);if(query&&!list.length)$('#favoriteGrid').innerHTML='<div class="no-results">No saved places match your search. Try another search.</div>';const count=$('#favoriteSearchCount');count.textContent=query?`Showing ${list.length} of ${savedPlaces.length} saved place${savedPlaces.length===1?'':'s'}`:'';count.hidden=!query;$('#favoriteEmpty').style.display=savedPlaces.length?'none':'block';$('#favoriteGrid').style.display=savedPlaces.length?'grid':'none'}
function renderTrip(){let list=itinerary.map(n=>places.find(p=>p.name===n)).filter(Boolean);$('#tripList').innerHTML=list.map((p,i)=>`<div class="trip-row"><img src="assets/${p.image}"><div><b>${safe(i+1+'. '+p.name)}</b><small>${safe(p.place)}</small></div><button data-remove-trip="${safe(p.name)}" title="Remove">×</button></div>`).join('');$('#tripEmpty').style.display=list.length?'none':'block';$('#tripList').style.display=list.length?'block':'none'}
function memoryDateKey(date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`}
function formatMemoryDate(date){return date.toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'})}
function renderMemoryCalendar(){const monthSelect=$('#memoryMonth'),yearSelect=$('#memoryYear');if(!monthSelect.options.length){for(let month=0;month<12;month++){const option=document.createElement('option');option.value=String(month);option.textContent=new Date(2020,month,1).toLocaleDateString(undefined,{month:'long'});monthSelect.append(option)}}if(!yearSelect.options.length){const year=new Date().getFullYear();for(let value=year-10;value<=year+10;value++){const option=document.createElement('option');option.value=String(value);option.textContent=String(value);yearSelect.append(option)}}monthSelect.value=String(memoryDate.getMonth());yearSelect.value=String(memoryDate.getFullYear());const firstDay=new Date(memoryDate.getFullYear(),memoryDate.getMonth(),1).getDay(),daysInMonth=new Date(memoryDate.getFullYear(),memoryDate.getMonth()+1,0).getDate(),cells=Array(firstDay).fill('<span class="memory-calendar-blank" aria-hidden="true"></span>');for(let day=1;day<=daysInMonth;day++){const date=new Date(memoryDate.getFullYear(),memoryDate.getMonth(),day),key=memoryDateKey(date),selected=key===memoryDateKey(memoryDate);cells.push(`<button type="button" class="memory-day${selected?' selected':''}" data-memory-date="${key}" aria-label="${safe(formatMemoryDate(date))}" aria-pressed="${selected}">${day}</button>`)}$('#memoryCalendarDays').innerHTML=cells.join('')}
function renderMemories(){const items=memories.map(m=>{const title=m.title?`<h3>${safe(m.title)}</h3>`:'',text=m.text?`<p>${safe(m.text)}</p>`:'',photo=typeof m.photo==='string'&&m.photo.startsWith('data:image/')?`<img src="${safe(m.photo)}" alt="" loading="lazy">`:'',time=m.savedAt?`<span> · ${safe(new Date(m.savedAt).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'}))}</span>`:'';return `<article class="memory-item">${photo}<div>${title}${text}<small>${safe(m.date||'')}${time}</small></div></article>`}).join('');$('#memorySavedList').innerHTML=items;$('#memorySavedSection').hidden=!memories.length}
function renderBadges(){
 const planned=itinerary.map(name=>places.find(place=>place.name===name)).filter(Boolean);
 const milestones=[
  {name:'Welcome traveller',description:'Explore the app',image:'compass.png',unlocked:Boolean(localStorage.getItem('tv-name'))},
  {name:'First day as a traveller',description:'Add one tourist attraction to your itinerary',image:'achievements.png',unlocked:planned.some(place=>place.category==='Tourist Attractions')},
  {name:'Note taker',description:'Create 5 travel notes',image:'quill.png',unlocked:memories.length>=5},
  {name:'High and above',description:'Add 2 mountains to your itinerary',image:'cloud.png',unlocked:planned.filter(place=>place.category==='Mountains').length>=2},
  {name:'Loving the heat',description:'Add 5 beaches to your itinerary',image:'hat.png',unlocked:planned.filter(place=>place.category==='Beaches').length>=5},
  {name:'Historian',description:'Add 3 churches to your itinerary',image:'bag.png',unlocked:planned.filter(place=>place.category==='Churches').length>=3}
 ];
 $('#badgeGrid').innerHTML=milestones.map(m=>`<article class="achievement-card ${m.unlocked?'unlocked':'locked'}" aria-label="${safe(m.name)}, ${m.unlocked?'unlocked':'locked'}"><img class="achievement-seal" src="assets/seal.png" alt=""><div class="achievement-copy"><h2>${safe(m.name)}</h2><p>${safe(m.description)}</p></div><img class="achievement-art" src="assets/${m.image}" alt="" loading="lazy"></article>`).join('');
}
function refresh(){save();updateCounts();renderFavorites();renderTrip();renderMemories();renderBadges();renderAll()}
function openMore(){const modal=$('#moreModal');if(!modal)return;modal.hidden=false;document.body.classList.add('more-open');$('#moreTrigger').setAttribute('aria-expanded','true');$('#moreTrigger').classList.add('active');$('#closeMore').focus()}
function closeMore(){const modal=$('#moreModal');if(!modal||modal.hidden)return;modal.hidden=true;document.body.classList.remove('more-open');$('#moreTrigger').setAttribute('aria-expanded','false');$$('.top-nav .nav-link[data-page]').forEach(link=>link.classList.toggle('active',link.dataset.page===currentPage))}
function navigate(page){if(page==='more'){openMore();return}currentPage=page;closeMore();$$('.page').forEach(x=>x.classList.toggle('active',x.id===`page-${page}`));$$('.nav-link').forEach(x=>x.classList.toggle('active',x.dataset.page===page));document.body.classList.toggle('memory-page-active',page==='memories');const crumb=$('#crumb');if(crumb)crumb.textContent=({home:'Home',explore:'Explore places',map:'Explore map',hotlines:'Emergency Hotlines',itinerary:'My itinerary',favorites:'Favorite places',memories:'Memories',achievements:'Achievements',profile:'My profile'})[page]||'Home';window.scrollTo({top:0,behavior:'smooth'});if(page==='map')renderMap();if(page==='hotlines')renderHotlines()}
const provinceHotlines=[
 {agency:'Philippine National Police',numbers:[{number:'09985985951'}]},
 {agency:'Bureau of Fire Protection (Camarines Norte)',numbers:[{carrier:'Smart',number:'09088812003'},{carrier:'Globe',number:'09171762709'}]},
 {agency:'Hospital (CN Provincial Hospital)',numbers:[{number:'09177100679'}]},
 {agency:'Provincial Disaster Risk Reduction and Management Office',numbers:[{carrier:'Smart',number:'09985615388'},{carrier:'Globe',number:'09175839147'}]}
];
const hotlineTowns=[
 {name:'Basud',contacts:[
  {agency:'Bureau of Fire Protection',numbers:[{number:'09985470484'}]},
  {agency:'Philippine National Police',numbers:[{number:'09985985951'}]},
  {agency:'Hospital (CN Provincial Hospital)',numbers:[{number:'09177100679'}]},
  {agency:'Provincial Disaster Risk Reduction and Management Office',numbers:[{carrier:'Smart',number:'09985615388'},{carrier:'Globe',number:'09175839147'}]},
  {agency:'Municipal Disaster Risk Reduction and Management Office',numbers:[{number:'09951310154'},{number:'09993369991'}]}
 ]},
 {name:'Capalonga',contacts:[{agency:'Municipal Disaster Risk Reduction and Management Office',numbers:[{number:'09656259345'},{number:'09281504446'}]}]},
 {name:'Daet',contacts:[{agency:'Municipal Disaster Risk Reduction and Management Office',numbers:[{number:'09778023255'},{number:'09128555551'}]}]},
 {name:'Jose Panganiban',contacts:[{agency:'Municipal Disaster Risk Reduction and Management Office',numbers:[{number:'09206522620'},{number:'09617163626'}]}]},
 {name:'Labo',contacts:[{agency:'Municipal Disaster Risk Reduction and Management Office',numbers:[{number:'09508687045'},{number:'09076731131'}]}]},
 {name:'Mercedes',contacts:[{agency:'Municipal Disaster Risk Reduction and Management Office',numbers:[{number:'09297090494'},{number:'09993369991'}]}]},
 {name:'Paracale',contacts:[{agency:'Municipal Disaster Risk Reduction and Management Office',numbers:[{number:'09984358769'},{number:'09469987576'}]}]},
 {name:'San Lorenzo Ruiz',contacts:[{agency:'Municipal Disaster Risk Reduction and Management Office',numbers:[{number:'09503562460'}]}]},
 {name:'San Vicente',contacts:[{agency:'Municipal Disaster Risk Reduction and Management Office',numbers:[{number:'09102280646'},{number:'09985773706'}]}]},
 {name:'Santa Elena',contacts:[{agency:'Municipal Disaster Risk Reduction and Management Office',numbers:[{number:'09083557659'},{number:'09774730923'}]}]},
 {name:'Talisay',contacts:[{agency:'Municipal Disaster Risk Reduction and Management Office',numbers:[{number:'09081033540'},{number:'09090635567'}]}]},
 {name:'Vinzons',contacts:[{agency:'Municipal Disaster Risk Reduction and Management Office',numbers:[{number:'09985440115'},{number:'09292613031'}]}]}
];
function getTownHotlines(town){return town.name==='Basud'?town.contacts:[...provinceHotlines,...town.contacts]}
function renderHotlineContact(contact){return `<article class="hotline-contact"><h3>${safe(contact.agency)}</h3><div class="hotline-numbers">${contact.numbers.map(item=>`<div class="hotline-number">${item.carrier?`<span class="hotline-carrier">${safe(item.carrier)}</span>`:''}<a href="tel:${safe(item.number)}">${safe(item.number)}</a><button type="button" data-copy-phone="${safe(item.number)}" aria-label="Copy ${safe(item.number)}" title="Copy phone number"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="7" width="12" height="14" rx="2"></rect><path d="M16 7V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h2"></path></svg></button></div>`).join('')}</div></article>`}
function renderHotlineTown(town){
 const contacts=getTownHotlines(town);
 return `<details class="hotline-town" ${town.name==='Basud'?'open':''}><summary>${safe(town.name)}<span>${contacts.length?'View contacts':'Contact details unavailable'}</span></summary><div class="hotline-contacts">${contacts.length?contacts.map(renderHotlineContact).join(''):'<p class="hotline-unavailable">Contact numbers for this municipality have not been added yet.</p>'}</div></details>`;
}
function renderHotlines(){
 const query=$('#hotlineSearch').value.trim().toLowerCase();
 const towns=hotlineTowns.filter(t=>`${t.name} ${getTownHotlines(t).map(c=>`${c.agency} ${c.numbers.map(n=>`${n.carrier||''} ${n.number}`).join(' ')}`).join(' ')}`.toLowerCase().includes(query));
 const groups=towns.reduce((all,town)=>{const letter=town.name[0].toUpperCase();(all[letter]||(all[letter]=[])).push(town);return all},{});
 const list=$('#hotlineList');
 list.innerHTML=Object.keys(groups).sort().map(letter=>`<section class="hotline-group" aria-label="${letter}"><h2>${letter}</h2>${groups[letter].map(renderHotlineTown).join('')}</section>`).join('')||'<p class="hotline-no-results">No municipalities or contacts match your search.</p>';
}
function renderMap(){let selected=places.filter(p=>['Calaguas Island','Bagasbas Beach','Mananap Falls','Rizal Monument','Mercedes Group of Islands'].includes(p.name));$('#mapPlaces').innerHTML=selected.map(p=>`<div class="map-place"><img src="assets/${p.image}"><div><b>${p.name}</b><small>${p.place}</small></div><button data-detail="${safe(p.name)}">View</button></div>`).join('')}
function toggleFavorite(name){favorites=favorites.includes(name)?favorites.filter(n=>n!==name):[...favorites,name];refresh();toast(favorites.includes(name)?'Added to your favorites':'Removed from favorites')}
function openDetail(name){let p=places.find(x=>x.name===name);if(!p)return;currentPlace=p;$('#modalImage').src='assets/'+p.image;$('#modalCategory').textContent=p.category;$('#modalTitle').textContent=p.name;$('#modalPlace').textContent='⌖ '+p.place;$('#modalDescription').textContent=p.description;$('#modalFav').textContent=favorites.includes(p.name)?'♥ Saved place':'♡ Save place';$('#detailModal').classList.add('open')}
document.addEventListener('click',e=>{let nav=e.target.closest('[data-page]');if(nav){navigate(nav.dataset.page);return}let memoryDay=e.target.closest('[data-memory-date]');if(memoryDay){const [year,month,day]=memoryDay.dataset.memoryDate.split('-').map(Number);memoryDate=new Date(year,month-1,day);renderMemoryCalendar();return}let fav=e.target.closest('[data-fav]');if(fav){toggleFavorite(fav.dataset.fav);let saved=favorites.includes(fav.dataset.fav);fav.classList.toggle('saved',saved);fav.textContent=saved?'♥':'♡';fav.setAttribute('aria-label',(saved?'Remove':'Save')+' '+fav.dataset.fav);fav.setAttribute('aria-pressed',String(saved));return}let detail=e.target.closest('[data-detail]');if(detail){openDetail(detail.dataset.detail);return}let remove=e.target.closest('[data-remove-trip]');if(remove){itinerary=itinerary.filter(n=>n!==remove.dataset.removeTrip);refresh();toast('Removed from your itinerary')}});
$$('.category-chip').forEach(b=>b.addEventListener('click',()=>{$$('.category-chip').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');renderHome(b.dataset.category)}));
$('#searchInput').addEventListener('input',renderAll);$('#categoryFilter').addEventListener('change',renderAll);
$('#homePlaceSearch').addEventListener('input',()=>renderHome());
$('#favoriteSearch').addEventListener('input',renderFavorites);
$('#memoryMonth').addEventListener('change',()=>{memoryDate=new Date(Number($('#memoryYear').value),Number($('#memoryMonth').value),1);renderMemoryCalendar()});
$('#memoryYear').addEventListener('change',()=>{memoryDate=new Date(Number($('#memoryYear').value),Number($('#memoryMonth').value),1);renderMemoryCalendar()});
$('#memoryPhotoInput').addEventListener('change',e=>{const file=e.target.files[0];if(!file)return;if(!file.type.startsWith('image/')){toast('Choose an image file');e.target.value='';return}if(file.size>12*1024*1024){toast('Choose an image smaller than 12 MB');e.target.value='';return}const reader=new FileReader();reader.onerror=()=>toast('Could not read that photo. Try another file.');reader.onload=()=>{const image=new Image();image.onerror=()=>toast('Could not open that photo. Try another file.');image.onload=()=>{const scale=Math.min(1,960/Math.max(image.naturalWidth,image.naturalHeight)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));const context=canvas.getContext('2d');if(!context){toast('Could not process that photo.');return}context.drawImage(image,0,0,canvas.width,canvas.height);memoryPhoto=canvas.toDataURL('image/jpeg',.78);$('#memoryPhotoPreview').src=memoryPhoto;$('#memoryPhotoPreview').hidden=false;$('#memoryPhotoPlaceholder').hidden=true};image.src=String(reader.result)};reader.readAsDataURL(file)});
$('#closeModal').onclick=()=>$('#detailModal').classList.remove('open');
$('#detailModal').addEventListener('click',e=>{if(e.target===$('#detailModal'))$('#detailModal').classList.remove('open')});
$('#modalFav').onclick=()=>{if(currentPlace){toggleFavorite(currentPlace.name);$('#modalFav').textContent=favorites.includes(currentPlace.name)?'♥ Saved place':'♡ Save place'}};
$('#modalAdd').onclick=()=>{if(currentPlace&&!itinerary.includes(currentPlace.name)){itinerary.push(currentPlace.name);refresh();toast('Added to your itinerary')}else toast('This place is already in your itinerary');$('#detailModal').classList.remove('open')};
$('#memoryForm').addEventListener('submit',e=>{e.preventDefault();const title=$('#memoryTitle').value.trim(),text=$('#memoryText').value.trim();if(!title&&!text){toast('Add a title or experience before saving');return}memories.unshift({title:title||text.slice(0,60),text,date:formatMemoryDate(memoryDate),dateKey:memoryDateKey(memoryDate),savedAt:new Date().toISOString(),...(memoryPhoto?{photo:memoryPhoto}:{})});$('#memoryTitle').value='';$('#memoryText').value='';$('#memoryPhotoInput').value='';memoryPhoto='';$('#memoryPhotoPreview').src='';$('#memoryPhotoPreview').hidden=true;$('#memoryPhotoPlaceholder').hidden=false;memoryDate=new Date();renderMemoryCalendar();refresh();toast('Your memory has been saved')});
$('#editName').onclick=()=>{let n=prompt('What name would you like to use?',traveler);if(n&&n.trim()){traveler=n.trim().slice(0,32);localStorage.setItem('tv-name',traveler);updateCounts();toast('Profile name updated')}};
const notifButton=$('#notifBtn');
if(notifButton) notifButton.onclick=()=>toast('You are all caught up!');
document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();navigate('explore');$('#searchInput').focus()}if(e.key==='Escape'){$('#detailModal').classList.remove('open');closeMore()}});
renderMemoryCalendar();renderHome();refresh();updateCounts();
// Onboarding flow based on the supplied Traventure reference screens.
(function onboarding(){
 const nameScreen=document.getElementById('nameScreen');
 const landingScreen=document.getElementById('landingScreen');
 const appShell=document.getElementById('appShell');
 const nameInput=document.getElementById('nameEntry');
 const storedName=localStorage.getItem('tv-name');
 if(storedName){traveler=storedName;nameScreen.hidden=true;landingScreen.hidden=false;}
 const enterButton=document.getElementById('nameEnter');
 if(enterButton) enterButton.addEventListener('click',()=>{
   const value=nameInput.value.trim();
   if(!value){nameInput.focus();toast('Please enter your name first');return;}
   traveler=value.slice(0,32);localStorage.setItem('tv-name',traveler);
   nameScreen.hidden=true;landingScreen.hidden=false;
 });
 if(nameInput) nameInput.addEventListener('keydown',e=>{if(e.key==='Enter' && enterButton) enterButton.click()});
 const startButton=document.getElementById('getStarted');
 if(startButton) startButton.addEventListener('click',()=>{
   landingScreen.hidden=true;appShell.hidden=false;
   updateCounts();document.getElementById('helloName').textContent=traveler;
   renderHome();refresh();window.scrollTo(0,0);
 });
 const returnWelcomeButton=document.getElementById('returnWelcome');
 if(returnWelcomeButton) returnWelcomeButton.addEventListener('click',()=>{
   appShell.hidden=true;landingScreen.hidden=true;nameScreen.hidden=false;
   nameInput.value=traveler;window.scrollTo(0,0);nameInput.focus();
 });
})();
// The reference navigation includes Hotlines and More.
$('#hotlineSearch').addEventListener('input',renderHotlines);
document.addEventListener('click',e=>{
 const copyButton=e.target.closest('[data-copy-phone]');
 if(!copyButton)return;
 const number=copyButton.dataset.copyPhone;
 if(!navigator.clipboard||!navigator.clipboard.writeText){toast('Copy is not supported in this browser');return}
 navigator.clipboard.writeText(number).then(()=>toast('Phone number copied')).catch(()=>toast('Unable to copy phone number'));
});
$('#closeMore').addEventListener('click',closeMore);
$('#moreModal').addEventListener('click',e=>{if(e.target===$('#moreModal'))closeMore()});
const setTheme=theme=>{
 if(!['blue','violet','black'].includes(theme))theme='violet';
 document.documentElement.dataset.theme=theme;
 localStorage.setItem('tv-theme',theme);
 $$('[data-theme-choice]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.themeChoice===theme)));
};
$$('[data-theme-choice]').forEach(button=>button.addEventListener('click',()=>setTheme(button.dataset.themeChoice)));
setTheme(localStorage.getItem('tv-theme')||'violet');
const topSearch=document.getElementById('topSearch');
if(topSearch)topSearch.addEventListener('input',()=>{navigate('explore');const search=document.getElementById('searchInput');if(search){search.value=topSearch.value;renderAll();}});
