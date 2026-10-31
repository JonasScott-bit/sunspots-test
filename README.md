# Sunspots — Test Scene 01 (mobile web prototype)

Run locally: `cd public && python3 -m http.server 8810`, then open http://localhost:8810/ (any static host works, no build step).
Query flags: `?intro=0` skip EES intro · `?menu=0` skip title menu · `?wild=1` start in Wild Mode · `?shot=1` screenshot mode · `?mute` / `?afmt=m4a` audio. Keys: WASD/arrows move (Shift=run), M toggles Wild, H horn (in the car).

## Controls
- Floating joystick: touch & drag anywhere on the lower screen. Push past ~75% to run (walk→run cross-fade by speed).
- Drag in the sky area (top 38% portrait / right 40% landscape) to orbit; the camera eases back behind the Wolf 2.5 s after you let go.
- WILD pill (top right) = placeholder trigger for the Wild Mode mechanic.

## Unity carry-over notes
**Assets** (`public/models/`): optimised GLBs (webp textures 512px props / 1024px Wolf). Originals stay in `/workspace/sunspots/meshy`. Wolf walk clip: `Armature|walking_man|baselayer` (wolf.glb); run clip: `Armature|running|baselayer` (wolf_run_anim.glb, armature only, same bone names). Import originals into Unity rather than the webp copies (Unity's glTF importers vary on EXT_texture_webp).

**Eye sun — layer stack (back→front), never rotates or translates; billboarded at a fixed world direction (0, 0.25, -1) ×900 from camera:**
1. halo (additive) 2. felt disc 3. drips (wild only) 4. dark spots (wild only) 5. soft under-eye shadow 6. eye-white almond = stencil WRITE (ref 1) 7. iris + pupil + glint = stencil EQUAL 8. upper lid (disc colour ×0.9) — parabolic edge rebuilt per frame 9. lash strip + 9 lashes (when lid >85% closed) 10. lower lash line, brow 11. four soft dark cloud cards in front.
- Almond: half-width 0.40, top 0.17, bottom 0.12 (disc radius = 1), centre y 0.08. Both lid edge and almond are y = s·(1-(x/w)²).
- Pupil: screen-space direction sun→Wolf, clamped ±0.25 x / ±0.075 y, smoothed.
- Blink: random every 2.5–8 s (20% chance of a quick double-blink); down 0.38 s, hold 0.14 s, up 0.55 s (ease). Heavy and slow.
- Wild: lid closes over 0.9 s and stays shut until Wild is fully off, then re-opens over 0.9 s.

**Wild Mode (~2 s, smoothstep, per-prop random delay 0–0.35):**
| | Sunshine | Wild |
|---|---|---|
| sky | #1d4fb6 | #3b1c8e |
| ground | #dc5a2f | #c11f4c |
| fog | #d65f36 | #b8245a |
| sun | #e3a126 | #ff6d2e + dark spots, drips, haze |
| clouds | #3f3d48 | #5b2463 |
- Pink neon (#ff3fb4) ring on the diner sign + strip over the door, additive glows, pink point light, slight flicker.
- Melt (vertex shader, in each prop's root space): height × (1-0.30m), top droops extra 0.10–0.20, angular drip lobes (5×/3× sine product), base spreads up to +45%, slight lean + wax wobble; puddle decal grows under each prop. Shadow depth material uses the same shader.
- Wild tint pushes every prop toward a pink/salmon/plum tint (no green/teal anywhere).

**Look:** MeshStandard roughness 1 + procedural felt map/bump, hemisphere 1.55 + warm key 2.3 with PCF soft shadows (1024 map following the Wolf), distance fog 45→330, CSS film grain + vignette overlay (no post-processing pass, to stay cheap).

**Layout (metres, Wolf start 0,0,6 facing -Z):** fountain (0,-3) · diner (2,-12) · bus shelter (-8,-4.5) · lamp (9,-1) · adobes (-14,-11) (-5.5,-19) (13,-14) (19,-3) (-19,1) · 90 instanced cacti to r≈346 · props: bench (-4.6,-4.2) cactus (-11.5,-8) (4.6,-2.5) hydrant (3.2,3.2) car (13,2.5) payphone (6.6,-3.5) lantern (8.3,0.4) diner-creature (-3.5,-9.5) rain cloud (-10.6,-2.6).

## Overnight polish (Oct 31 2026)
- **Title screen** (`public/title.js`, assets in `public/title/`): 2D layered three.js scene in plate-pixel space (ortho camera, cover-fit for portrait 720×1280 and landscape 1280×720 plates). Layers, back to front: back plate → felt sun → front hills mask → felt puddle → building melt → near flowers; the approved wordmark is a DOM image on top. It's a seamless 4 s loop: the sun sinks straight down while the blue building and its lettering melt into a flat felt puddle with a hazy blurred sun reflection, then everything reverses (smootherstep). Clouds, flowers and camera stay still. It also serves as the loading screen: a progress bar, then a pulsing TAP TO START. The game doesn't render until the player taps, and shaders are pre-compiled. Flags: `?shot&title` shows the title in shot mode; `&tphase=0..1` freezes the loop.
- **FUZZY MELT:** every melt is felt, never goo. Title: noise-dithered fuzzy alpha edges, fibre grain, matte puddle with a sheen band. Game: Wild drips and puddles use MeshPhysical with roughness 1, the felt map and bump, and a pink sheen (no specular gloss).
- **Town models** come from `tools/build_town.mjs`, which builds them procedurally (flocked, flat, bold shapes, with `sunspots` extras on the nodes). Runtime `feltify` + `makeMeltable` add the melt shader in root space.
- **Phone performance:** GLBs are meshopt + quantized via gltf-transform, with textures capped at 1024 (14 MB → 3.1 MB). The decoder is vendored. Adaptive DPR (1 to 2) is driven by an EMA of frame time. A progress bar shows during load. Uncompressed originals are in `models_src/`. Unity: import the `models_src` originals, or the meshopt GLBs through glTFast (which supports EXT_meshopt_compression).
- **Wolf:** the arm/spine tearing is fixed by playing only the leg chain + hip bob from the Meshy clips. The upper body is procedural (lean, stride sway, turn lean). Idle has breathing, a slow weight shift and a deadpan head glance (Head bone only, ~9 s cycle) that fades out when he moves.
- **Removed from the scene** (files kept in `models_src/`): mainst_diner_building, mainst_payphone_blockhead, busstop_cactus.

## Level 1 "Last Minute Snacks" + first person (Oct 31 2026, midday)
- **Level 1:** walk the town to the ride pickup (east end of the street), get into the boot car, then drive to the convenience store before it closes at **2:00 PM** (countdown, win/lose screens). Layout map: `layout_map.png` (`tools/annotate_map.py`).
- **Boot car:** `mainst_car.glb` with a procedural boot-walk (vertex-shader `chainBoot` fake + body bounce/roll/pitch). The Meshy moth folder (`meshy/rideshare_moth_driver/`) was empty, so the moth driver is a procedural felt stand-in.
- **Radio:** procedural WebAudio (no audio files); "nope." button = volume.
- **Title:** Scott's loop video (`public/title/title_loop.mp4/.webm` + poster) behind the wordmark, muted/autoplay/loop/playsinline, object-fit cover. The old 2D layered title stays as a fallback if video can't play.
- **First-person drive (moth driver, default in the car)** — `public/cockpit.js`: gloved felt mitts at ten-and-two on a cream 70s wheel that turns with steering, tan felt arms re-aimed each frame, mustard dash with gauges and a pulsing radio, pine air freshener swinging on the mirror (driven by turning, braking, waddle), gentle waddle bob. The felt windshield face of the car is cut away with two intersecting clip planes only in FP, so the road is visible.
  - Drag the upper screen to turn his head (±120° yaw, slight pitch); snaps back on release. Desktop: Q/E look, C = third-person chase cam (debug, off by default).
  - Live rear-view mirror (render target, every other frame) shows the back seat.
  - Cast: the Wolf (front passenger) + two procedural felt blockouts in the back (banana squid, farmhand with straw hat). Behind his back they pull faces, laugh silently, whisper, and do finger-antennae; when his gaze reaches them they snap to innocent deadpan ~0.2–0.45 s late, so the mirror or a quick look catches them mid-act.
- **Wolf first person on foot:** hold the eye button (top-right edge portrait / bottom-right landscape) ~0.5 s; the ring fills, phone ticks (`navigator.vibrate`), view blends to the Wolf's eyes. A quick tap only wiggles. Desktop: V. Mustard sleeves + grey paws swing while walking; crossed arms when idle (look down). Wild FP adds a pink vignette + SVG heat-haze edges and a bit more bob. The Wolf's body is hidden from the camera (colorWrite off) but still casts his shadow.
- QA flags: `?drive`, `?at=<m>` (teleport along the route), `?gas`, `?look=<deg>&lookp=<deg>`, `?prank=face|laugh|whisper|antennae`, `?chase`, `?fp`, `?fpp=<deg>`, `?walk=<0..1>`.
- Screenshots: `fp_ahead.png`, `fp_back_cast.png`, `fp_mirror_catch.png`, `fp_wolf_sunshine.png`, `fp_wolf_wild.png`, `fp_wolf_wild_portrait.png`, `fp_wolf_crossed_arms.png`.

## v5: the real moth driver (Oct 31 2026, afternoon)
- **Model:** `public/models/moth_driver.glb` is built from Scott's rigged Meshy moth (`meshy/rideshare_moth_driver/`, about 103k tris with 4K textures) by `tools/build_moth.mjs`. It merges the walk, idle and seated clips, then applies resize to 1024, webp, prune, and meshopt with quantize. That takes it from about 31.5 MB to 2.29 MB. No Meshy credits spent.
- **Runtime:** `public/moth.js` (`createMoth`).
  - Seated in the driver's seat, scaled so his skull sits just under the roof. His tall antennae fold back while he's seated (baked morph target) and spring up when he climbs out.
  - Two-bone IK puts his own long brown gloves on the wheel grips.
  - In first person his head and neck collapse (you look out of them). Looking down, he sits up and puffs his chest, so the pine air-freshener necklace swings into view (pitch goes down to about -69°).
- **Pickup greeting:** when the Wolf walks within about 9.5 m of the car, the moth slides out of the driver's door, walks toward the Wolf, stops about 1.8 m away, idles and gives one slow nod. He's back in the seat when you drive. QA: `?greet`.
- **Cockpit:**
  - The placeholder mitts, arms and head are hidden once the moth loads; they stay as a fallback if the GLB fails.
  - Gauges sit in a raised binnacle, so they're visible over the rim and hands, in portrait too.
  - Portrait mirror is about half the size, centred near the top.
- **Wolf FP crossed arms** are smaller and lower in portrait.
- **Wild:** a new "rider melt" (`patchRider` in main.js) works on animated and skinned meshes after skinning, in car space. It applies sag, drip lobes, wobble and a coral tint to the moth, the Wolf passenger and the back-seat cast. The car keeps its own melt.
- **Fork signs** were checked and are *not* swapped: STORE / LONG WAY points right (the main road east), SHORTCUT points left. The arrow glyphs didn't exist in some fonts, so the arrows are now real meshes.
- **New screenshots:**
  - `fp_necklace.png`, `fp_ahead_portrait.png`, `fp_back_cast_wild.png`
  - `chase_wild_melt.png`, `moth_greet.png`, `fork_signs.png`
  - Re-taken: `gameplay_drive.png` and all `fp_*`.
- **Known gaps:**
  - His middle crumples a little in the seated clip (mostly hidden by the door).
  - Seat to standing is a short slide rather than a full climb-out animation.
  - Standing, he's taller than the Wolf.

## v6: in-car view toggle + arm fix (Oct 31 2026, afternoon)
- **Eye button while driving**: same press-and-hold (0.5 s ring, haptic tick, tap only wiggles) switches the moth's first person <-> the chase view behind the boot car. Steering, gas/brake, radio and TILT are unchanged; the look-drag turns his head in first person and orbits the chase cam in the chase view (snaps back on release). Chase view hides the binnacle + mirror and restores the windshield. First person by default; the last choice is remembered for the session (sessionStorage `sunspots.chase`). Desktop: C still toggles (and is remembered).
- **Arm flicker fixed** (moth.js `handsOnWheel`): each grip picked its arm by the grip's live x, so past ~60 deg of wheel both grips landed on the same arm and the other arm snapped back to its idle pose (the "cutting in and out"). Arms are now fixed per grip, the IK refreshes the car's world matrix first (it was mixing last frame's body matrix with this frame's), and the wheel turns +/-60 deg so the hands never cross through the camera. Probe (`tools/armseq.mjs`): worst forearm jump per frame 0.49 m -> 0.09 m, worst hand-to-grip miss 0.88 m -> 0.12 m. Frames: `arms_fix_*.png`, `arms_fix_sheet.png`.
- Wolf first-person arms checked: plain meshes riding the camera, no skinning or culling issue, no change needed.

## v7: motion scenes (Oct 31 2026, evening)
GTA-style in-world scenes. Drive into a zone, the bars come in, the scene plays out with the cast, then control comes back (or the ending card goes up). Everything is in **`public/scenes.js`** (data-driven; the header comment documents every field and beat).

**System**
- **Trigger zones**: circle `{at, r}` in the scene's anchor frame, `when: 'car' | 'foot' | 'any'`, plus an optional `if(S)` condition (e.g. the clock). Each scene plays **once** per run (cleared on retry).
- **Beat timeline**: beats run in order. `wait: true` holds the timeline; `par: [...]` runs a group together.
- **Blocking scenes**: input frozen (touch, keys, joystick, eye button, C/V), scene camera, letterbox bars (taller in portrait), subtitles above the bottom bar (never over the controls). **Hold SKIP (top right, 0.6 s ring fill)** or hold Esc/Enter: running beats snap to their end state and the rest runs instantly. End: `'blend'` (0.9 s ease back into your camera, then input returns) or `'hold'` (ending scenes keep the last shot under the WIN/LOSE card).
- **Non-blocking scenes**: you keep driving and keep your camera; lines appear as speech bubbles pinned over the speakers (clamped to a safe band away from the HUD).
- The clock stops while a blocking scene plays.

**Beats: blocking vs non-blocking**
| beat | what | blocking | non-blocking |
|---|---|---|---|
| `cam` | cut / eased dolly, fov, actor-relative framing | yes | ignored (player keeps the camera) |
| `say` | dialogue line | bottom subtitle | speech bubble over the speaker |
| `move` | walk / drive a path (gait from speed) | yes | yes |
| `exitCar` | rider climbs out to the car door | yes | yes (car should be parked) |
| `place` / `hide` | teleport / hide an actor | yes | yes |
| `anim` | clip (moth idle/walk/seated, nod) | yes | yes |
| `look` | turn body / head toward a target, optional tracking | yes | yes |
| `mill` | wander around a spot until the scene ends | yes | yes |
| `wait` | pause the timeline | yes | yes |
| `prop` | store door, OPEN/CLOSED sign, bolt, snacks, art wheel | yes | yes |
| `audio` | fires a named cue (+ radio duck) | yes | yes |
| `call` | game hook (`win`, `lose`, function) | yes | yes |

**Scenes**
- `store_win` (~22 s, blocking): reach the store lot before 2:00. The boot car waddles to a stop, the moth says "Destination.", everyone gets out, the squid and farmhand mill about, the Wolf goes in, "He's been in there a while." / "Eleven seconds.", he comes out with the snacks: "They had one kind." Moth: "Five stars is customary." Then SNACKS ACQUIRED.
- `store_lose` (~16 s, blocking): reach the lot after 2:00 (you now get a 90 s grace in the car to arrive late). Clock insert, Wolf walks up, heron clerk: "Closed.", door shut, sign flipped to CLOSED, bolt clunks, close-up on the Wolf, "Two o'clock is two o'clock.", moth: "The meter is still running." Then LOSE + retry.
- `roadside` (non-blocking): out on the main road, a Duchamp bicycle wheel on a felt stool ("UNTITLED (WHEEL)") with a crow and a ram. "Is it art?" / "It's on a stool." / "That car has boots." / "So does everyone." They turn to watch you go by.

**Debug params**: `?scene=store_win`, `?scene=store_lose` (sets the clock, puts you in the car near the store and drives in), `?scene=roadside` (autopilots past the art), `?scene=handoff_test` (tests the blend back), `?scenes=0` (turn scenes off, old arrival logic). Probe: `node tools/sceneprobe.mjs <baseUrl> <scene> <outPrefix> [w h] [times]`.

**Audio cues** (fired as `window` event `sunspots:audio` `{cue}`; list + descriptions in `CUES` in scenes.js): mus_store_arrive, sfx_boots_stop, sfx_car_door_open, sfx_car_door_close, amb_radio_outside, sfx_store_door_bell, sfx_store_door_shut, sfx_sign_flip, sfx_lock_clunk, sfx_clock_tock, sfx_chip_bag, mus_win_tag, mus_lose_tag, sfx_wheel_spin, amb_gallery_hush, optional VO per line.

**v7 rough edges**: store_win runs about 22 s, a little over the 20 s target. The arrival close-up on the moth is tight and clips the car body. The roadside art is small and barely readable from first person (it reads in the chase view). The Wolf's exit from the car is a short slide, not a climb. Audio arrived in v8. Hold-to-skip is tested with keys and in headless, not on a real phone. There may be a one-frame head flash when the scene blends back to first person. Before a drive-in scene there's a 90 s late grace so the lose scene can be reached in the car.

## v8: audio (Oct 31 2026, late afternoon)
Scott's audio is wired in. Everything lives in **`public/audio.js`** (one Web Audio graph, exposed as `window.__audio` for debugging). The sounds are in `public/audio/` as `.ogg` and `.m4a` (60 sounds × 2 formats, 44.1 kHz), and `public/audio/manifest.js` holds the durations, loop points, BPM and per-format trim. `tools/audio_prep.py` copies the needed files from `/workspace/sunspots/audio/web` and rebuilds the manifest.

**Engine**
- **Format and unlock**: `.ogg` by default. On iOS, or if the browser can't decode Vorbis, it uses `.m4a`, and a failed ogg decode also falls back to m4a. `?afmt=m4a|ogg` forces a format. The first tap or key resumes the AudioContext, plays a silent buffer and sets `navigator.audioSession.type = 'playback'` (so the iOS ringer switch doesn't mute it). Audio suspends when the tab is hidden.
- **Mute**: the speaker button at the top left (next to the wordmark) mutes everything. The setting and the RADIO VOL level are saved in `localStorage['sunspots.audio']`. `?mute` starts muted.
- **Lazy loading**: the title needs only Mind Meld (**896 KB ogg / 983 KB m4a**) and never waits on anything else. Leaving the title loads the town set, then core (UI/wolf/car SFX). Getting in the car loads the car set (stings, store cue, voices) and the radio tracks, one ahead. Tension loads when 140 s are left.
- **Graph**: master → compressor (soft limiter) → out. Buses: music 0.5, radio 0.85, sfx 0.8, ambience 0.13, voices 0.85, UI 0.35. The manifest's per-format trim is undone at playback, so ogg and m4a play at the same level.
- **Loops**: AudioBufferSourceNode with `loopStart`/`loopEnd` set from the manifest (sample-accurate, not `duration`).

**How each sound is used**
| sound | where / how |
|---|---|
| `music_title_loop_pro_mind_meld` | Title screen. Loops at loopEnd 47.63 s and fades in over 1.2 s after the first tap. When you leave the title it fades out over 3.2 s while the town fades in, then the buffer is freed. |
| `music_town_sunshine_loop` / `music_town_wild_loop` | Both start at the same `t0` and loop at 38.4 s (100 BPM, 16 bars), so they always share a playhead. The Wild toggle does an equal-power (cos/sin) crossfade that follows the 2 s Wild melt. The town ducks under the radio in the car (0.18 in first person, 0.3 in the chase view), to 0.4 in blocking scenes, and to 0 under the store cue and stings. |
| `sting_wild_switch` | On each Wild toggle (both directions), scheduled on the next half-beat of the town grid. |
| `tension_stage1`–`3` | Start at the town's current playhead offset (beat-locked). Each stage fades in from the next bar line over 2 bars at 110 / 60 / 25 s left. Stage 1's loop-seam dip is smoothed (see rough edges); `?tfix=0` turns that off. |
| `sting_win` / `sting_lose` | When the WIN/LOSE card goes up (`finish`, or the scene's `mus_win_tag`/`mus_lose_tag`). They play once. Music drops to 0, then the town comes back at 0.3 after 5 s. |
| `cue_store_arrival` | The scene cue `mus_store_arrive` at the start of `store_win`. Town and tension drop out while it plays. |
| `radio_brass` / `radio_bells` / `radio_tango` | The moth's car radio. One-shots in sequence with hard cuts (the next is scheduled sample-accurately at the end of the current one), starting on a random track part-way in. Chain: highpass 340 Hz → bandpass 1.3 kHz → light tanh saturation → lowpass (4.2 kHz in first person; 950 Hz in the chase view = heard from outside the car). RADIO VOL cycles 100% → 86% → 74% → 100%, never off ("That is the lowest it goes."). |
| `sfx_car_idle_loop` / `sfx_car_rev_loop` | Run all game long, gated by distance to the car (loud inside, fainter near it, silent far away). Idle gain falls and rev gain rises with speed; playback rate goes 0.92→1.42 (idle) and 0.72→1.32 (rev). |
| `sfx_car_boot_thud_l` / `_r` | One per footfall of the boot-waddle (same phase as the vertex-shader legs), alternating L/R and panned. Plus a 5-thud slowdown for the scene cue `sfx_boots_stop`. |
| `sfx_car_bump_01`–`03` | Collisions ("bonk"), cattle guards (a 4-hit rattle), tumbleweeds, landing from a hop, and the end of `sfx_boots_stop`. |
| `sfx_car_horn` | New HORN button in the drive controls (and the H key). 0.4 s cooldown; sometimes the moth answers. |
| `sfx_car_door_open` / `_shut` | Getting in the car (open, shut 0.65 s later, plus a wolf grunt). The scene cues `sfx_car_door_open`/`_close`. Also a pitched-down stand-in for `sfx_store_door_shut`. |
| `sfx_wolf_step_01`–`05` | Wolf footsteps on foot (player walk and scene puppeting). Each foot's heel-strike phase is measured once from the walk clip's foot bones, then a step fires whenever the shared gait phase crosses it, so it doesn't depend on frame rate. Gain rises with speed. |
| `sfx_wolf_huff` | When he's been idle 7 s (then every 12–20 s), when "late", and sometimes as the Wolf's cast reaction in the car. |
| `sfx_wolf_howl` | 0.9 s after switching Wild ON (10 s cooldown). |
| `vox_wolf_grunt_01`–`03` | Getting in the car, and the Wolf's scene lines. |
| `sfx_town_ambience_loop` | Low bed (bus 0.13), starts at a random offset. Quieter in the car and away from the town centre. |
| `sfx_ui_tick` / `sfx_ui_confirm` | Tick on button presses (softer on drive controls). Confirm on toggles: eye / first person (including when the hold ring completes), tilt, mute, SKIP hold. |
| `vox_moth_01`–`15` | Moth barks: on each moth scene line (not tied to the subtitle text), when you get in, every 25–45 s while driving, sometimes after a bonk or a horn. Never repeats one of the last 5. |
| `vox_cast_snicker/whisper/mumble_*` | In the car: when a back-seat cast member starts acting up behind the moth's back, they snicker or whisper (lowpassed at 2.2 kHz in the chase view). When he looks back, any cast voice cuts dead, sometimes with a stifled half-snicker. Mumbles: non-moth scene lines (clerk, squid, farmhand, crow, ram), stopped at the line's end. |

**Scene cues** (`sunspots:audio` / `CUES` in scenes.js): `mus_store_arrive` → cue_store_arrival; `sfx_boots_stop` → thud slowdown; `sfx_car_door_open`/`_close` → doors; `sfx_store_door_shut` → door-shut stand-in; `mus_win_tag`/`mus_lose_tag` → stings; `amb_radio_outside` → handled by the radio duck/muffle. Silent no-ops (no matching file): `sfx_store_door_bell`, `sfx_sign_flip`, `sfx_lock_clunk`, `sfx_clock_tock`, `sfx_chip_bag`, `sfx_wheel_spin`, `amb_gallery_hush`.

**Download size**: title 0.9 MB (ogg) / 1.0 MB (m4a). The full set is 6.6 MB ogg / 11.2 MB m4a. A typical session (title → town → car → tension → card) fetches 59 files: about **5.7 MB ogg** (desktop/Android) or **9.8 MB m4a** (iOS). The repo carries both formats (17.8 MB).

**Debug**: `__audio.graph()` (state, gains, filters, playing sources), `__audio.rms()` (master dBFS), `__audio.log`. Probes in `tools/`: `audio_offline.mjs` (decode/loop seams/radio spectrum in OfflineAudioContext), `audio_radiochain.mjs`, `audio_bars.mjs`, `audio_live.mjs <base> [&afmt=m4a]` (drives the game headless and logs the graph), `sceneprobe.mjs` (now also prints the audio log).

**v8 rough edges**
- Nothing here was listened to. Levels are set from measurements (RMS, gains), so the mix balance needs a pass by ear on a phone.
- The tension stage 1 "dip" is a phrase-end breath: the same -4 dB drop over the last 800 ms appears at the end of bars 4, 8 and 12, not just at the loop seam. As asked, the seam is smoothed (the last 0.8 s replaced by the same 0.8 s from one bar earlier, 80 ms equal-power join), but the other three breaths remain. Stages 2 and 3 have similar breaths every 2 bars. `?tfix=0` gives the raw loop.
- The m4a idle and ambience loops have a slightly bigger sample step at the loop seam than the ogg versions (0.05 vs 0.018 and 0.045 vs 0.021), so a faint tick is possible on iOS.
- In the car with the radio up, master RMS is around -11 to -13 dBFS. The compressor catches peaks, but the radio may still feel loud next to the title.
- Wolf steps use the walk clip's heel-strike phases for the run blend too. Run plants may land a little off.
- No store door bell, sign flip, lock clunk, clock tock, chip bag or wheel spin in the set (those cues stay silent). The store door shut is a pitched car door.
- The horn is a plain button (HORN, above the steering pad) and the H key, without any special art.
- Not tested on a real iPhone: the iOS ringer-switch handling (`audioSession`) and the unlock path are written to spec but unverified.

**Verified (headless Chrome + OfflineAudioContext, Oct 31 2026)**: every loop decodes to exactly loopEnd × 44100 samples in both formats (Mind Meld m4a is one sample short, harmless), and seams are at or below the typical sample step. All 51 one-shots decode in both formats with matching durations. Radio chain: small-signal response 80 Hz -40 dB, 300 Hz -4 dB, 1.3 kHz +8 dB, 8 kHz -7 dB; 3rd harmonic -47 dB at amplitude 0.1, -21 dB at 0.5. Live run (ogg and m4a): town loops start at the same t0 at offset 0; sun² + wild² = 1; wild sting on the half-beat; tension sources share the town t0 (drift 0) and their ramps start exactly on a bar line; the RADIO VOL gains never reach 0 and are remembered; chase-view radio muffle is 950 Hz; engine rates and gains track speed; boot thuds match the waddle footfalls; wolf steps 8 in 3.8 gait cycles; the win sting and the town return after 5 s; mute gives -120 dBFS. Scene probes for `store_win`/`store_lose`: arrival cue, boots-stop thuds, doors, moth/cast barks and the lose sting all fire, and the unmatched cues log `cue_silent`. **Not verified**: how it actually sounds, iOS Safari / real phones, the Bluetooth/latency feel, and long sessions (memory over many radio tracks is only checked by the drop-old logic).

## v9: EES intro + trippy title menu (Oct 31 2026, evening)
**Boot order:** EES company intro (`intro/ees_intro.mp4` H.264 faststart, `ees_intro.webm` VP9 fallback, `ees_poster.jpg`) full-screen on black, object-fit contain, muted/inline autoplay. Tap skips; if autoplay is refused the poster shows with TAP TO PLAY. A watchdog ends the intro if the video stalls. Then the title menu, then PLAY melts into the game.
**Intro sting:** Scott's "Ethereal Arrival" (Drive: Sunspots Pro Audio) trimmed to 8.6 s with a 7.3–8.55 s fade to silence, matched to -14 LUFS like the rest of the music (`audio/intro_ethereal_arrival.m4a/.ogg`, manifest slot `intro_sting`). It plays on the music bus, started at the video's currentTime (+ output latency) so it stays in sync. Browsers won't start audio before a gesture, so on a cold load the hint says TAP FOR SOUND · TAP AGAIN TO SKIP: the first tap unlocks audio and joins the sting mid-way, the second tap skips (the sting fades out over 0.45 s). With music off (sound mode Off or SFX) the first tap just skips.
**Title menu** (`title.js`, `#titleScr`): one fullscreen WebGL quad over `title/menu_portrait.jpg` / `menu_landscape.jpg` (swapped live on rotate), plus flow maps. The shader does a slow liquid warp, hue drift, chromatic split at the edges, parallax layers, drifting cloud shadows, a beat pulse locked to Mind Meld (`__audio.titleT0`, 8 s bars), and the sun eye's pupil drifting and blinking (approximated in-shader). Felt buttons (SVG noise texture + dashed stitch): PLAY (mustard), SETTINGS (coral), CREDITS (cobalt); bottom stack in portrait, left column in landscape. PLAY fills, then a fuzzy drip melt (~1.6 s) dissolves the title into the running game.
**SETTINGS:** sound mode (OFF / SFX / MUSIC / ALL), music and SFX volume sliders, a camera-controls note, BACK. **CREDITS:** scroll with SUNSPOTS · Ethereal Entertainment Systems · Created by Jonas Scott · Music made with Suno. Mind Meld loops on the menu once audio is unlocked.
**Sound modes** (`audio.js`): Off = silence · Sound (SFX only) · Music only · All (default). The HUD speaker button cycles them, showing a toast and an icon state; the SETTINGS segmented control does the same. Saved in localStorage `sunspots.audio` (mode, musicVol, sfxVol, radioLvl). An old saved `muted:true` maps to Off, and `?mute` forces Off. Implementation: gate gains `N.gMusic` (music + radio) and `N.gSfx` (sfx, ambience, existing barks/grunts, UI) ramp over 0.12 s. `A.setMode / A.cycleMode / A.onMode / A.modeText`; `A.setMuted` kept for compatibility.
**Voice bus + ducking:** `BUS.voice` (0.95) goes straight to master, outside the mode gates and sliders, so dialogue plays in Sound, Music and All and is silent only in Off. `__audio.playVoice('vo_x', {gain, pan, when})` returns a Promise of the handle, or null when Off or the file is missing; it lazy-loads `audio/vo_x.*`. While any voice plays, music ducks -9 dB (linear ramp 150 ms down, 400 ms restore after the last line ends). `A.duckLevel()` is a probe. Headless check: the level drops to 0.355 within 0.2 s and is back to 1.0 by about 0.4 s after the line ends.
**Perf:** DPR capped at 2, and the menu shader steps DPR down (to a floor of 1) when frames run long and back up when there is headroom. The menu render loop pauses when hidden, and main.js skips 3D rendering while the title is up.
**Debug flags:** `?intro=0` skips the intro · `?menu=0` skips the menu (straight into the game, the old behaviour) · `?introt=4` freezes the intro at 4 s (screenshots). Existing flags (`?shot`, `?scene=`, `?wild`, `?mute`, `?afmt`) still work. QA: `tools/title_qa.mjs <url> <outdir> <w> <h> <tag>`.
**Not used any more:** `title2d.js`, `title/title_loop.mp4/.webm`, `title_poster.jpg` (left in place, safe to delete).

## Hosting / deploy
Live: https://jonasscott-bit.github.io/sunspots-test/ (repo JonasScott-bit/sunspots-test). From the prototype folder, `bash tools/deploy.sh "message"` copies `public/` (minus `lab/`) into the pages repo, pushes, and waits for the Pages build. Then `node tools/livecheck.mjs <url> out.png` checks for console errors.

## Known gaps
Wild clouds tint but don't drip. Sunshine buildings lean terracotta rather than the reference's peach. Several Meshy props are still face-characters. The neon glow is additive sprites, not real bloom. Real shadows only reach about 25 m from the Wolf. On the title screen the sun's lowest rays are flat-cut; they stay hidden behind the building or puddle. The title plates are generated images, not hand-made felt. The car cast (Wolf + blockouts) is skinned/procedural and doesn't melt in Wild. Tilt steering is untested on a real device. The boot-walk is a vertex-shader fake. In portrait the rear-view mirror sits near the right edge and is small.
