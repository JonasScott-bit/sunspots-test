# next/video/ — cinematic clips for missions
- `swim_lesson_intro.mp4` (+ optional `swim_lesson_intro.jpg` poster): LATE NIGHT SWIM LESSON WITH RAM opening — the crew at Ram's, tea, they decide to swim in the Boss's pool. Coming from the video job.
- Encode for phones like the ÆTV clips: H.264 Main, 720p short side max, 30 fps, AAC, `-movflags +faststart`, keep it under ~25 MB.
- Played by `cinematic.js` → `playCinematic('swim_lesson_intro')`; a missing file just skips. QA: `?cine=swim_lesson_intro`.
