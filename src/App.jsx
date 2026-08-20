import React, { useEffect, useMemo, useRef, useState } from 'react';

const API_ROOT = 'https://pokeapi.co/api/v2';
const typeLabels = {
  tr: { fire: 'Ateş', water: 'Su', grass: 'Çimen', electric: 'Elektrik', poison: 'Zehir', flying: 'Uçan', bug: 'Böcek', normal: 'Normal', ground: 'Yer', fairy: 'Peri', fighting: 'Dövüş', psychic: 'Psişik', rock: 'Kaya', ice: 'Buz', ghost: 'Hayalet', dragon: 'Ejderha', dark: 'Karanlık', steel: 'Çelik' },
  en: { fire: 'Fire', water: 'Water', grass: 'Grass', electric: 'Electric', poison: 'Poison', flying: 'Flying', bug: 'Bug', normal: 'Normal', ground: 'Ground', fairy: 'Fairy', fighting: 'Fighting', psychic: 'Psychic', rock: 'Rock', ice: 'Ice', ghost: 'Ghost', dragon: 'Dragon', dark: 'Dark', steel: 'Steel' },
};
const uiText = {
  tr: { card: 'kart', loading: 'yükleniyor', height: 'Boy', weight: 'Ağırlık', experience: 'Deneyim', listen: 'Sesini Dinle', playing: 'Çalıyor…', descriptionLoading: 'Pokédex açıklaması yükleniyor…', details: 'detaylarını aç', archive: 'CANLI ARŞİV', collection: 'PokéKart', search: 'Pokémon ara...', filters: 'TÜRLER', refresh: 'Yenile', all: 'Tümü', apiLive: 'PokeAPI canlı', emptyTitle: 'Aramana uygun kart yok', emptyText: 'Farklı bir Pokémon adı ya da tür deneyebilirsin.', errorTitle: 'PokéAPI’ye şu an ulaşılamıyor.', errorText: 'Bağlantını kontrol edip tekrar deneyebilirsin.', retry: 'Tekrar dene' },
  en: { card: 'cards', loading: 'loading', height: 'Height', weight: 'Weight', experience: 'Experience', listen: 'Listen to Cry', playing: 'Playing…', descriptionLoading: 'Loading Pokédex description…', details: 'open details', archive: 'LIVE ARCHIVE', collection: 'PokéCards', search: 'Search Pokémon...', filters: 'TYPE FILTERS', refresh: 'Refresh', all: 'All', apiLive: 'PokeAPI live', emptyTitle: 'No cards match your search', emptyText: 'Try a different Pokémon name or type.', errorTitle: 'PokéAPI is unavailable right now.', errorText: 'Check your connection and try again.', retry: 'Try again' },
};
const filterTypes = [['all', '✦'], ['fire', '🔥'], ['water', '💧'], ['grass', '🌿'], ['electric', '⚡'], ['ice', '❄️'], ['fighting', '🥊'], ['poison', '☠️'], ['ground', '🌍'], ['flying', '🪽'], ['psychic', '🔮'], ['bug', '🐛'], ['rock', '🪨'], ['ghost', '👻'], ['dragon', '🐉'], ['dark', '🌑'], ['steel', '⚙️'], ['fairy', '🧚'], ['normal', '⚪']];
const formatId = (id) => `#${String(id).padStart(3, '0')}`;
const displayName = (name) => name.replace(/\b\w/g, (letter) => letter.toLocaleUpperCase('tr-TR'));
const getArtwork = (item) => item.sprites.other?.['official-artwork']?.front_default || item.sprites.front_default;

function PokemonCard({ item, language, text, onDetails }) {
  const [flipped, setFlipped] = useState(false);
  const primaryType = item.types[0]?.type.name || 'normal';
  const name = displayName(item.name);
  const typeName = (type) => (typeLabels[language][type] || type).toLocaleUpperCase(language === 'tr' ? 'tr-TR' : 'en-US');
  return <article className={`pokemon-card${flipped ? ' is-flipped' : ''}`}>
    <div className="card-flip-inner">
      <div className="card-face card-face-front">
        <span className="card-number">{formatId(item.id)}</span>
        <div className="type-pills">{item.types.map(({ type }) => <span className="type" key={type.name}>{typeName(type.name)}</span>)}</div>
        <button className="flip-button" type="button" onClick={() => setFlipped(true)} aria-label={`${name} kartını çevir`} aria-pressed={flipped}>↻</button>
        <div className="pokemon-art"><img loading="lazy" src={getArtwork(item)} alt={name} /></div>
        <footer className="card-footer"><div><h3 className={`pokemon-name pokemon-name--${primaryType}`}>{name}</h3><p>{item.height / 10} m · {item.weight / 10} kg</p></div><button className="details-button" type="button" onClick={() => onDetails(item)} aria-label={`${name} ${text.details}`}>+</button></footer>
      </div>
      <div className={`card-face card-face-back card-back--${primaryType}`}><span className="back-pokeball" aria-hidden="true"><i /></span><button className="flip-button flip-back-button" type="button" onClick={() => setFlipped(false)} aria-label={`${name} kartının ön yüzüne dön`} aria-pressed={flipped}>↺</button></div>
    </div>
  </article>;
}

function SkeletonCards() {
  return Array.from({ length: 8 }, (_, index) => <article className="pokemon-card skeleton-card" key={index}><div /><div /><div /></article>);
}

function DetailDialog({ item, language, text, dialogRef, onClose }) {
  const [description, setDescription] = useState(text.descriptionLoading);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);
  const primaryType = item.types[0]?.type.name || 'normal';

  useEffect(() => {
    const controller = new AbortController();
    setDescription(text.descriptionLoading);
    fetch(item.species.url, { signal: controller.signal })
      .then((response) => response.json())
      .then(async (species) => {
        const entry = species.flavor_text_entries.find((value) => value.language.name === 'en')?.flavor_text.replace(/[\n\f]/g, ' ');
        if (!entry) return;
        if (language !== 'tr') { setDescription(entry); return; }
        try {
          const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=tr&dt=t&q=${encodeURIComponent(entry)}`, { signal: controller.signal });
          const data = await response.json();
          setDescription(data[0].map((part) => part[0]).join(''));
        } catch (error) { if (error.name !== 'AbortError') setDescription(entry); }
      }).catch(() => {});
    return () => controller.abort();
  }, [item, language, text.descriptionLoading]);

  useEffect(() => () => audioRef.current?.pause(), []);
  const playFallback = () => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const context = new AudioContext();
    [0, 0.11, 0.22].forEach((time, index) => {
      const oscillator = context.createOscillator(); const gain = context.createGain();
      oscillator.type = 'square'; oscillator.frequency.setValueAtTime(330 + index * 130, context.currentTime + time);
      gain.gain.setValueAtTime(0.055, context.currentTime + time); gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + time + 0.15);
      oscillator.connect(gain).connect(context.destination); oscillator.start(context.currentTime + time); oscillator.stop(context.currentTime + time + 0.16);
    });
  };
  const playCry = () => {
    audioRef.current?.pause();
    const cryUrl = item.cries?.latest || item.cries?.legacy;
    if (!cryUrl) { playFallback(); return; }
    const audio = new Audio(cryUrl); audioRef.current = audio;
    audio.addEventListener('play', () => setIsPlaying(true));
    audio.addEventListener('ended', () => setIsPlaying(false));
    audio.addEventListener('error', () => { setIsPlaying(false); playFallback(); });
    audio.play().catch(playFallback);
  };
  const name = displayName(item.name);
  return <dialog className="detail-dialog" ref={dialogRef} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }} onClose={onClose}>
    <button className="close-button" type="button" onClick={onClose} aria-label="Detayları kapat">×</button>
    <article className={`detail-card detail-card--${primaryType}`}>
      <header className="detail-card-header"><span>{formatId(item.id)}</span><div className="detail-types">{item.types.map(({ type }) => <span className="detail-type" key={type.name}>{(typeLabels[language][type.name] || type.name).toLocaleUpperCase(language === 'tr' ? 'tr-TR' : 'en-US')}</span>)}</div></header>
      <h2>{name}</h2><div className="detail-art"><img src={getArtwork(item)} alt={name} /></div>
      <section className="detail-info"><p className="detail-description">{description}</p><div className="stats"><div className="stat"><strong>{item.height / 10} m</strong><span>{text.height}</span></div><div className="stat"><strong>{item.weight / 10} kg</strong><span>{text.weight}</span></div><div className="stat"><strong>{item.base_experience || '—'}</strong><span>{text.experience}</span></div></div><button className={`sound-button${isPlaying ? ' playing' : ''}`} type="button" onClick={playCry}><span>{isPlaying ? '◼' : '◖'}</span>{isPlaying ? text.playing : text.listen}</button></section>
    </article>
  </dialog>;
}

export default function App() {
  const [hasStarted, setHasStarted] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [pokemon, setPokemon] = useState([]);
  const [totalPokemon, setTotalPokemon] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [language, setLanguage] = useState(() => localStorage.getItem('pokecards-language') || 'tr');
  const [query, setQuery] = useState('');
  const [activeType, setActiveType] = useState('all');
  const [detailItem, setDetailItem] = useState(null);
  const dialogRef = useRef(null); const requestRef = useRef(0);
  const text = uiText[language];

  useEffect(() => { document.documentElement.lang = language; localStorage.setItem('pokecards-language', language); }, [language]);
  useEffect(() => { if (detailItem && !dialogRef.current?.open) dialogRef.current?.showModal(); }, [detailItem]);
  const loadPokemon = async () => {
    const requestId = ++requestRef.current;
    setPokemon([]); setTotalPokemon(0); setIsLoading(true); setLoadError(false);
    try {
      const response = await fetch(`${API_ROOT}/pokemon?limit=2000&offset=0`);
      if (!response.ok) throw new Error('Pokemon list request failed');
      const data = await response.json(); setTotalPokemon(data.count);
      for (let start = 0; start < data.results.length; start += 48) {
        const results = await Promise.allSettled(data.results.slice(start, start + 48).map(async ({ url }) => {
          const itemResponse = await fetch(url); if (!itemResponse.ok) throw new Error('Pokemon request failed'); return itemResponse.json();
        }));
        if (requestId !== requestRef.current) return;
        const batch = results.filter((result) => result.status === 'fulfilled').map((result) => result.value);
        setPokemon((current) => [...current, ...batch].sort((first, second) => first.id - second.id));
      }
      if (requestId === requestRef.current) setIsLoading(false);
    } catch { if (requestId === requestRef.current) { setIsLoading(false); setLoadError(true); } }
  };
  useEffect(() => { if (hasStarted) loadPokemon(); }, [hasStarted]);
  const displayed = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('tr-TR');
    return pokemon.filter((item) => item.name.toLocaleLowerCase('tr-TR').includes(normalized) && (activeType === 'all' || item.types.some(({ type }) => type.name === activeType)));
  }, [pokemon, query, activeType]);
  const closeDetail = () => { if (dialogRef.current?.open) dialogRef.current.close(); setDetailItem(null); };
  const start = () => { setIsOpening(true); window.setTimeout(() => setHasStarted(true), 1080); };

  if (!hasStarted) return <section className={`opening-screen${isOpening ? ' is-opening' : ''}`} aria-labelledby="openingTitle"><h1 className="visually-hidden" id="openingTitle">Pokédex açılış ekranı</h1><span className="opening-light" aria-hidden="true" /><button className="opening-pokeball" type="button" onClick={start} aria-label="Poké Topunu aç ve Pokémon kartlarını göster"><span className="ball-top" /><span className="ball-bottom" /><span className="ball-line" /><span className="ball-center"><i /></span></button></section>;

  return <main className="app-shell" id="top">
    <nav className="topbar" aria-label="Ana menü"><a className="brand" href="#top" aria-label="Pokédex ana sayfa"><span className="brand-mark"><i /></span><span>Poké<span>Cards</span></span></a><span className="live-status"><b /> {text.apiLive}</span><label className="language-picker"><span aria-hidden="true">◎</span><select value={language} onChange={(event) => setLanguage(event.target.value)} aria-label="Dil seçimi"><option value="tr">Türkçe</option><option value="en">English</option></select></label><button className="outline-button" type="button" onClick={loadPokemon}><span aria-hidden="true">↻</span> {text.refresh}</button></nav>
    <section className="collection" aria-labelledby="collectionTitle"><div className="section-heading"><div><p className="eyebrow">{text.archive}</p><h2 id="collectionTitle"><span className="collection-title">{text.collection}</span> <span id="pokemonCount">{isLoading ? `${displayed.length} / ${totalPokemon} ${text.card} ${text.loading}` : `${displayed.length} ${text.card}`}</span></h2></div><label className="search-box"><span aria-hidden="true">⌕</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={text.search} autoComplete="off" /></label></div>
      <div className="collection-layout"><details className="type-sidebar" open aria-label="Pokémon türleri"><summary className="sidebar-title"><span>{text.filters}</span><span className="sidebar-chevron" aria-hidden="true">⌄</span></summary><div className="filters" aria-label="Tür filtresi">{filterTypes.map(([type, icon]) => <button className={`filter${activeType === type ? ' active' : ''}`} type="button" key={type} onClick={() => setActiveType(type)}><span>{icon}</span> {type === 'all' ? text.all : typeLabels[language][type]}</button>)}</div></details>
        <div className="cards-area"><div className="pokemon-grid" aria-live="polite">{isLoading && pokemon.length === 0 ? <SkeletonCards /> : loadError ? <div className="error-card"><strong>{text.errorTitle}</strong><br /><span>{text.errorText}</span><br /><button type="button" onClick={loadPokemon}>{text.retry}</button></div> : displayed.map((item) => <PokemonCard item={item} language={language} text={text} onDetails={setDetailItem} key={item.id} />)}</div>{!isLoading && !loadError && displayed.length === 0 && <div className="empty-state"><span>⌕</span><h3>{text.emptyTitle}</h3><p>{text.emptyText}</p></div>}</div>
      </div>
    </section>
    {detailItem && <DetailDialog item={detailItem} language={language} text={text} dialogRef={dialogRef} onClose={closeDetail} />}
  </main>;
}
