# Apex Lane

Retro arcade racing inspired by classic **Pole Position**, with a neon polish, car garage, liveries, and local high scores.

**Static only** — open `index.html` in a browser. No build step, no CDN, no server required.

## Path

```
/workspace/apex-lane/index.html
```

Open that file directly (or serve the folder with any static file server).

## How to play

1. **Title** → Start Race  
2. **Car Stable** — pick a supercar + livery, Confirm  
3. **3-2-1-GO** — race 3 laps against 5 AI rivals  
4. Stay on the asphalt (grass slows you). Collisions slow / light spin.  
5. **Space** (or **N** on touch) for nitro when the bar has charge  
6. After finish — enter a **driver name** (3–12 chars) to save a local high score, or Skip  
7. **High Scores** from the title or results screen lists drivers on this browser

### Controls

| Action | Desktop | Touch |
|--------|---------|-------|
| Steer | ← → / A D | Left pads |
| Accelerate | ↑ / W | ▲ |
| Brake | ↓ / S | ▼ |
| Nitro | Space | N |

Touch pads sit on the **sides** so the road center stays clear.

## Features

- Pseudo-3D vanishing-point road (curves, rumble strips, lane markers)
- 6 modern supercars (wedge family, slight shape variants)
- 7 liveries: Rosso Corsa, Giallo, Blu Elettrico, Night Neon, Carbon Stealth, Racing Stripe, Sponsor Pack
- AI rivals use other cars/liveries from the same stable
- HUD: speed, lap, position, time, nitro
- High scores in `localStorage` keyed by player name (best race time, best lap, best place, wins, last car/livery). Top 20. Clear with confirm. Multiple names on one device = multiple drivers.

## Files

| File | Role |
|------|------|
| `index.html` | Shell, screens, HUD, touch UI |
| `style.css` | Neon arcade layout (mobile-first) |
| `game.js` | Track, physics, AI, garage, scores |
| `README.md` | This file |

## Deferred

- Hills are mild elevation only (not full OutRun terrain)
- No audio / engine SFX
- No online multiplayer or cloud leaderboard (by design — static multi-user via names)
- No gear shift simulation (speed still matters via accel/brake/nitro/off-road)
- Qualifying lap mode not separate from race
