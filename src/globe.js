// A spinning orthographic globe drawn on a canvas with d3-geo.
// Drag to turn it, flick or call spinTo() to spin it onto a country.
const { d3, topojson } = window;

const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const wrap = (a) => ((a % 360) + 540) % 360 - 180;

// Centre of a country's biggest piece (so France lands on France, not French Guiana).
function mainCentroid(feature) {
  const g = feature.geometry;
  if (g.type !== 'MultiPolygon') return d3.geoCentroid(feature);
  let best = null;
  let bestArea = -1;
  for (const coordinates of g.coordinates) {
    const poly = { type: 'Polygon', coordinates };
    const area = d3.geoArea(poly);
    if (area > bestArea) { bestArea = area; best = poly; }
  }
  return d3.geoCentroid(best);
}

export async function createGlobe(canvas, { playable, onTick, onFlick }) {
  const topo = await fetch('data/countries-110m.json').then((r) => r.json());
  const features = topojson.feature(topo, topo.objects.countries).features
    .filter((ft) => ft.properties.name !== 'Antarctica');
  const byName = new Map(features.map((ft) => [ft.properties.name, ft]));
  for (const name of playable) if (!byName.has(name)) console.warn('No map shape for', name);

  const playableSet = new Set(playable);
  const filmLand = { type: 'FeatureCollection', features: features.filter((ft) => playableSet.has(ft.properties.name)) };
  const otherLand = { type: 'FeatureCollection', features: features.filter((ft) => !playableSet.has(ft.properties.name)) };
  const allLand = { type: 'FeatureCollection', features };
  const graticule = d3.geoGraticule10();
  const sphere = { type: 'Sphere' };

  const ctx = canvas.getContext('2d');
  const projection = d3.geoOrthographic().clipAngle(90).precision(0.6);
  const path = d3.geoPath(projection, ctx);

  let size = 0;
  let dpr = 1;
  let rot = [-10, -25, 0];
  let zoom = 1;
  let zoomFrom = 1;
  let zoomTo = 1;
  let zoomStart = 0;
  let highlight = null;
  let highlightAt = 0;
  let spin = null; // active spin animation
  let dragging = false;
  let idle = true;
  let lastTickRot = 0;

  function resize() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    size = Math.max(10, Math.min(r.width, r.height));
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  function draw(now) {
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    const cx = w / 2;
    const cy = h / 2;
    const R = size / 2 - 6;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // Lens: everything is clipped to the globe's disc, so zooming in looks
    // like a magnifying glass on the landed country.
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.clip();

    projection.translate([cx, cy]).scale(R * zoom).rotate(rot);

    const ocean = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R * 1.05);
    ocean.addColorStop(0, '#4f9aa6');
    ocean.addColorStop(1, '#1d4f5e');
    ctx.fillStyle = ocean;
    ctx.fillRect(0, 0, w, h);

    ctx.beginPath(); path(graticule);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 0.8; ctx.stroke();

    ctx.beginPath(); path(otherLand); ctx.fillStyle = '#b9ad8c'; ctx.fill();
    ctx.beginPath(); path(filmLand); ctx.fillStyle = '#f2e3bb'; ctx.fill();

    if (highlight) {
      const t = (now - highlightAt) / 1000;
      const pulse = 0.65 + 0.35 * Math.sin(t * 5);
      ctx.beginPath(); path(highlight);
      ctx.fillStyle = `rgba(214, 48, 49, ${pulse})`; ctx.fill();
    }

    ctx.beginPath(); path(allLand);
    ctx.strokeStyle = 'rgba(60, 40, 20, 0.55)'; ctx.lineWidth = 0.6; ctx.stroke();

    if (highlight) {
      ctx.beginPath(); path(highlight);
      ctx.strokeStyle = '#7a0f10'; ctx.lineWidth = 1.6; ctx.stroke();
    }
    ctx.restore();

    // Shading for a round, lit look.
    const shade = ctx.createRadialGradient(cx - R * 0.4, cy - R * 0.45, R * 0.05, cx, cy, R);
    shade.addColorStop(0, 'rgba(255,255,255,0.28)');
    shade.addColorStop(0.45, 'rgba(255,255,255,0)');
    shade.addColorStop(0.85, 'rgba(0,0,0,0.12)');
    shade.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = shade; ctx.fill();

    // Brass rim.
    ctx.beginPath(); ctx.arc(cx, cy, R + 2, 0, Math.PI * 2);
    ctx.strokeStyle = '#c9a04a'; ctx.lineWidth = 5; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, R + 4.5, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1; ctx.stroke();

    // Aiming reticle in the middle.
    const ringR = highlight ? 14 + 3 * Math.sin((now - highlightAt) / 180) : 12;
    ctx.beginPath(); ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 245, 220, 0.9)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - ringR - 6, cy); ctx.lineTo(cx - ringR + 4, cy);
    ctx.moveTo(cx + ringR - 4, cy); ctx.lineTo(cx + ringR + 6, cy);
    ctx.moveTo(cx, cy - ringR - 6); ctx.lineTo(cx, cy - ringR + 4);
    ctx.moveTo(cx, cy + ringR - 4); ctx.lineTo(cx, cy + ringR + 6);
    ctx.stroke();
  }

  function frame(now) {
    if (spin) {
      const t = Math.min(1, (now - spin.start) / spin.duration);
      const e = easeOutQuart(t);
      rot = [spin.from[0] + spin.dLon * e, spin.from[1] + spin.dLat * easeInOut(t), 0];
      if (Math.abs(rot[0] - lastTickRot) >= 18) { lastTickRot = rot[0]; onTick?.(); }
      if (t >= 1) {
        const done = spin.done;
        spin = null;
        rot[0] = wrap(rot[0]);
        highlight = done.feature;
        highlightAt = now;
        setZoom(1.6, now);
        done.resolve();
      }
    } else if (idle && !dragging) {
      rot[0] += 0.08;
    }
    if (zoomStart) {
      const t = Math.min(1, (now - zoomStart) / 700);
      zoom = zoomFrom + (zoomTo - zoomFrom) * easeInOut(t);
      if (t >= 1) zoomStart = 0;
    }
    draw(now);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  function setZoom(z, now = performance.now()) {
    zoomFrom = zoom; zoomTo = z; zoomStart = now;
  }

  // Drag to turn, flick to spin.
  let last = null;
  let vel = 0;
  canvas.addEventListener('pointerdown', (e) => {
    if (spin) return;
    dragging = true;
    canvas.setPointerCapture(e.pointerId);
    last = { x: e.clientX, y: e.clientY, t: performance.now() };
    vel = 0;
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging || !last) return;
    const now = performance.now();
    const k = 180 / (size * zoom);
    const dx = e.clientX - last.x;
    const dy = e.clientY - last.y;
    rot = [rot[0] + dx * k, Math.max(-70, Math.min(70, rot[1] - dy * k)), 0];
    const dt = Math.max(1, now - last.t);
    vel = 0.7 * vel + 0.3 * (dx / dt); // px per ms
    last = { x: e.clientX, y: e.clientY, t: now };
  });
  const end = () => {
    if (!dragging) return;
    dragging = false;
    const recent = last && performance.now() - last.t < 80;
    if (recent && Math.abs(vel) > 0.6) onFlick?.(vel);
    last = null;
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);

  return {
    isSpinning: () => !!spin,
    // Spin onto a country by its atlas name. strength 0..1, dir +1/-1.
    spinTo(name, { strength = 0.5, dir = 1 } = {}) {
      const feature = byName.get(name);
      const [lon, lat] = mainCentroid(feature);
      idle = false;
      highlight = null;
      setZoom(1);
      const from = [wrap(rot[0]), rot[1]];
      const targetLon = -lon;
      const turns = 2 + Math.round(strength * 3);
      let diff = wrap(targetLon - from[0]);
      if (dir > 0 && diff < 0) diff += 360;
      if (dir < 0 && diff > 0) diff -= 360;
      const dLon = diff + dir * turns * 360;
      const dLat = Math.max(-70, Math.min(70, -lat)) - from[1];
      lastTickRot = from[0];
      return new Promise((resolve) => {
        spin = {
          start: performance.now(),
          duration: 3200 + turns * 450,
          from, dLon, dLat,
          done: { feature, resolve },
        };
      });
    },
  };
}
