// The film ticket: prints out of the slot, then you drag the stub to tear it off.
import { flagOf } from './films.js';
import { stubHTML } from './book.js';
import { sfx } from './sound.js';

const TEAR_DISTANCE = 70; // px of pull before the perforation gives

let current = null;

function seatFor(serial) {
  const row = 'ABCDEFGHJKLMN'[serial * 7 % 13];
  const seat = (serial * 11 % 24) + 1;
  return `ROW ${row} · SEAT ${seat}`;
}

export function hasTicket() {
  return !!current;
}

// Drop an untorn ticket away (e.g. when spinning again).
export function discardTicket() {
  if (!current || current.torn) return;
  const { el } = current;
  current = null;
  el.style.pointerEvents = 'none';
  el.animate(
    [{ transform: 'translateY(0) rotate(0)', opacity: 1 }, { transform: 'translateY(60vh) rotate(-14deg)', opacity: 0 }],
    { duration: 600, easing: 'cubic-bezier(.5,0,.9,.6)', fill: 'forwards' },
  ).onfinish = () => el.remove();
}

export function printTicket(bay, film, serial, { onTorn, bookButton }) {
  discardTicket();
  const c = film.country;
  const el = document.createElement('div');
  el.className = 'ticket';
  el.innerHTML = `
    <div class="ticket-main">
      <div class="tm-admit">★ ADMIT ONE ★</div>
      <div class="tm-country">${flagOf(c.code)} ${c.name}</div>
      <div class="tm-title">${film.title}</div>
      <div class="tm-meta">${film.year} · dir. ${film.director}</div>
      <div class="tm-seat">${seatFor(serial)}</div>
    </div>
    <div class="stub">${stubHTML(film, serial)}</div>`;
  bay.appendChild(el);
  const stub = el.querySelector('.stub');
  const state = { el, torn: false };
  current = state;

  // Print out of the slot in mechanical chunks.
  bay.classList.add('printing');
  const steps = 7;
  for (let i = 0; i < steps; i++) setTimeout(() => current === state && sfx.chunk(), i * 190);
  el.animate(
    [{ transform: 'translateY(-104%)' }, { transform: 'translateY(0)' }],
    { duration: 190 * steps, easing: `steps(${steps}, end)`, fill: 'backwards' },
  ).onfinish = () => {
    bay.classList.remove('printing');
    el.animate(
      [{ transform: 'translateY(0)' }, { transform: 'translateY(6px)' }, { transform: 'translateY(0)' }],
      { duration: 260, easing: 'ease-out' },
    );
    el.classList.add('ready');
  };

  // Tearing.
  let start = null;
  let grab = null; // pointer offset inside the stub once torn
  let lastStrain = 0;

  stub.addEventListener('pointerdown', (e) => {
    if (!el.classList.contains('ready') || state.torn) return;
    e.preventDefault();
    start = { x: e.clientX, y: e.clientY, id: e.pointerId };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    el.classList.add('pulling');
  });

  function onMove(e) {
    if (!start || e.pointerId !== start.id) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (!state.torn) {
      const d = Math.hypot(dx, dy);
      if (d >= TEAR_DISTANCE) {
        tear(e);
      } else {
        const k = 0.22;
        stub.style.transform = `translate(${dx * k}px, ${dy * k}px) rotate(${(dy * 0.06 + dx * 0.02).toFixed(2)}deg)`;
        el.style.transform = `rotate(${(-dy * 0.012).toFixed(2)}deg)`;
        if (d - lastStrain > 18) { lastStrain = d; sfx.strain(); }
      }
    } else {
      moveFree(e);
    }
  }

  function release(e) {
    if (!start || e.pointerId !== start.id) return;
    start = null;
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', release);
    window.removeEventListener('pointercancel', release);
    el.classList.remove('pulling');
    if (state.torn) {
      flyToBook();
    } else {
      lastStrain = 0;
      stub.animate(
        [{ transform: stub.style.transform || 'none' }, { transform: 'none' }],
        { duration: 220, easing: 'cubic-bezier(.3,1.6,.5,1)' },
      );
      stub.style.transform = '';
      el.style.transform = '';
    }
  }

  function tear(e) {
    state.torn = true;
    sfx.rip();
    if (navigator.vibrate) navigator.vibrate(30);
    const r = stub.getBoundingClientRect();
    grab = { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height };
    // Lift the stub out of the ticket so it can go anywhere on screen.
    stub.style.transform = '';
    stub.classList.add('loose');
    stub.style.width = `${r.width}px`;
    stub.style.height = `${r.height}px`;
    document.body.appendChild(stub);
    el.classList.add('torn');
    el.style.transform = '';
    moveFree(e);
    // The rest of the ticket flutters down.
    el.animate(
      [
        { transform: 'translate(0,0) rotate(0)', opacity: 1 },
        { transform: 'translate(-20px, 30px) rotate(-8deg)', opacity: 1, offset: 0.3 },
        { transform: 'translate(-40px, 70vh) rotate(-25deg)', opacity: 0 },
      ],
      { duration: 1300, easing: 'cubic-bezier(.4,0,.8,.6)', fill: 'forwards' },
    ).onfinish = () => el.remove();
  }

  function moveFree(e) {
    const x = e.clientX - grab.x;
    const y = e.clientY - grab.y;
    stub.style.left = `${x}px`;
    stub.style.top = `${y}px`;
    stub.style.transform = 'rotate(-6deg) scale(1.06)';
  }

  function flyToBook() {
    current = null;
    sfx.whoosh();
    const from = stub.getBoundingClientRect();
    const to = bookButton.getBoundingClientRect();
    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top + to.height / 2 - (from.top + from.height / 2);
    stub.style.pointerEvents = 'none';
    stub.animate(
      [
        { transform: 'translate(0,0) rotate(-6deg) scale(1.06)', opacity: 1 },
        { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 60}px) rotate(160deg) scale(0.7)`, opacity: 1, offset: 0.5 },
        { transform: `translate(${dx}px, ${dy}px) rotate(340deg) scale(0.15)`, opacity: 0.6 },
      ],
      { duration: 700, easing: 'cubic-bezier(.45,0,.4,1)', fill: 'forwards' },
    ).onfinish = () => {
      stub.remove();
      sfx.thud();
      onTorn(film, serial);
    };
  }
}
