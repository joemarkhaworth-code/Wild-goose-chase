# Ticket to the World — Project Guide for Claude

## The app
Spin a globe; it lands on a country and a cinema ticket prints out of a slot with a film from that country. Drag the stub to tear it off and it flies into your Ticket Book (saved on the device).

## Platform and workflow
- Built from a phone with Claude Code; tested in a mobile browser (portrait and landscape).
- Plain HTML/CSS/JS (ES modules), no build step. Globe is d3-geo on a canvas; libraries and map data are vendored in `vendor/` and `data/`.
- Deploys to GitHub Pages on every push to main (`.github/workflows/pages.yml` writes `version.json` and cache-busts imports).
- Work directly on main. Before finishing, the app must load and work, and the change must be committed.
- After every push, give the user the link https://joemarkhaworth-code.github.io/Wild-goose-chase/ and the version code shown at the bottom (short commit hash). First confirm https://joemarkhaworth-code.github.io/Wild-goose-chase/version.json shows that hash; if the deploy failed, re-run it.

## Code map
- `src/films.js` — countries and films (data). `atlas` must match the name in `data/countries-110m.json`.
- `src/globe.js` — globe drawing, drag/flick, spin-to-country.
- `src/ticket.js` — ticket printing and stub tearing.
- `src/book.js` — ticket book storage (localStorage) and rendering.
- `src/sound.js` — synthesised sound effects.

## Decisions
(Record decisions from playtesting here.)
- The spin always lands on a country with films, preferring films not yet in the book.
