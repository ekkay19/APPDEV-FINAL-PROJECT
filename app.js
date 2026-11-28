
const $ = s => document.querySelector(s), $$ = s => Array.from(document.querySelectorAll(s));
function updateAvatar() {
    const savedAvatar = localStorage.getItem('tv-avatar');
    if (!savedAvatar) return;

    const profileImg = $('#profileAvatar');
    if (profileImg) profileImg.src = savedAvatar;

    $$('.topbar a[href*="profile"] img, .topbar a[aria-label*="Profile"] img, .topbar img[src*="avatar_profile"]').forEach(img => {
        img.src = savedAvatar;
    });

    $$('[data-preset-avatar]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.presetAvatar === savedAvatar);
    });
}

const places = window.DESTINATIONS || new Array();
let favorites = JSON.parse(localStorage.getItem('tv-favorites') || '[]');
let itinerary = JSON.parse(localStorage.getItem('tv-itinerary') || '[]');
itinerary = itinerary.map(entry => typeof entry === 'string' ? { name: entry, date: '', notes: '' } : entry)
    .filter(entry => entry && typeof entry.name === 'string');
let memories = JSON.parse(localStorage.getItem('tv-memories') || '[]');
let traveler = localStorage.getItem('tv-name') || 'Traveler', currentPlace = null, currentPage = 'home', homeCategory = 'All';
let memoryDate = new Date(), memoryPhoto = '';
let readNotificationKeys = JSON.parse(localStorage.getItem('tv-notifications-read') || '[]');
if (!Array.isArray(readNotificationKeys)) readNotificationKeys = [];
readNotificationKeys = readNotificationKeys.filter(key => typeof key === 'string');

const save = () => {
    localStorage.setItem('tv-favorites', JSON.stringify(favorites));
    localStorage.setItem('tv-itinerary', JSON.stringify(itinerary));
    localStorage.setItem('tv-memories', JSON.stringify(memories));
};

const safe = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// 1. ONBOARDING FLOW (index.html)

(function onboarding() {
    const nameScreen = document.getElementById('nameScreen');
    const landingScreen = document.getElementById('landingScreen');
    const appShell = document.getElementById('appShell');
    const nameInput = document.getElementById('nameEntry');
    const enterButton = document.getElementById('nameEnter');
    if (!nameScreen || !landingScreen || !enterButton) return;

    const storedName = localStorage.getItem('tv-name');
    if (storedName) {
        traveler = storedName;
        nameScreen.hidden = true;
        landingScreen.hidden = false;
    }

    enterButton.addEventListener('click', () => {
        const value = nameInput ? nameInput.value.trim() : '';
        if (!value) {
            nameInput?.focus();
            toast('Please enter your name first');
            return;
        }
        traveler = value.slice(0, 32);
        localStorage.setItem('tv-name', traveler);
        nameScreen.hidden = true;
        landingScreen.hidden = false;
    });

    if (nameInput) {
        nameInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') enterButton.click();
        });
    }

    const startButton = document.getElementById('getStarted');
    if (startButton && appShell) {
        startButton.addEventListener('click', () => {
            landingScreen.hidden = true;
            appShell.hidden = false;
            updateCounts();
            if ($('#helloName')) $('#helloName').textContent = traveler;
            renderHome();
            refresh();
            window.scrollTo(0, 0);
        });
    }
})();

// 2. CORE UI & RENDER FUNCTIONS

function toast(msg) {
    let t = $('#toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(window.toastTimer);
    window.toastTimer = setTimeout(() => t.classList.remove('show'), 2300);
}

function card(p) {
    let saved = favorites.includes(p.name);
    return '<article class="destination-card"><div class="card-image"><img src="assets/' + p.image + '" alt="' + safe(p.name) + '" loading="lazy"><span class="category-label">' + safe(p.category) + '</span><button class="heart-btn ' + (saved ? 'saved' : '') + '" data-fav="' + safe(p.name) + '" aria-label="' + (saved ? 'Remove' : 'Save') + ' ' + safe(p.name) + '" aria-pressed="' + saved + '">' + (saved ? '♥' : '♡') + '</button></div><div class="card-info"><h3>' + safe(p.name) + '</h3><div class="card-place">⌖ ' + safe(p.place) + '</div><div class="card-bottom"><span>CAMARINES NORTE</span><button data-detail="' + safe(p.name) + '">View details ↗</button></div></div></article>';
}

function renderGrid(el, list) {
    const container = $(el);
    if (!container) return;
    container.innerHTML = list.map(card).join('') || '';
    if (!list.length) container.innerHTML = '<div class="no-results">No destinations found. Try another search.</div>';
}

function updateCounts() {
    if ($('#favCount')) $('#favCount').textContent = favorites.length;
    if ($('#tripCount')) $('#tripCount').textContent = itinerary.length ? (itinerary.length + ' destination' + (itinerary.length === 1 ? '' : 's') + ' in your plan') : 'No destinations added yet';
    const upcomingPlans = getUpcomingPlanGroups();
    const currentNotificationKeys = new Set(upcomingPlans.map(plan => plan.key));
    const retainedReadKeys = readNotificationKeys.filter(key => currentNotificationKeys.has(key));
    if (retainedReadKeys.length !== readNotificationKeys.length) {
        readNotificationKeys = retainedReadKeys;
        localStorage.setItem('tv-notifications-read', JSON.stringify(readNotificationKeys));
    }
    const unreadCount = upcomingPlans.filter(plan => !readNotificationKeys.includes(plan.key)).length;
    const notificationBadge = $('.notification-count');
    if (notificationBadge) {
        notificationBadge.textContent = unreadCount > 99 ? '99+' : String(unreadCount);
        notificationBadge.hidden = unreadCount === 0;
        notificationBadge.setAttribute('aria-label', unreadCount + ' unread plan notification' + (unreadCount === 1 ? '' : 's'));
    }
    if ($('#profileFav')) $('#profileFav').textContent = favorites.length;
    if ($('#profileMem')) $('#profileMem').textContent = memories.length;
    if ($('#profileTrip')) $('#profileTrip').textContent = itinerary.length;
    if ($('#profileName')) $('#profileName').textContent = traveler;
    const welcome = $('.top-profile span');
    if (welcome) welcome.textContent = 'Welcome, ' + traveler;
    const hello = $('#helloName');
    if (hello) hello.textContent = traveler;
    updateAvatar();
}

function renderHome(category = homeCategory) {
    if (!$('#featuredGrid')) return;
    homeCategory = category;
    const query = $('#homePlaceSearch') ? $('#homePlaceSearch').value.trim().toLowerCase() : '';
    let list = places.filter(p => (category === 'All' || p.category === category) && (p.name + ' ' + p.place + ' ' + p.category).toLowerCase().includes(query));
    const count = $('#homeSearchCount');
    if (count) {
        count.textContent = query ? (list.length + ' place' + (list.length === 1 ? '' : 's') + ' found') : '';
        count.hidden = !query;
    }
    renderGrid('#featuredGrid', list);
}

function renderAll() {
    if (!$('#allGrid')) return;
    let q = $('#searchInput') ? $('#searchInput').value.toLowerCase() : '';
    let cat = $('#categoryFilter') ? $('#categoryFilter').value : 'All categories';
    let list = places.filter(p => (cat === 'All categories' || p.category === cat) && (p.name + ' ' + p.place + ' ' + p.category).toLowerCase().includes(q));
    if ($('#resultCount')) $('#resultCount').textContent = list.length + ' destination' + (list.length === 1 ? '' : 's');
    renderGrid('#allGrid', list);
}

function renderFavorites() {
    if (!$('#favoriteGrid')) return;
    let savedPlaces = places.filter(p => favorites.includes(p.name));
    let query = $('#favoriteSearch') ? $('#favoriteSearch').value.trim().toLowerCase() : '';
    let list = savedPlaces.filter(p => (p.name + ' ' + p.place + ' ' + p.category).toLowerCase().includes(query));
    renderGrid('#favoriteGrid', list);
    if (query && !list.length) $('#favoriteGrid').innerHTML = '<div class="no-results">No saved places match your search. Try another search.</div>';
    const count = $('#favoriteSearchCount');
    if (count) {
        count.textContent = query ? ('Showing ' + list.length + ' of ' + savedPlaces.length + ' saved place' + (savedPlaces.length === 1 ? '' : 's')) : '';
        count.hidden = !query;
    }
    if ($('#favoriteEmpty')) $('#favoriteEmpty').style.display = savedPlaces.length ? 'none' : 'block';
    $('#favoriteGrid').style.display = savedPlaces.length ? 'grid' : 'none';
}

function renderTrip() {
    if (!$('#tripList')) return;
    let list = itinerary.map(entry => ({ entry, place: places.find(p => p.name === entry.name) })).filter(item => item.place);
    $('#tripList').innerHTML = list.map((item, i) => {
        const p = item.place, entry = item.entry;
        return '<article class="trip-row"><img src="assets/' + safe(p.image) + '" alt="' + safe(p.name) + '"><div class="trip-row-details"><b>' + safe((i + 1) + '. ' + p.name) + '</b><small>' + safe(p.place) + '</small><label>Visit date<input type="date" data-trip-date="' + safe(p.name) + '" value="' + safe(entry.date || '') + '"></label><label>Notes<textarea data-trip-notes="' + safe(p.name) + '" maxlength="500" rows="2" placeholder="Add a note or activity...">' + safe(entry.notes || '') + '</textarea></label></div><button type="button" data-remove-trip="' + safe(p.name) + '" aria-label="Remove ' + safe(p.name) + ' from itinerary" title="Remove">×</button></article>';
    }).join('');
    if ($('#tripEmpty')) $('#tripEmpty').style.display = list.length ? 'none' : 'block';
    $('#tripList').style.display = list.length ? 'block' : 'none';
    renderTripDestinationOptions();
}

function localDateKey(date) {
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}

function formatTripDate(value) {
    const parts = value.split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString(undefined, {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
}

function getUpcomingPlanGroups() {
    const today = localDateKey(new Date());
    const upcoming = itinerary.filter(entry => /^\d{4}-\d{2}-\d{2}$/.test(entry.date || '') && entry.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date));
    const grouped = upcoming.reduce((days, entry) => {
        (days[entry.date] || (days[entry.date] = [])).push(entry);
        return days;
    }, {});
    return Object.keys(grouped).map(date => ({
        date,
        entries: grouped[date],
        key: JSON.stringify([date, grouped[date].map(entry => entry.name).sort()])
    }));
}

function renderTripDestinationOptions() {
    const select = $('#tripDestinationSelect');
    if (!select) return;
    const currentValue = select.value;
    const available = places.filter(place => !itinerary.some(entry => entry.name === place.name));
    select.innerHTML = '<option value="">Choose a place</option>' + available.map(place =>
        '<option value="' + safe(place.name) + '">' + safe(place.name + ' · ' + place.place) + '</option>'
    ).join('');
    if (available.some(place => place.name === currentValue)) select.value = currentValue;
}

function renderUpcomingPlans() {
    const list = $('#upcomingPlans');
    const empty = $('#upcomingPlansEmpty');
    const upcomingPlans = getUpcomingPlanGroups();
    if (list) {
        list.innerHTML = upcomingPlans.map(plan => {
            const stops = plan.entries.map(entry => {
                const place = places.find(item => item.name === entry.name);
                return '<li><strong>' + safe(entry.name) + '</strong>' +
                    (place ? '<span>' + safe(place.place) + '</span>' : '') +
                    (entry.notes ? '<p>' + safe(entry.notes) + '</p>' : '') + '</li>';
            }).join('');
            return '<article class="upcoming-plan-card"><div class="upcoming-plan-date">' +
                '<span>UPCOMING PLAN</span><h2>' + safe(formatTripDate(plan.date)) + '</h2></div><ul>' + stops + '</ul></article>';
        }).join('');
    }
    if (empty) empty.hidden = upcomingPlans.length > 0;
    if (list && upcomingPlans.length) {
        readNotificationKeys = Array.from(new Set(readNotificationKeys.concat(upcomingPlans.map(plan => plan.key))));
        localStorage.setItem('tv-notifications-read', JSON.stringify(readNotificationKeys));
        updateCounts();
    }
}

function renderTripPrep() {
    const container = $('#tripPrepList');
    if (!container) return;
    const categories = new Set(itinerary.map(entry => {
        const place = places.find(item => item.name === entry.name);
        return place ? place.category : '';
    }));
    const gear = [
        { categories: ['Beaches'], items: ['reef-safe sunscreen', 'waterproof dry bag', 'swimwear'] },
        { categories: ['Waterfalls', 'Mountains'], items: ['hiking shoes', 'lightweight daypack', 'first aid kit'] },
        { categories: ['Resorts & Campsites'], items: ['camping gear', 'insect repellent'] },
        { categories: ['Rivers'], items: ['water shoes', 'quick-dry towel'] },
        { categories: ['Tourist Attractions', 'Churches'], items: ['comfortable walking shoes', 'reusable water bottle'] }
    ].filter(group => group.categories.some(category => categories.has(category)))
        .flatMap(group => group.items);
    const recommendations = Array.from(new Set(gear));
    container.innerHTML = recommendations.length
        ? recommendations.map(item => '<a href="https://www.google.com/search?tbm=shop&amp;q=' + encodeURIComponent(item) + '" target="_blank" rel="noopener noreferrer">' + safe(item) + '<span aria-hidden="true"> ↗</span></a>').join('')
        : '<p>Add destinations to see relevant gear ideas.</p>';
}

function renderTripBudget() {
    const result = $('#tripBudgetResult');
    if (!result) return;
    const amount = id => Math.max(0, Number($('#' + id).value) || 0);
    const travelers = Math.max(1, amount('budgetTravelers'));
    const nights = amount('budgetNights');
    const transport = amount('budgetTransport') * travelers;
    const lodging = amount('budgetLodging') * nights;
    const meals = amount('budgetMeals') * (nights + 1) * travelers;
    const activities = amount('budgetActivities') * travelers;
    const currency = value => new Intl.NumberFormat('en-PH', {
        style: 'currency', currency: 'PHP', maximumFractionDigits: 0
    }).format(value);
    result.innerHTML = '<strong>Estimated total: ' + currency(transport + lodging + meals + activities) + '</strong>' +
        '<span>Transport ' + currency(transport) + ' · Lodging ' + currency(lodging) +
        ' · Meals ' + currency(meals) + ' · Activities ' + currency(activities) + '</span>';
}

function addTripPlace(name, date = '', notes = '') {
    if (itinerary.some(entry => entry.name === name)) return false;
    itinerary.push({ name, date, notes });
    return true;
}

function memoryDateKey(date) {
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}

function formatMemoryDate(date) {
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function renderMemoryCalendar() {
    const monthSelect = $('#memoryMonth'), yearSelect = $('#memoryYear');
    if (!monthSelect || !yearSelect || !$('#memoryCalendarDays')) return;
    if (!monthSelect.options.length) {
        for (let month = 0; month < 12; month++) {
            const option = document.createElement('option');
            option.value = String(month);
            option.textContent = new Date(2020, month, 1).toLocaleDateString(undefined, { month: 'long' });
            monthSelect.append(option);
        }
    }
    if (!yearSelect.options.length) {
        const year = new Date().getFullYear();
        for (let value = year - 10; value <= year + 10; value++) {
            const option = document.createElement('option');
            option.value = String(value);
            option.textContent = String(value);
            yearSelect.append(option);
        }
    }
    monthSelect.value = String(memoryDate.getMonth());
    yearSelect.value = String(memoryDate.getFullYear());
    const firstDay = new Date(memoryDate.getFullYear(), memoryDate.getMonth(), 1).getDay(),
        daysInMonth = new Date(memoryDate.getFullYear(), memoryDate.getMonth() + 1, 0).getDate(),
        cells = Array(firstDay).fill('<span class="memory-calendar-blank" aria-hidden="true"></span>');
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(memoryDate.getFullYear(), memoryDate.getMonth(), day),
            key = memoryDateKey(date),
            selected = key === memoryDateKey(memoryDate);
        cells.push('<button type="button" class="memory-day' + (selected ? ' selected' : '') + '" data-memory-date="' + key + '" aria-label="' + safe(formatMemoryDate(date)) + '" aria-pressed="' + selected + '">' + day + '</button>');
    }
    $('#memoryCalendarDays').innerHTML = cells.join('');
}

function renderMemories() {
    if (!$('#memorySavedList')) return;
    const items = memories.map(m => {
        const title = m.title ? ('<h3>' + safe(m.title) + '</h3>') : '',
            text = m.text ? ('<p>' + safe(m.text) + '</p>') : '',
            photo = typeof m.photo === 'string' && m.photo.startsWith('data:image/') ? ('') : '',
time = m.savedAt ? (' · ' + safe(new Date(m.savedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })) + '') : '';
return '' + photo + '' + title + text + '' + safe(m.date || '') + time + '';
}).join('');
$('#memorySavedList').innerHTML = items;
if ($('#memorySavedSection')) $('#memorySavedSection').hidden = !memories.length;
}
function renderBadges() {
if (!$('#badgeGrid')) return;
const planned = itinerary.map(entry => places.find(place => place.name === entry.name)).filter(Boolean);
const milestones = [
{ name: 'Welcome traveller', description: 'Explore the app', image: 'compass.png', unlocked: Boolean(localStorage.getItem('tv-name')) },
{ name: 'First day as a traveller', description: 'Add one tourist attraction to your itinerary', image: 'achievements.png', unlocked: planned.some(place => place.category === 'Tourist Attractions') },
{ name: 'Note taker', description: 'Create 5 travel notes', image: 'quill.png', unlocked: memories.length >= 5 },
{ name: 'High and above', description: 'Add 2 mountains to your itinerary', image: 'cloud.png', unlocked: planned.filter(place => place.category === 'Mountains').length >= 2 },
{ name: 'Loving the heat', description: 'Add 5 beaches to your itinerary', image: 'hat.png', unlocked: planned.filter(place => place.category === 'Beaches').length >= 5 },
{ name: 'Historian', description: 'Add 3 churches to your itinerary', image: 'bag.png', unlocked: planned.filter(place => place.category === 'Churches').length >= 3 }
];
$('#badgeGrid').innerHTML = milestones.map(m => '' + safe(m.name) + '' + safe(m.description) + '').join('');
}
function refresh() {
save();
updateCounts();
renderFavorites();
renderTrip();
renderMemories();
renderBadges();
renderAll();
renderTripPrep();
renderUpcomingPlans();
renderTripBudget();
}
function openMore() {
const modal = $('#moreModal');
if (!modal) return;
modal.hidden = false;
document.body.classList.add('more-open');
$('#moreTrigger')?.setAttribute('aria-expanded', 'true');
$('#moreTrigger')?.classList.add('active');
$('#closeMore')?.focus();
}
function closeMore() {
const modal = $('#moreModal');
if (!modal || modal.hidden) return;
modal.hidden = true;
document.body.classList.remove('more-open');
$('#moreTrigger')?.setAttribute('aria-expanded', 'false');
$$('.top-nav .nav-link[data-page]').forEach(link => link.classList.toggle('active', link.dataset.page === currentPage));
}
function navigate(page) {
if (page === 'more') { openMore(); return; }
currentPage = page;
closeMore();
$$('.page').forEach(x => x.classList.toggle('active', x.id === 'page-' + page));
$$('.nav-link').forEach(x => x.classList.toggle('active', x.dataset.page === page));
document.body.classList.toggle('memory-page-active', page === 'memories');
const crumb = $('#crumb');
if (crumb) crumb.textContent = ({ home: 'Home', explore: 'Explore places', map: 'Explore map', hotlines: 'Emergency Hotlines', itinerary: 'My itinerary', favorites: 'Favorite places', memories: 'Memories', achievements: 'Achievements', profile: 'My profile' })[page] || 'Home';
window.scrollTo({ top: 0, behavior: 'smooth' });
if (page === 'map') renderMap();
if (page === 'hotlines') renderHotlines();
}

// 3. HOTLINES & MAP DATA

const provinceHotlines = [
{ agency: 'Philippine National Police', numbers: [{ number: '09985985951' }] },
{ agency: 'Bureau of Fire Protection (Camarines Norte)', numbers: [{ carrier: 'Smart', number: '09088812003' }, { carrier: 'Globe', number: '09171762709' }] },
{ agency: 'Hospital (CN Provincial Hospital)', numbers: [{ number: '09177100679' }] },
{ agency: 'Provincial Disaster Risk Reduction and Management Office', numbers: [{ carrier: 'Smart', number: '09985615388' }, { carrier: 'Globe', number: '09175839147' }] }
];
const hotlineTowns = [
{
name: 'Basud', contacts: [
{ agency: 'Bureau of Fire Protection', numbers: [{ number: '09985470484' }] },
{ agency: 'Philippine National Police', numbers: [{ number: '09985985951' }] },
{ agency: 'Hospital (CN Provincial Hospital)', numbers: [{ number: '09177100679' }] },
{ agency: 'Provincial Disaster Risk Reduction and Management Office', numbers: [{ carrier: 'Smart', number: '09985615388' }, { carrier: 'Globe', number: '09175839147' }] },
{ agency: 'Municipal Disaster Risk Reduction and Management Office', numbers: [{ number: '09951310154' }, { number: '09993369991' }] }
]
},
{ name: 'Capalonga', contacts: [{ agency: 'Municipal Disaster Risk Reduction and Management Office', numbers: [{ number: '09656259345' }, { number: '09281504446' }] }] },
{ name: 'Daet', contacts: [{ agency: 'Municipal Disaster Risk Reduction and Management Office', numbers: [{ number: '09778023255' }, { number: '09128555551' }] }] },
{ name: 'Jose Panganiban', contacts: [{ agency: 'Municipal Disaster Risk Reduction and Management Office', numbers: [{ number: '09206522620' }, { number: '09617163626' }] }] },
{ name: 'Labo', contacts: [{ agency: 'Municipal Disaster Risk Reduction and Management Office', numbers: [{ number: '09508687045' }, { number: '09076731131' }] }] },
{ name: 'Mercedes', contacts: [{ agency: 'Municipal Disaster Risk Reduction and Management Office', numbers: [{ number: '09297090494' }, { number: '09993369991' }] }] },
{ name: 'Paracale', contacts: [{ agency: 'Municipal Disaster Risk Reduction and Management Office', numbers: [{ number: '09984358769' }, { number: '09469987576' }] }] },
{ name: 'San Lorenzo Ruiz', contacts: [{ agency: 'Municipal Disaster Risk Reduction and Management Office', numbers: [{ number: '09503562460' }] }] },
{ name: 'San Vicente', contacts: [{ agency: 'Municipal Disaster Risk Reduction and Management Office', numbers: [{ number: '09102280646' }, { number: '09985773706' }] }] },
{ name: 'Santa Elena', contacts: [{ agency: 'Municipal Disaster Risk Reduction and Management Office', numbers: [{ number: '09083557659' }, { number: '09774730923' }] }] },
{ name: 'Talisay', contacts: [{ agency: 'Municipal Disaster Risk Reduction and Management Office', numbers: [{ number: '09081033540' }, { number: '09090635567' }] }] },
{ name: 'Vinzons', contacts: [{ agency: 'Municipal Disaster Risk Reduction and Management Office', numbers: [{ number: '09985440115' }, { number: '09292613031' }] }] }
];
function getTownHotlines(town) {
return town.name === 'Basud' ? town.contacts : [...provinceHotlines, ...town.contacts];
}

function renderHotlineContact(contact){return `<article class="hotline-contact"><h3>${safe(contact.agency)}</h3><div class="hotline-numbers">${contact.numbers.map(item=>`<div class="hotline-number">${item.carrier?`<span class="hotline-carrier">${safe(item.carrier)}</span>`:''}<a href="tel:${safe(item.number)}">${safe(item.number)}</a><button type="button" data-copy-phone="${safe(item.number)}" aria-label="Copy ${safe(item.number)}" title="Copy phone number"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="7" width="12" height="14" rx="2"></rect><path d="M16 7V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h2"></path></svg></button></div>`).join('')}</div></article>`}

document.addEventListener('click', e => {
    const copyButton = e.target.closest('[data-copy-phone]');
    if (!copyButton) return;

    const number = copyButton.dataset.copyPhone;
    if (!number) return;

    const onSuccess = () => {
        toast('Copied ' + number);
        copyButton.classList.add('copied');
        setTimeout(() => copyButton.classList.remove('copied'), 1200);
    };

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(number)
            .then(onSuccess)
            .catch(() => fallbackCopy(number, onSuccess));
    } else {
        fallbackCopy(number, onSuccess);
    }
});

function fallbackCopy(text, onSuccess) {
    const temp = document.createElement('textarea');
    temp.value = text;
    temp.style.position = 'fixed';
    temp.style.opacity = '0';
    document.body.appendChild(temp);
    temp.select();
    try {
        document.execCommand('copy');
        onSuccess();
    } catch (err) {
        toast('Unable to copy phone number');
    }
    document.body.removeChild(temp);
}

/*function renderHotlineContact(contact) {
    return '' + safe(contact.agency) + '' + contact.numbers.map(item => '' + (item.carrier ? '' + safe(item.carrier) + '' : '') + '' + safe(item.number) + '').join('') + '';
}*/
function renderHotlineTown(town) {
const contacts = getTownHotlines(town);
return `<details class="hotline-town" ${town.name==='Basud'?'open':''}><summary>${safe(town.name)}<span>${contacts.length?'View contacts':'Contact details unavailable'}</span></summary><div class="hotline-contacts">${contacts.length?contacts.map(renderHotlineContact).join(''):'<p class="hotline-unavailable">Contact numbers for this municipality have not been added yet.</p>'}</div></details>`;
//return '<details class="hotline-town" ' + (town.name === 'Basud' ? 'open' : '') + '>' + safe(town.name) + '' + (contacts.length ? 'View contacts' : 'Contact details unavailable') + '' + (contacts.length ? contacts.map(renderHotlineContact).join('') : 'Contact numbers for this municipality have not been added yet.') + '';
}
function renderHotlines() {
const list = $('#hotlineList');
    if (!list) return; 
    const searchInput = $('#hotlineSearch');
    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';if (!list) return;
//const query=$('#hotlineSearch').value.trim().toLowerCase();
const towns=hotlineTowns.filter(t=>`${t.name} ${getTownHotlines(t).map(c=>`${c.agency} ${c.numbers.map(n=>`${n.carrier||''} ${n.number}`).join(' ')}`).join(' ')}`.toLowerCase().includes(query));
const groups=towns.reduce((all,town)=>{const letter=town.name[0].toUpperCase();(all[letter]||(all[letter]=[])).push(town);return all},{});
//const list=$('#hotlineList');
list.innerHTML=Object.keys(groups).sort().map(letter=>`<section class="hotline-group" aria-label="${letter}"><h2>${letter}</h2>${groups[letter].map(renderHotlineTown).join('')}</section>`).join('')||'<p class="hotline-no-results">No municipalities or contacts match your search.</p>';

/*const list = $('#hotlineList');
if (!list) return;
const query = $('#hotlineSearch') ? $('#hotlineSearch').value.trim().toLowerCase() : '';
const towns = hotlineTowns.filter(t => {
const contactText = getTownHotlines(t).map(c => c.agency + ' ' + c.numbers.map(n => (n.carrier || '') + ' ' + n.number).join(' ')).join(' ');
return (t.name + ' ' + contactText).toLowerCase().includes(query);
});
const groups = towns.reduce((all, town) => {
const letter = town.name.charAt(0).toUpperCase();
if (!all[letter]) all[letter] = new Array();
all[letter].push(town);
return all;
}, {});
list.innerHTML = Object.keys(groups).sort().map(letter => '' + letter + '' + groups[letter].map(renderHotlineTown).join('') + '').join('') || 'No municipalities or contacts match your search.';
*/
}


function renderMap() {
if (!$('#mapPlaces')) return;
let selected = places.filter(p => ['Calaguas Island', 'Bagasbas Beach', 'Mananap Falls', 'Rizal Monument', 'Mercedes Group of Islands'].includes(p.name));
//$('#mapPlaces').innerHTML=selected.map(p=>`<div class="map-place"><img src="assets/${p.image}"><div><b>${p.name}</b><small>${p.place}</small></div><button data-detail="${safe(p.name)}">View</button></div>`).join('')}
$('#mapPlaces').innerHTML = selected.map(p => '' + p.name + '' + p.place + 'View').join('');
}
function toggleFavorite(name) {
favorites = favorites.includes(name) ? favorites.filter(n => n !== name) : [...favorites, name];
refresh();
toast(favorites.includes(name) ? 'Added to your favorites' : 'Removed from favorites');
}

const destinationCoordinates = {
    'Rizal Monument': [14.1128, 122.9564],
    'Mercedes Group of Islands': [14.1064, 123.0120],
    'Calaguas Island': [14.1354, 122.9050],
    'Bagasbas Beach': [14.1128, 122.9564],
    'Gumaus Beach': [14.2796, 122.7880],
    'Parola Island': [14.2900, 122.6920],
    'Pulang Daga': [14.2796, 122.7880],
    'Labnig Beach': [14.2796, 122.7880],
    'Taba-taba Beach': [14.0506, 122.9600],
    'San Jose Beach': [14.1337, 122.9220],
    'Mananap Falls': [14.0980, 122.8990],
    'Malatap Falls': [14.0290, 122.8260],
    'Maligaya Falls': [14.0290, 122.8260],
    'Binuang Falls': [14.0290, 122.8260],
    'Colasi Falls': [14.1064, 123.0120],
    'Nacali Falls': [14.0010, 122.9300],
    'Tariris Falls': [14.2796, 122.7880],
    'Mampurog River': [14.0010, 122.9300],
    'Malaguit River': [14.2796, 122.7880],
    'Talisay River': [14.1337, 122.9220],
    'Mount Labo': [14.0290, 122.8260],
    'Colasi Peak': [14.1064, 123.0120],
    'Mt. Bagacay / Tulis Peak': [14.0290, 122.8260],
    'Mount Cadig': [14.0290, 122.8260],
    'St. Francis of Assisi Parish Church': [14.1337, 122.9220],
    'St. John the Baptist Church': [14.1128, 122.9564],
    'Diocesan Shrine of Jesus the Black Nazarene': [14.3290, 122.4880],
    'Paroquia de Nuestra Señora de Candelaria': [14.2796, 122.7880],
    'Diocesan Shrine of St. Vincent Ferrer': [14.0980, 122.8990],
    'Gumaos Bay': [14.0980, 122.8990],
    'Adelaida Native Farm': [14.0010, 122.9300],
    'Pambuhan Glamping Resort': [14.1064, 123.0120],
    'Althea\'s Dreamland Resort': [14.0010, 122.9300],
    'Carmelita\'s Cove': [14.0506, 122.9600],
    'Athena Nature Park & Resort': [14.0010, 122.9300]
};

function distanceInKm(lat1, lon1, lat2, lon2) {
    const rad = degrees => degrees * Math.PI / 180;
    const earthRadius = 6371;
    const dLat = rad(lat2 - lat1);
    const dLon = rad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
    return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function updateDestinationRoute(p) {
    const distanceText = $('#modalDistance');
    const routeText = $('#modalRouteText');
    const mapLink = $('#modalMap');
    if (!distanceText || !routeText || !mapLink) return;

    const destination = destinationCoordinates[p.name] || [14.1128, 122.9564];
    const destinationQuery = encodeURIComponent(`${p.name}, ${p.place}`);
    mapLink.href = `https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=${destinationQuery}&travelmode=driving`;
    distanceText.textContent = 'Distance unavailable';
    routeText.textContent = 'Use your location for turn-by-turn directions';

    if (!navigator.geolocation) {
        distanceText.textContent = 'Tap to get directions';
        return;
    }

    distanceText.textContent = 'Finding your location...';
    navigator.geolocation.getCurrentPosition(position => {
        const userLat = position.coords.latitude;
        const userLon = position.coords.longitude;
        const km = distanceInKm(userLat, userLon, destination[0], destination[1]);
        distanceText.textContent = km < 1
            ? `About ${Math.max(1, Math.round(km * 1000))} m away`
            : `About ${km.toFixed(km < 10 ? 1 : 0)} km away`;
        routeText.textContent = 'Approximate straight-line distance';
        mapLink.href = `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLon}&destination=${destination[0]},${destination[1]}&travelmode=driving`;
    }, () => {
        distanceText.textContent = 'Tap to get directions';
        routeText.textContent = 'Location access was not granted';
    }, { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 });
}

function openDetail(name) {
let p = places.find(x => x.name === name);
if (!p || !$('#detailModal')) return;
currentPlace = p;
if ($('#modalImage')) $('#modalImage').src = 'assets/' + p.image;
if ($('#modalCategory')) $('#modalCategory').textContent = p.category;
if ($('#modalTitle')) $('#modalTitle').textContent = p.name;
if ($('#modalPlace')) $('#modalPlace').textContent = '⌖ ' + p.place;
if ($('#modalDescription')) $('#modalDescription').textContent = p.description;
updateDestinationRoute(p);
$('#detailModal').classList.add('open');
}

// 4. EVENT LISTENERS & THEME

document.addEventListener('click', e => {
let nav = e.target.closest('[data-page]');
if (nav) { navigate(nav.dataset.page); return; }
let memoryDay = e.target.closest('[data-memory-date]');
if (memoryDay) {
const parts = memoryDay.dataset.memoryDate.split('-').map(Number);
memoryDate = new Date(parts[0], parts[1] - 1, parts[2]);
renderMemoryCalendar();
return;
}
let fav = e.target.closest('[data-fav]');
if (fav) {
toggleFavorite(fav.dataset.fav);
let saved = favorites.includes(fav.dataset.fav);
fav.classList.toggle('saved', saved);
fav.textContent = saved ? '♥' : '♡';
fav.setAttribute('aria-label', (saved ? 'Remove' : 'Save') + ' ' + fav.dataset.fav);
fav.setAttribute('aria-pressed', String(saved));
return;
}
let detail = e.target.closest('[data-detail]');
if (detail) { openDetail(detail.dataset.detail); return; }
let remove = e.target.closest('[data-remove-trip]');
if (remove) {
itinerary = itinerary.filter(entry => entry.name !== remove.dataset.removeTrip);
refresh();
toast('Removed from your itinerary');
return;
}
const copyButton = e.target.closest('[data-copy-phone]');
if (copyButton) {
const number = copyButton.dataset.copyPhone;
if (!navigator.clipboard || !navigator.clipboard.writeText) {
toast('Copy is not supported in this browser');
return;
}
navigator.clipboard.writeText(number).then(() => toast('Phone number copied')).catch(() => toast('Unable to copy phone number'));
}
});
document.addEventListener('input', e => {
    const dateInput = e.target.closest('[data-trip-date]');
    const notesInput = e.target.closest('[data-trip-notes]');
    const field = dateInput || notesInput;
    if (!field) return;
    const entry = itinerary.find(item => item.name === field.dataset.tripDate || item.name === field.dataset.tripNotes);
    if (!entry) return;
    if (dateInput) entry.date = dateInput.value;
    if (notesInput) entry.notes = notesInput.value;
    save();
    if (dateInput) updateCounts();
    renderUpcomingPlans();
});
$('#addTripDestinationForm')?.addEventListener('submit', e => {
    e.preventDefault();
    const select = $('#tripDestinationSelect');
    if (!select.value) return;
    if (addTripPlace(select.value)) {
        refresh();
        toast('Added to your itinerary');
    }
});
$$('#page-itinerary input[id^="budget"]').forEach(input => input.addEventListener('input', renderTripBudget));
$$('.category-chip').forEach(b => b.addEventListener('click', () => {
$$('.category-chip').forEach(x => x.classList.remove('selected'));
b.classList.add('selected');
renderHome(b.dataset.category);
}));
$('#searchInput')?.addEventListener('input', renderAll);
$('#categoryFilter')?.addEventListener('change', renderAll);
$('#homePlaceSearch')?.addEventListener('input', () => renderHome());
$('#favoriteSearch')?.addEventListener('input', renderFavorites);
$('#hotlineSearch')?.addEventListener('input', renderHotlines);
$('#memoryMonth')?.addEventListener('change', () => {
memoryDate = new Date(Number($('#memoryYear').value), Number($('#memoryMonth').value), 1);
renderMemoryCalendar();
});
$('#memoryYear')?.addEventListener('change', () => {
memoryDate = new Date(Number($('#memoryYear').value), Number($('#memoryMonth').value), 1);
renderMemoryCalendar();
});
$('#memoryPhotoInput')?.addEventListener('change', e => {
const file = e.target.files[0];
if (!file) return;
if (!file.type.startsWith('image/')) { toast('Choose an image file'); e.target.value = ''; return; }
if (file.size > 12 * 1024 * 1024) { toast('Choose an image smaller than 12 MB'); e.target.value = ''; return; }
const reader = new FileReader();
reader.onerror = () => toast('Could not read that photo. Try another file.');
reader.onload = () => {
const image = new Image();
image.onerror = () => toast('Could not open that photo. Try another file.');
image.onload = () => {
const scale = Math.min(1, 960 / Math.max(image.naturalWidth, image.naturalHeight)),
canvas = document.createElement('canvas');
canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
const context = canvas.getContext('2d');
if (!context) { toast('Could not process that photo.'); return; }
context.drawImage(image, 0, 0, canvas.width, canvas.height);
memoryPhoto = canvas.toDataURL('image/jpeg', 0.78);
if ($('#memoryPhotoPreview')) {
$('#memoryPhotoPreview').src = memoryPhoto;
$('#memoryPhotoPreview').hidden = false;
}
if ($('#memoryPhotoPlaceholder')) $('#memoryPhotoPlaceholder').hidden = true;
};
image.src = String(reader.result);
};
reader.readAsDataURL(file);
});
if ($('#closeModal')) $('#closeModal').onclick = () => $('#detailModal')?.classList.remove('open');
$('#detailModal')?.addEventListener('click', e => {
if (e.target === $('#detailModal')) $('#detailModal').classList.remove('open');
});
if ($('#modalAdd')) {
$('#modalAdd').onclick = () => {
if (currentPlace && addTripPlace(currentPlace.name)) {
refresh();
toast('Added to your itinerary');
} else {
toast('This place is already in your itinerary');
}
$('#detailModal')?.classList.remove('open');
};
}
$('#memoryForm')?.addEventListener('submit', e => {
e.preventDefault();
const title = $('#memoryTitle')?.value.trim() || '', text = $('#memoryText')?.value.trim() || '';
if (!title && !text) { toast('Add a title or experience before saving'); return; }
memories.unshift({
title: title || text.slice(0, 60),
text,
date: formatMemoryDate(memoryDate),
dateKey: memoryDateKey(memoryDate),
savedAt: new Date().toISOString(),
...(memoryPhoto ? { photo: memoryPhoto } : {})
});
if ($('#memoryTitle')) $('#memoryTitle').value = '';
if ($('#memoryText')) $('#memoryText').value = '';
if ($('#memoryPhotoInput')) $('#memoryPhotoInput').value = '';
memoryPhoto = '';
if ($('#memoryPhotoPreview')) {
$('#memoryPhotoPreview').src = '';
$('#memoryPhotoPreview').hidden = true;
}
if ($('#memoryPhotoPlaceholder')) $('#memoryPhotoPlaceholder').hidden = false;
memoryDate = new Date();
renderMemoryCalendar();
refresh();
toast('Your memory has been saved');
});
if ($('#editName')) {
    $('#editName').onclick = () => {
        let n = prompt('What name would you like to use?', traveler);
        if (n && n.trim()) {
            traveler = n.trim().slice(0, 32);
            localStorage.setItem('tv-name', traveler);
            updateCounts();
            toast('Profile name updated');
        }

};


document.addEventListener('click', e => {
    const presetBtn = e.target.closest('[data-preset-avatar]');
    if (!presetBtn) return;

    const src = presetBtn.dataset.presetAvatar;
    localStorage.setItem('tv-avatar', src);
    toast('Avatar updated');
});

const editAvatarBtn = $('#editAvatar');
const avatarInput = $('#avatarInput');

if (editAvatarBtn && avatarInput) {
    editAvatarBtn.addEventListener('click', () => avatarInput.click());

    avatarInput.addEventListener('change', e => {
        const file = e.target.files.item(0);
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast('Please choose an image file');
            e.target.value = '';
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            toast('Choose an image smaller than 10 MB');
            e.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onerror = () => toast('Could not read that image');
        reader.onload = () => {
            const img = new Image();
            img.onerror = () => toast('Could not open that image');
            img.onload = () => {
                const size = 256;
                const canvas = document.createElement('canvas');
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d');

                const minSide = Math.min(img.naturalWidth, img.naturalHeight);
                const sx = (img.naturalWidth - minSide) / 2;
                const sy = (img.naturalHeight - minSide) / 2;

                ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);

                const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                try {
                    localStorage.setItem('tv-avatar', dataUrl);
                    toast('Profile avatar updated');
                } catch (err) {
                    toast('Image too large to save. Try a smaller photo.');
                }
                e.target.value = ''; 
            };
            img.src = String(reader.result);
        };
        reader.readAsDataURL(file);
    });
}


}
const notifButton = $('#notifBtn');
if (notifButton) notifButton.onclick = () => toast('You are all caught up!');
document.addEventListener('keydown', e => {
if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
e.preventDefault();
navigate('explore');
$('#searchInput')?.focus();
}
if (e.key === 'Escape') {
$('#detailModal')?.classList.remove('open');
closeMore();
}
});
$('#closeMore')?.addEventListener('click', closeMore);
$('#moreModal')?.addEventListener('click', e => {
if (e.target === $('#moreModal')) closeMore();
});

const setTheme = theme => {
    if (!['blue', 'violet', 'black'].includes(theme)) theme = 'violet';
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('tv-theme', theme);
    $$('[data-theme-choice]').forEach(button => {
        button.setAttribute('aria-pressed', String(button.dataset.themeChoice === theme));
        button.classList.toggle('active', button.dataset.themeChoice === theme);
    });
};

setTheme(localStorage.getItem('tv-theme') || 'violet');

document.addEventListener('click', e => {
    const themeBtn = e.target.closest('[data-theme-choice]');
    if (!themeBtn) return;
    setTheme(themeBtn.dataset.themeChoice);
    toast('Theme changed to ' + themeBtn.dataset.themeChoice);
});


const topSearch = document.getElementById('topSearch');
if (topSearch) {
topSearch.addEventListener('input', () => {
navigate('explore');
const search = document.getElementById('searchInput');
if (search) {
search.value = topSearch.value;
renderAll();
}
});
}

function installTravelAssistant() {
    if (!$('.main') || $('#travelAssistant')) return;

    const root = document.createElement('aside');
    root.id = 'travelAssistant';
    root.className = 'travel-assistant';
    root.innerHTML = `
        <section class="assistant-panel" id="assistantPanel" role="dialog" aria-label="Traventure travel assistant" hidden>
            <header class="assistant-header">
                <span class="assistant-avatar" aria-hidden="true">✦</span>
                <div><strong>Traventure Assistant</strong><small>Local trip helper · Available anytime</small></div>
                <button class="assistant-close" type="button" aria-label="Close travel assistant">×</button>
            </header>
            <div class="assistant-messages" id="assistantMessages" role="log" aria-live="polite" aria-relevant="additions"></div>
            <div class="assistant-prompts" aria-label="Suggested questions">
                <button type="button" data-assistant-prompt="Recommend a beach">Beaches</button>
                <button type="button" data-assistant-prompt="Plan a 2 day trip for nature">Plan a trip</button>
                <button type="button" data-assistant-prompt="Help me estimate my trip budget">Trip budget</button>
            </div>
            <form class="assistant-form" id="assistantForm">
                <label class="sr-only" for="assistantInput">Ask the travel assistant</label>
                <input id="assistantInput" type="text" maxlength="300" placeholder="Ask about places or trip ideas..." autocomplete="off" required>
                <button type="submit" aria-label="Send message">↑</button>
            </form>
            <p class="assistant-disclaimer">Automated suggestions from Traventure’s destination list. No live AI, booking, or vendor pricing is connected.</p>
        </section>
        <button class="assistant-launcher" type="button" aria-controls="assistantPanel" aria-expanded="false">
            <span aria-hidden="true">✦</span><span>Ask Traventure</span>
        </button>`;
    document.body.append(root);

    const panel = $('#assistantPanel'), launcher = $('.assistant-launcher', root),
        messages = $('#assistantMessages'), input = $('#assistantInput');

    function addMessage(text, sender) {
        const message = document.createElement('p');
        message.className = 'assistant-message ' + sender;
        message.textContent = text;
        messages.append(message);
        messages.scrollTop = messages.scrollHeight;
    }

    function showPlaces(list, days) {
        const listElement = document.createElement('div');
        listElement.className = 'assistant-place-list';
        list.forEach((place, index) => {
            const card = document.createElement('article');
            card.className = 'assistant-place';
            const title = document.createElement('strong');
            title.textContent = place.name;
            const details = document.createElement('small');
            details.textContent = place.category + ' · ' + place.place;
            const description = document.createElement('p');
            description.textContent = place.description;
            const addButton = document.createElement('button');
            addButton.type = 'button';
            addButton.className = 'assistant-add-place';
            addButton.textContent = 'Add to my itinerary';
            addButton.addEventListener('click', () => {
                if (!addTripPlace(place.name)) {
                    addMessage(place.name + ' is already in your itinerary.', 'assistant');
                    return;
                }
                refresh();
                addMessage('Added ' + place.name + ' to your itinerary.', 'assistant');
                toast('Added to your itinerary');
            });
            card.append(title, details, description, addButton);
            if (days) {
                const day = document.createElement('span');
                day.className = 'assistant-day';
                day.textContent = 'Day ' + (Math.floor(index / 2) + 1);
                card.prepend(day);
            }
            listElement.append(card);
        });
        messages.append(listElement);

        if (days) {
            const addAll = document.createElement('button');
            addAll.type = 'button';
            addAll.className = 'assistant-add-plan';
            addAll.textContent = 'Add all ' + list.length + ' stops to my itinerary';
            addAll.addEventListener('click', () => {
                const start = new Date();
                start.setHours(12, 0, 0, 0);
                let added = 0;
                list.forEach((place, index) => {
                    const date = new Date(start);
                    date.setDate(date.getDate() + Math.floor(index / 2));
                    if (addTripPlace(place.name, localDateKey(date), 'Suggested by Traventure Assistant. Confirm local hours, fees, and travel conditions.')) added++;
                });
                refresh();
                addMessage(added ? 'Added ' + added + ' suggested stop' + (added === 1 ? '' : 's') + ' to your itinerary.' : 'Those places are already in your itinerary.', 'assistant');
                if (added) toast('Added ' + added + ' suggested stops');
            });
            messages.append(addAll);
        }
        messages.scrollTop = messages.scrollHeight;
    }

    function getCategories(query) {
        const categories = [
            { category: 'Beaches', words: ['beach', 'beaches', 'island', 'islands', 'surf', 'dagat', 'coast', 'coastal', 'nature', 'outdoor', 'outdoors'] },
            { category: 'Waterfalls', words: ['waterfall', 'waterfalls', 'falls', 'talon', 'nature', 'outdoor', 'outdoors'] },
            { category: 'Rivers', words: ['river', 'rivers', 'ilog', 'nature', 'outdoor', 'outdoors'] },
            { category: 'Mountains', words: ['mountain', 'mountains', 'hike', 'hiking', 'trek', 'bundok', 'nature', 'outdoor', 'outdoors'] },
            { category: 'Churches', words: ['church', 'churches', 'history', 'historic', 'heritage', 'culture'] },
            { category: 'Resorts & Campsites', words: ['resort', 'resorts', 'stay', 'camp', 'campsite', 'nature', 'outdoor', 'outdoors'] },
            { category: 'Tourist Attractions', words: ['attraction', 'attractions', 'landmark', 'sightseeing'] }
        ];
        return categories.filter(item => item.words.some(word => query.includes(word))).map(item => item.category);
    }

    function replyTo(query) {
        const normalized = query.toLowerCase();
        if (/budget|price|pricing|cost|expensive|cheap|afford|estimate/.test(normalized)) {
            addMessage('I can help you estimate a trip budget. Open the calculator to enter your group size, nights, and quoted transport, lodging, meals, and activity costs; the total updates as you edit them. These are your inputs, not live prices, so please confirm current rates with local providers.', 'assistant');
            const link = document.createElement('a');
            link.className = 'assistant-link';
            link.href = 'schedule.html#tripBudgetTitle';
            link.textContent = 'Open trip budget calculator ↗';
            messages.append(link);
            messages.scrollTop = messages.scrollHeight;
            return;
        }
        if (!places.length) {
            addMessage('Destination recommendations are available from the Traventure home page. Open it to browse the local destination catalog and draft a trip.', 'assistant');
            const link = document.createElement('a');
            link.className = 'assistant-link';
            link.href = 'home.html';
            link.textContent = 'Browse destinations ↗';
            messages.append(link);
            messages.scrollTop = messages.scrollHeight;
            return;
        }

        const dayMatch = normalized.match(/(\d{1,2})\s*(?:day|days|araw)/);
        const isPlanRequest = /plan|itinerary|build|schedule|trip|day trip/.test(normalized);
        const days = dayMatch ? Math.min(7, Math.max(1, Number(dayMatch[1]))) : 1;
        const categories = getCategories(normalized);
        const exactMatches = places.filter(place => (place.name + ' ' + place.place).toLowerCase().includes(normalized.trim()));
        const limit = isPlanRequest ? Math.min(days * 2, 10) : 3;
        const categoryGroups = categories.map(category => places.filter(place =>
            place.category === category && !itinerary.some(entry => entry.name === place.name)
        ));
        const balancedPlaces = [];
        while (categoryGroups.some(group => group.length) && balancedPlaces.length < limit) {
            categoryGroups.forEach(group => {
                if (group.length && balancedPlaces.length < limit) balancedPlaces.push(group.shift());
            });
        }
        const available = exactMatches.length
            ? exactMatches.filter(place => !itinerary.some(entry => entry.name === place.name))
            : categories.length ? balancedPlaces : places.filter(place => !itinerary.some(entry => entry.name === place.name));
        const suggestions = available.slice(0, limit);

        if (!suggestions.length) {
            addMessage('I could not find a matching place, or you already have those suggestions in your itinerary. Try asking for beaches, waterfalls, mountains, rivers, churches, resorts, or culture in Camarines Norte.', 'assistant');
            return;
        }
        if (isPlanRequest) {
            addMessage('Here is a ' + days + '-day draft based on the destinations and interests in Traventure. Stops are suggestions; check routes, opening times, weather, and fees before you go.', 'assistant');
            showPlaces(suggestions, days);
        } else {
            addMessage(categories.length ? 'Here are a few ' + categories.join(' and ').toLowerCase() + ' ideas in Camarines Norte:' : 'Here are a few places to explore in Camarines Norte:', 'assistant');
            showPlaces(suggestions);
        }
    }

    function submitPrompt(value) {
        const query = value.trim();
        if (!query) return;
        addMessage(query, 'traveler');
        replyTo(query);
        input.value = '';
        input.focus();
    }

    launcher.addEventListener('click', () => {
        const willOpen = panel.hidden;
        panel.hidden = !willOpen;
        launcher.setAttribute('aria-expanded', String(willOpen));
        if (willOpen) input.focus();
    });
    $('.assistant-close', root).addEventListener('click', () => {
        panel.hidden = true;
        launcher.setAttribute('aria-expanded', 'false');
        launcher.focus();
    });
    $('#assistantForm', root).addEventListener('submit', event => {
        event.preventDefault();
        submitPrompt(input.value);
    });
    $$('.assistant-prompts button', root).forEach(button => button.addEventListener('click', () => submitPrompt(button.dataset.assistantPrompt)));
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !panel.hidden) {
            panel.hidden = true;
            launcher.setAttribute('aria-expanded', 'false');
            launcher.focus();
        }
    });
    addMessage('Hi! Tell me what you enjoy or how many days you have, and I can suggest local places or draft a trip plan. Ask me about budgeting too.', 'assistant');
}

// 5. INITIALIZE CURRENT PAGE

renderMemoryCalendar();
renderHome();
renderMap();
renderHotlines();
refresh();
updateCounts();
installTravelAssistant();
