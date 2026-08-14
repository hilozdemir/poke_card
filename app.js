const API_ROOT = 'https://pokeapi.co/api/v2';
const grid = document.querySelector('#pokemonGrid');
const count = document.querySelector('#pokemonCount');
const search = document.querySelector('#searchInput');
const filters = document.querySelector('#filters');
const dialog = document.querySelector('#detailDialog');
const detailContent = document.querySelector('#detailContent');
const emptyState = document.querySelector('#emptyState');
const loadingTemplate = document.querySelector('#loadingTemplate');
const openingScreen = document.querySelector('#openingScreen');
const appContent = document.querySelector('#appContent');
const languageSelect = document.querySelector('#languageSelect');
let pokemon = [];
let activeType = 'all';
let activeAudio = null;
let totalPokemon = 0;
let isLoadingAll = false;
let loadRequestId = 0;
let activeDetailId = null;
let language = localStorage.getItem('pokecards-language') || 'tr';

const typeLabels = {
  tr: { fire:'Ateş', water:'Su', grass:'Çimen', electric:'Elektrik', poison:'Zehir', flying:'Uçan', bug:'Böcek', normal:'Normal', ground:'Yer', fairy:'Peri', fighting:'Dövüş', psychic:'Psişik', rock:'Kaya', ice:'Buz', ghost:'Hayalet', dragon:'Ejderha', dark:'Karanlık', steel:'Çelik' },
  en: { fire:'Fire', water:'Water', grass:'Grass', electric:'Electric', poison:'Poison', flying:'Flying', bug:'Bug', normal:'Normal', ground:'Ground', fairy:'Fairy', fighting:'Fighting', psychic:'Psychic', rock:'Rock', ice:'Ice', ghost:'Ghost', dragon:'Dragon', dark:'Dark', steel:'Steel' }
};
const uiText = {
  tr: { card:'kart', loading:'yükleniyor', height:'Boy', weight:'Ağırlık', experience:'Deneyim', listen:'Sesini Dinle', playing:'Çalıyor…', descriptionLoading:'Pokédex açıklaması yükleniyor…', details:'detaylarını aç', archive:'CANLI ARŞİV', collection:'PokéKart', search:'Pokémon ara...', filters:'TÜRLER', refresh:'Yenile', all:'Tümü', apiLive:'PokeAPI canlı' },
  en: { card:'cards', loading:'loading', height:'Height', weight:'Weight', experience:'Experience', listen:'Listen to Cry', playing:'Playing…', descriptionLoading:'Loading Pokédex description…', details:'open details', archive:'LIVE ARCHIVE', collection:'PokéCards', search:'Search Pokémon...', filters:'TYPE FILTERS', refresh:'Refresh', all:'All', apiLive:'PokeAPI live' }
};
const typeName = type => typeLabels[language][type] || type;
const typeDisplayName = type => typeName(type).toLocaleUpperCase(language === 'tr' ? 'tr-TR' : 'en-US');
const trName = name => name.replace(/\b\w/g, letter => letter.toLocaleUpperCase('tr-TR'));
const formatId = id => `#${String(id).padStart(3, '0')}`;

function showLoading() {
  grid.innerHTML = '';
  for (let i = 0; i < 8; i++) grid.append(loadingTemplate.content.cloneNode(true));
  emptyState.classList.add('hidden');
}

function cardTemplate(item) {
  const types = item.types.map(({ type }) => `<span class="type">${typeDisplayName(type.name)}</span>`).join('');
  const artwork = item.sprites.other?.['official-artwork']?.front_default || item.sprites.front_default;
  const primaryType = item.types[0]?.type.name || 'normal';
  return `<article class="pokemon-card">
    <div class="card-flip-inner">
      <div class="card-face card-face-front">
        <span class="card-number">${formatId(item.id)}</span><div class="type-pills">${types}</div>
        <button class="flip-button" type="button" data-flip-card aria-label="${trName(item.name)} kartını çevir" aria-pressed="false">↻</button>
        <div class="pokemon-art"><img loading="lazy" src="${artwork}" alt="${trName(item.name)}" /></div>
        <footer class="card-footer"><div><h3 class="pokemon-name pokemon-name--${primaryType}">${trName(item.name)}</h3><p>${item.height / 10} m · ${item.weight / 10} kg</p></div><button class="details-button" type="button" data-id="${item.id}" aria-label="${trName(item.name)} ${uiText[language].details}">+</button></footer>
      </div>
      <div class="card-face card-face-back card-back--${primaryType}">
        <span class="back-pokeball" aria-hidden="true"><i></i></span>
        <button class="flip-button flip-back-button" type="button" data-flip-card aria-label="${trName(item.name)} kartının ön yüzüne dön" aria-pressed="true">↺</button>
      </div>
    </div>
  </article>`;
}

function renderCards() {
  const query = search.value.trim().toLocaleLowerCase('tr-TR');
  const displayed = pokemon.filter(item => {
    const matchesSearch = item.name.toLocaleLowerCase('tr-TR').includes(query);
    const matchesType = activeType === 'all' || item.types.some(({ type }) => type.name === activeType);
    return matchesSearch && matchesType;
  });
  grid.innerHTML = displayed.map(cardTemplate).join('');
  count.textContent = isLoadingAll
    ? `${displayed.length} / ${totalPokemon} ${uiText[language].card} ${uiText[language].loading}`
    : `${displayed.length} ${uiText[language].card}`;
  emptyState.classList.toggle('hidden', displayed.length > 0 || isLoadingAll);
}

async function loadPokemon() {
  const requestId = ++loadRequestId;
  pokemon = [];
  totalPokemon = 0;
  isLoadingAll = true;
  showLoading();
  try {
    const list = await fetch(`${API_ROOT}/pokemon?limit=2000&offset=0`);
    if (!list.ok) throw new Error('Liste alınamadı');
    const data = await list.json();
    totalPokemon = data.count;
    const batchSize = 48;

    for (let start = 0; start < data.results.length; start += batchSize) {
      const batch = data.results.slice(start, start + batchSize);
      const results = await Promise.allSettled(batch.map(async ({ url }) => {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Kart verisi alınamadı');
        return response.json();
      }));
      if (requestId !== loadRequestId) return;

      pokemon.push(...results
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value));
      pokemon.sort((first, second) => first.id - second.id);
      renderCards();
    }
    if (requestId !== loadRequestId) return;
    isLoadingAll = false;
    renderCards();
  } catch (error) {
    if (requestId !== loadRequestId) return;
    isLoadingAll = false;
    grid.innerHTML = `<div class="error-card"><strong>PokéAPI’ye şu an ulaşılamıyor.</strong><br><span>Bağlantını kontrol edip tekrar deneyebilirsin.</span><br><button type="button" id="retryButton">Tekrar dene</button></div>`;
    count.textContent = '—';
  }
}

async function openDetails(id) {
  const item = pokemon.find(entry => entry.id === Number(id));
  if (!item) return;
  activeDetailId = Number(id);
  const detailLanguage = language;
  const artwork = item.sprites.other?.['official-artwork']?.front_default || item.sprites.front_default;
  const primaryType = item.types[0]?.type.name || 'normal';
  const types = item.types.map(({ type }) => `<span class="detail-type">${typeDisplayName(type.name)}</span>`).join('');
  const text = uiText[language];
  if (!dialog.open) dialog.showModal();
  detailContent.innerHTML = `<article class="detail-card detail-card--${primaryType}">
    <header class="detail-card-header"><span>${formatId(item.id)}</span><div class="detail-types">${types}</div></header>
    <h2>${trName(item.name)}</h2>
    <div class="detail-art"><img src="${artwork}" alt="${trName(item.name)}" /></div>
    <section class="detail-info"><p class="detail-description">${text.descriptionLoading}</p><div class="stats"><div class="stat"><strong>${item.height / 10} m</strong><span>${text.height}</span></div><div class="stat"><strong>${item.weight / 10} kg</strong><span>${text.weight}</span></div><div class="stat"><strong>${item.base_experience || '—'}</strong><span>${text.experience}</span></div></div><button class="sound-button" type="button" id="soundButton" data-id="${item.id}"><span>◖</span>${text.listen}</button></section>
  </article>`;
  try {
    const speciesResponse = await fetch(item.species.url);
    const species = await speciesResponse.json();
    const englishEntry = species.flavor_text_entries.find(text => text.language.name === 'en')?.flavor_text.replace(/[\n\f]/g, ' ');
    const description = detailContent.querySelector('.detail-description');
    if (!description || !englishEntry) return;
    if (language === 'tr') {
      try {
        const translation = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=tr&dt=t&q=${encodeURIComponent(englishEntry)}`);
        const data = await translation.json();
        if (activeDetailId === item.id && detailLanguage === language && description.isConnected) description.textContent = data[0].map(part => part[0]).join('');
      } catch { if (activeDetailId === item.id && detailLanguage === language && description.isConnected) description.textContent = englishEntry; }
    } else if (activeDetailId === item.id && detailLanguage === language && description.isConnected) description.textContent = englishEntry;
  } catch { /* Description is optional UI enhancement. */ }
}

function playFallback() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  const context = new AudioContext();
  [0, .11, .22].forEach((time, index) => {
    const oscillator = context.createOscillator(); const gain = context.createGain();
    oscillator.type = 'square'; oscillator.frequency.setValueAtTime(330 + index * 130, context.currentTime + time);
    gain.gain.setValueAtTime(.055, context.currentTime + time); gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + time + .15);
    oscillator.connect(gain).connect(context.destination); oscillator.start(context.currentTime + time); oscillator.stop(context.currentTime + time + .16);
  });
}

function playCry(id) {
  if (activeAudio) { activeAudio.pause(); activeAudio = null; }
  const item = pokemon.find(entry => entry.id === Number(id));
  const cryUrl = item?.cries?.latest || item?.cries?.legacy;
  const button = document.querySelector('#soundButton');
  if (!cryUrl) { playFallback(); return; }
  activeAudio = new Audio(cryUrl);
  activeAudio.addEventListener('play', () => { button?.classList.add('playing'); if (button) button.innerHTML = `<span>◼</span>${uiText[language].playing}`; });
  activeAudio.addEventListener('ended', () => { button?.classList.remove('playing'); if (button) button.innerHTML = `<span>◖</span>${uiText[language].listen}`; });
  activeAudio.addEventListener('error', () => { playFallback(); button?.classList.remove('playing'); if (button) button.innerHTML = `<span>◖</span>${uiText[language].listen}`; });
  activeAudio.play().catch(playFallback);
}

document.querySelector('#startButton').addEventListener('click', () => {
  openingScreen.classList.add('is-opening');
  window.setTimeout(() => {
    openingScreen.remove();
    appContent.classList.remove('app-hidden');
    loadPokemon();
  }, 1080);
});
document.querySelector('#refreshButton').addEventListener('click', loadPokemon);
languageSelect.value = language;
function applyLanguage() {
  const text = uiText[language];
  document.documentElement.lang = language;
  document.querySelector('#apiStatusText').textContent = text.apiLive;
  document.querySelector('#refreshText').textContent = text.refresh;
  document.querySelector('#archiveLabel').textContent = text.archive;
  document.querySelector('#collectionCardsText').textContent = text.collection;
  document.querySelector('#filterTitle').textContent = text.filters;
  search.placeholder = text.search;
  filters.querySelectorAll('.filter').forEach(button => {
    const label = button.dataset.type === 'all' ? text.all : typeName(button.dataset.type);
    const nestedLabel = button.querySelector('.filter-label');
    if (nestedLabel) {
      nestedLabel.textContent = label;
      return;
    }
    const textNode = [...button.childNodes].find(node => node.nodeType === Node.TEXT_NODE);
    if (textNode) textNode.textContent = ` ${label}`;
  });
}
applyLanguage();
languageSelect.addEventListener('change', () => {
  language = languageSelect.value;
  localStorage.setItem('pokecards-language', language);
  applyLanguage();
  renderCards();
  if (dialog.open && activeDetailId) openDetails(activeDetailId);
});
search.addEventListener('input', renderCards);
filters.addEventListener('click', event => {
  const button = event.target.closest('[data-type]'); if (!button) return;
  activeType = button.dataset.type;
  filters.querySelectorAll('.filter').forEach(filter => filter.classList.toggle('active', filter === button));
  renderCards();
});
grid.addEventListener('click', event => {
  const flipButton = event.target.closest('[data-flip-card]');
  if (flipButton) {
    const card = flipButton.closest('.pokemon-card');
    const isFlipped = card.classList.toggle('is-flipped');
    card.querySelectorAll('[data-flip-card]').forEach(button => button.setAttribute('aria-pressed', String(isFlipped)));
    return;
  }
  const button = event.target.closest('.details-button');
  if (button) openDetails(button.dataset.id);
  if (event.target.id === 'retryButton') loadPokemon();
});
detailContent.addEventListener('click', event => { const button = event.target.closest('#soundButton'); if (button) playCry(button.dataset.id); });
document.querySelector('#closeDialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
dialog.addEventListener('close', () => { activeDetailId = null; if (activeAudio) { activeAudio.pause(); activeAudio = null; } });
