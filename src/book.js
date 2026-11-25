// The ticket book: torn-off stubs, saved on this device.
import { FILM_BY_ID, COUNTRIES, flagOf } from './films.js';

const KEY = 'ticket-book-v1';

export function loadBook() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY));
    if (data && Array.isArray(data.stubs)) return data;
  } catch { /* fresh book */ }
  return { stubs: [], serial: 0 };
}

function saveBook(book) {
  localStorage.setItem(KEY, JSON.stringify(book));
}

export function nextSerial() {
  const book = loadBook();
  return book.serial + 1;
}

export function addStub(filmId, serial) {
  const book = loadBook();
  book.serial = Math.max(book.serial, serial);
  if (!book.stubs.some((s) => s.id === filmId)) book.stubs.push({ id: filmId, serial, at: Date.now() });
  saveBook(book);
  return book;
}

export function collectedIds() {
  return new Set(loadBook().stubs.map((s) => s.id));
}

const hash = (s) => [...s].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) | 0, 7);
const pad = (n) => String(n).padStart(6, '0');

export function stubHTML(film, serial) {
  const c = film.country;
  return `
    <div class="stub-flag">${flagOf(c.code)}</div>
    <div class="stub-country">${c.name}</div>
    <div class="stub-title">${film.title}</div>
    <div class="stub-year">${film.year}</div>
    <div class="stub-serial">Nº ${pad(serial)}</div>
    <div class="stub-admit">ADMIT ONE</div>`;
}

export function renderBook(root) {
  const book = loadBook();
  const stubs = book.stubs.map((s) => ({ ...s, film: FILM_BY_ID.get(s.id) })).filter((s) => s.film);
  const countries = new Set(stubs.map((s) => s.film.country.code));
  root.querySelector('.book-stats').textContent =
    `${stubs.length} film${stubs.length === 1 ? '' : 's'} · ${countries.size} of ${COUNTRIES.length} countries`;
  const grid = root.querySelector('.book-grid');
  grid.innerHTML = '';
  if (!stubs.length) {
    grid.innerHTML = '<p class="book-empty">No stubs yet.<br>Spin the globe and tear off your first ticket!</p>';
    return;
  }
  for (const s of stubs) {
    const el = document.createElement('button');
    el.className = 'stub in-book';
    el.style.setProperty('--tilt', `${(hash(s.id) % 7) - 3}deg`);
    el.innerHTML = stubHTML(s.film, s.serial);
    el.addEventListener('click', () => showDetail(root, s));
    grid.appendChild(el);
  }
}

function showDetail(root, s) {
  const d = root.querySelector('.book-detail');
  const f = s.film;
  d.innerHTML = `
    <div class="detail-card">
      <div class="detail-flag">${flagOf(f.country.code)}</div>
      <h3>${f.title}</h3>
      <p>${f.year} · ${f.country.name}</p>
      <p>Directed by ${f.director}</p>
      <p class="detail-when">Ticket Nº ${pad(s.serial)} · collected ${new Date(s.at).toLocaleDateString()}</p>
      <button class="detail-close">Close</button>
    </div>`;
  d.hidden = false;
  d.querySelector('.detail-close').onclick = () => { d.hidden = true; };
  d.onclick = (e) => { if (e.target === d) d.hidden = true; };
}
