# Wild Goose Chase (Runner) — Project Guide for Claude

## The game
A side-on 2D sports-day sprint based on the Wild Goose Chase card game. A flock of action-hero geese runs from Gooseliath, one furious wild goose. You don't have to outrun the goose, just your mates.

- Players run by tapping LEFT/RIGHT alternately as fast as they can (Track & Field style), with a JUMP button.
- Obstacles on the track. Crashing into one sends your goose ragdolling; it takes time to get back up.
- The game is played in rounds. Each round is 10 seconds of running.
- Gooseliath chases from behind and gets faster every round (Rage).
- Between rounds, the goose in last place draws a Chaos card that changes the next round.
- Gooseliath catches exactly one goose. That goose's goose is cooked and the game ends. Everyone else just survived.

## Design pillars
1. Funny first. Ragdoll crashes, near misses and last-second Chaos cards should make people laugh.
2. Short and mean. A whole game takes a few minutes. Being last is dangerous but gives you a card.
3. Simple to play. Two run buttons and a jump. Everything else comes from cards and obstacles.
4. Small scope. Build the smallest fun version first. Add only what playtesting asks for.

## Platform and workflow
- Built entirely from a phone with Claude Code. Play-tested in a mobile browser, landscape orientation.
- Stack: Phaser 3 with its built-in Matter.js physics (for ragdolls). Plain JavaScript (ES modules). No build step unless needed.
- Deploys to GitHub Pages on every push to main.
- Work directly on main. One step per session. Before finishing, the game must load and be playable, and the change must be committed.
- Greybox until the art pass: geese are simple shapes (body, neck, head, legs joined by physics constraints), obstacles are coloured blocks.

## Architecture rules
- Game rules (rounds, timer, positions, cards, catching) live in plain JS modules separate from Phaser scenes and rendering.
- Player input goes through an input layer that produces actions (tapLeft, tapRight, jump). AI geese produce the same actions. This keeps the door open for pass-and-play and online play later without rewriting the game.
- Seeded RNG for track generation, AI and card draws.
- All tuning numbers in src/config.js (round length, run speed per tap, Gooseliath speed and Rage, obstacle spacing, get-up time, ragdoll forces).
- Debug overlay toggle: FPS, round, timer, each goose's distance, Gooseliath's distance, seed.
- Chaos cards are data: each card is an entry in src/cards.js with a name, power (Mild/Strong/Massive), flavour line and an effect function that hooks into the round.

## Characters
Goose Willis, Arnold Schwarzenegg, The Flock, Liam Geeson, Keanu Geese, Chuck Norhiss, Wing Diesel. Cosmetic only, no powers. Art must be clearly goose, never a likeness of a real person, and no real catchphrases.

## Roadmap (build in order; keep it playable after each step)

Phase 1 — One goose (greybox)
1. Side-scrolling track with a camera following the goose. Tap LEFT/RIGHT alternately to run; tapping the same side twice stumbles or does nothing. Speed builds with good rhythm and decays when you stop.
2. Jump button. One obstacle type (hurdle).
3. Ragdoll: hitting an obstacle turns the goose into a physics ragdoll; after a short delay it gets back up and carries on.
4. Rounds: a 10-second round timer, a short pause between rounds showing distances, then the next round.

Phase 2 — The chase
5. Gooseliath: chases from behind at a set speed, faster each round (Rage). If it reaches the goose, it's caught: game over screen.

Phase 3 — The flock
6. AI geese (3 to start) with different, slightly random tapping rhythms and jump timing. They can crash and ragdoll too.
7. Positions: show who's in last place. Gooseliath catches the first goose it reaches; that ends the game. Geese that reach the finish (The Pond) are safe.

Phase 4 — Chaos cards
8. Between rounds, the last-place goose draws a Chaos card (player picks from 2; AI picks at random) that changes the next round. Start with 5 cards, for example:
   - Loaf About: bread on the track makes Gooseliath stop to eat.
   - Hi, Mum!: Gooseliath runs backwards for the next round.
   - Kick Me: one goose has a sign on it, and every crash knocks it back further.
   - No Through Road: a big barrier appears in front of the leader.
   - Hedge Your Bets: a hedge to hide in; Gooseliath runs past whoever is in it.
9. More obstacles: puddles (slippery), sheep, a picnic blanket, a park bench (duck under or jump).

Phase 5 — Juice
10. Screen shake, dust, honks, slow-motion on big crashes and catches, simple sound effects.
11. More Chaos cards from the card game, adapted to running.

Phase 6 — Art
12. Art pass: the action-hero geese, Gooseliath, the track and the park.

Later (not now)
- Pass-and-play: several players on one phone, each running their 10 seconds in turn.
- Online multiplayer. This needs a server and is a big job, so it waits until the game is proven fun.

## Decisions
(Record decisions from playtesting here.)
- Run buttons sit close together in the bottom-right, staggered like X and O on a PlayStation pad (LEFT lower-left, RIGHT upper-right). Mashing two nearby buttons is funnier and truer to Track & Field than one button per thumb.
- Running should feel fast and punchy, Track & Field style: top speed needs ~10 alternating taps/sec, every tap gives visible kick (lurch, dust, button punch), and speed cues (track dashes, fast foreground, speed lines, segmented power meter with MAX!). Playtested and approved after step 1.
