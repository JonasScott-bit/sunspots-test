# QA at Scott's phone settings

Every review shot of Sunspots is taken the way Scott's iPhone renders it, not at desktop quality.

## URL flags
| Flag | What it does |
|---|---|
| `?phone` | Forces the iPhone profile: **MEDIUM** tier, phone rules (top tier MEDIUM, phone culling and LOD distances), device pixel ratio 3, capped to **1.5** by the tier, no auto tier stepping. This is what an iPhone starts at. |
| `?phone=low` | The tier an iPhone steps down to under load: **LOW**, pixel ratio 1, no felt noise or bump (flat colour + soft rim). |
| `?quality=high\|medium\|low` | Forces a tier but keeps the real device pixel ratio. Use it only for A/B work, never for review shots. |
| `?shot` | Still captures now default to MEDIUM (and pixel ratio 1) unless `?quality=` says otherwise. |

Examples:
- `https://jonasscott-bit.github.io/sunspots-test/next/?phone`
- `https://jonasscott-bit.github.io/sunspots-test/next/?phone=low`

## Capture rule
1. Headless Chrome, viewport 390x844 **and** 844x390, `deviceScaleFactor: 3`, touch on, an iOS Safari user agent.
2. Add `?phone` (and a second pass with `?phone=low`).
3. Use the live play camera with the HUD on. Label every sheet with the tier and the pixel ratio.
4. Do not use `?lod=0`, `?quality=high` or desktop captures as evidence that something looks right on the phone.

## Build stamp
The pause menu shows `build <stamp> · <TIER> · <pixel ratio>x`. Ask Scott for that line with every phone report,
so we know which build, tier and resolution he was looking at. The stamp is `BUILD` in `quality.js`.
Bump it with every push that changes the look.
