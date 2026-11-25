import { COUNTRIES } from './films.js';
import { createGlobe } from './globe.js';
import { printTicket, discardTicket } from './ticket.js';
import { loadBook, addStub, nextSerial, collectedIds, renderBook } from './book.js';
import { sfx, unlockAudio } from './sound.js';

const $ = (s) => document.querySelector(s);
const spinBtn = $('#spinBtn');
const label = $('#countryLabel');
const hint = $('#hint');
const bookBtn = $('#bookBtn');
const bookCount = $('#bookCount');
const bookEl = $('#book');
const bay = $('#ticketBay');

// Jagged torn-paper edges, used by CSS as clip-paths.
function zigzag(side, n = 18, depth = 5) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const y = `${((i / n) * 100).toFixed(2)}%`;
    const deep = i % 2 === 1;
    pts.push(side === 'right'
      ? `${deep ? `calc(100% - ${depth}px)` : '100%'} ${y}`
      : `${deep ? `${depth}px` : '0px'} ${y}`);
  }
  return side === 'right'
    ? `polygon(0 0, ${pts.join(', ')}, 0 100%)`
    : `polygon(${pts.join(', ')}, 100% 100%, 100% 0)`;
}
document.documentElement.style.setProperty('--zig-right', zigzag('right'));
document.documentElement.style.setProperty('--zig-left', zigzag('left'));

$('#version').textContent = `v ${window.APP_VERSION || 'dev'}`;

function updateCount(bump = false) {
  bookCount.textContent = loadBook().stubs.length;
  if (bump) bookBtn.animate(
    [{ transform: 'scale(1)' }, { transform: 'scale(1.35) rotate(-8deg)' }, { transform: 'scale(1)' }],
    { duration: 400, easing: 'ease-out' },
  );
}
updateCount();

// Pick a country (evenly), preferring films not in the book yet.
function pickFilm() {
  const have = collectedIds();
  let options = COUNTRIES.map((c) => ({ c, films: c.films.filter((f) => !have.has(f.id)) })).filter((o) => o.films.length);
  if (!options.length) options = COUNTRIES.map((c) => ({ c, films: c.films }));
  const o = options[Math.floor(Math.random() * options.length)];
  return o.films[Math.floor(Math.random() * o.films.length)];
}

const globe = await createGlobe($('#globe'), {
  playable: COUNTRIES.map((c) => c.atlas),
  onTick: sfx.tick,
  onFlick: (v) => spin(Math.min(1, Math.abs(v) / 3), Math.sign(v)),
});

let busy = false;

async function spin(strength = 0.5, dir = 1) {
  unlockAudio();
  if (busy || globe.isSpinning()) return;
  busy = true;
  discardTicket();
  spinBtn.disabled = true;
  label.classList.remove('show');
  hint.textContent = 'Round and round it goes…';
  const film = pickFilm();
  await globe.spinTo(film.country.atlas, { strength, dir });
  sfx.ding();
  label.textContent = film.country.name;
  label.classList.add('show');
  hint.textContent = 'Now showing…';
  await new Promise((r) => setTimeout(r, 450));
  printTicket(bay, film, nextSerial(), {
    bookButton: bookBtn,
    onTorn: (f, serial) => {
      addStub(f.id, serial);
      updateCount(true);
      hint.textContent = 'Stub saved to your book! Spin again?';
    },
  });
  setTimeout(() => { hint.textContent = 'Drag the stub to tear it off ✂'; }, 1400);
  spinBtn.disabled = false;
  busy = false;
}

spinBtn.addEventListener('click', () => spin(0.4 + Math.random() * 0.6, 1));
document.addEventListener('pointerdown', unlockAudio, { once: true });

bookBtn.addEventListener('click', () => {
  renderBook(bookEl);
  bookEl.hidden = false;
  bookEl.animate([{ opacity: 0, transform: 'scale(0.96)' }, { opacity: 1, transform: 'none' }], { duration: 200 });
});
bookEl.querySelector('.book-close').addEventListener('click', () => { bookEl.hidden = true; });

hint.textContent = 'Spin the globe — flick it or press SPIN';
