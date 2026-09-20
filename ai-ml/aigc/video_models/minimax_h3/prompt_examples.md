# MiniMax-H3 prompt examples

MiniMax-H3 generates **video + synchronized audio** from one prompt, so a good prompt describes four
things: the subject and scene, the motion, the camera, and the **sound**.

## Important: what the model actually expects

The official online product runs your free-form prompt through **H3-Context-IR**, a hosted rewriter
that is *not* open-sourced. What the open **H3-Base** we deploy here expects is Context-IR's
*output* format — three named fields ([official guide](official_prompt_guide/VIDEO_PROMPT_WRITING_GUIDE_base_en.md)):

```
integrated_multimodal_description: [Shot 1] <style>, <framing> ... actions, camera, speakers, dialogue along the timeline.
[Shot 2] At 00:04.500, the camera cuts to ...

overall_soundscape: 1–4 sentences: ambience, physical sounds, non-verbal human sounds. (No dialogue here.)

non_diegetic_music: 1–3 sentences on instrumentation/tempo/dynamics, or N/A.
```

Free-form prompts (like the ones in the next sections, or the 【主题/主体/…】 template in
`sample_h3_prompt.md`) still work — the text encoder is Qwen3-VL-32B and understands them — but the
model was trained on the structured form, so **for anything needing precise control (narration,
dialogue timing, cuts, camera moves) write the structured form**. Casual prompts are fine for quick
exploration.

## Narration / voice-over (旁白)

From §4.4 of the official guide, the rules are exact:

1. Give the speaker a stable ID `(S1)` and describe the voice **outside** the `<d>` tag: gender,
   age, timbre, pace, on/off-screen.
2. Use the literal phrase **`says in an off-screen voiceover`**.
3. Put the spoken words inside `<d>[Language] ...</d>` — verbatim, with the language tag
   (`[Chinese]`, `[English]`, …; 11 languages are stable).
4. **Immediately after the `<d>` block, state that the on-screen character's lips remain closed** —
   otherwise the model may lip-sync a visible person to the narration.
5. Anchor timing with `Beginning at 00:01.000 …` / `ends by 00:07.000` so the speech fits the clip.
6. Keep dialogue **out of** `overall_soundscape`; keep any score in `non_diegetic_music` quiet
   ("very quiet beneath the voiceover") so it doesn't compete.

Tested on this deployment (t2va, 480p, 8 s, 20 steps):

**Chinese voice-over** — seed 201
```
integrated_multimodal_description: [Shot 1] Live-action, cinematic, a wide shot frames a narrow canal in a Jiangnan water town at dawn, thin mist hanging over the water, whitewashed walls and dark tiled roofs on both banks, a stone arch bridge reflected in the still surface. An elderly boatman in a dark blue cotton jacket and a bamboo hat stands at the stern of a small wooden boat, slowly pushing a long oar; the bow parts the mist as the camera pushes in with small amplitude at slow speed toward him. Beginning at 00:01.000, a calm middle-aged man with a low, warm, unhurried voice (S1) says in an off-screen voiceover: <d>[Chinese] 天还没亮透，河面上只有一条船。老李已经在这条水路上摇了四十年。</d> while the boatman on screen keeps his lips completely closed and continues rowing. The voiceover ends by 00:07.000 and the boat glides under the bridge as the shot holds.

overall_soundscape: Water laps softly against the wooden hull and the oar dips into the canal with a slow, steady rhythm. Distant birdsong drifts across the water and the town is otherwise silent.

non_diegetic_music: A single guzheng plays sparse, slow notes with long sustain, very quiet beneath the voiceover, fading out over the last second.
```

**English voice-over, no person on screen** — seed 202
```
integrated_multimodal_description: [Shot 1] Live-action, cinematic, an aerial wide shot drifts forward over a misty pine forest at dawn, golden light breaking through the treetops and a river glinting far below; the camera pushes in with small amplitude at slow speed along the valley. Beginning at 00:01.000, a calm adult woman with a soft, clear, measured voice (S1) says in an off-screen voiceover: <d>[English] Every morning the forest wakes slowly, one bird at a time, long before the sun reaches the river.</d> No person is visible on screen. The voiceover ends by 00:07.000 as the camera continues its slow drift and the light widens across the canopy.

overall_soundscape: A soft wind moves through the pines with a gentle, continuous rustle. Distant birdsong is scattered and sparse, and the river murmurs faintly far below.

non_diegetic_music: N/A
```

Related patterns from the guide:
- **On-screen dialogue** (lip-synced): `The young woman with a quiet, breathy voice (S1) says: <d>[English] I get off at the next station.</d>` — no "off-screen", no lips-closed clause.
- **Two speakers together**: `The two children (S1,S2) shout together, <d>[English] Wait for us!</d>`
- **Line crossing a cut**: put `<scenetrans>` at the join in both shots and say the audio "continues seamlessly across the cut".
- **Speech cut off by the end**: `<cutoff>`.
- **Clone a narrator's voice** (Ref2VA only): upload an audio clip and define `<Audio 1> is the voice-timbre reference for <Subject 1> (S1).` — see the [Ref2VA guide](official_prompt_guide/VIDEO_PROMPT_WRITING_GUIDE_ref_en.md) §2.4.
- **Pacing rule of thumb**: ~2.5–3 Chinese characters/s or ~2.5 English words/s of speech; a 5 s clip carries one short sentence, 8 s two, 15 s a short paragraph.

## Anatomy of a casual prompt (quick exploration)

```
[subject + scene]  A red vintage car drives along a coastal road at sunset,
[motion]           waves crashing against the rocks below,
[sound]            engine humming, seagulls calling,
[camera / look]    tracking shot from the roadside, warm golden light.
```

Tips that matter for this model (from the deployment guide's ablations):

- **Pair the prompt with the input image.** For `fl2va`/`ref2va`, describe the frame you uploaded
  and let the motion continue from it. A prompt that contradicts the image (night room → sunny
  window) produces a slow "relighting" morph instead of motion.
- **`ref2va` prompts start with `Use <Picture 1> as the visual subject.`** and should say what to
  preserve (identity, layout, colours, lighting).
- **Say "static camera" when you want it.** Otherwise the model is free to pan or track.
- **Name the ambience explicitly** ("quiet room tone", "soft paw pats", "faint fabric rustle") —
  this is what the audio branch keys on.
- Keep 5 s clips to one or two actions; 10–15 s clips can carry a short sequence.

## Text → Video (`t2va`)

**Coastal drive** — seed 42, 30 s wall
> A red vintage car drives along a coastal road at sunset, waves crashing, engine humming, seagulls calling.

**Meadow puppy** (the UI default)
> A golden retriever puppy runs through a sunlit meadow toward the camera, ears flapping, birds chirping and grass rustling in the breeze. Shallow depth of field, warm afternoon light.

**Night bedroom cats** (the guide's canonical t2va prompt; `assets/first.png` is frame 0 of its output)
> At night, while their owner sleeps in a bedroom, three cats march in loudly playing tiny brass instruments, then abruptly file out.

**Rain on a café window**
> Close-up of raindrops running down a café window at dusk, blurred neon signs and passing umbrellas outside, a warm espresso cup in the foreground. Steady rain patter, muffled street traffic, soft jazz from inside. Static camera, shallow focus.

**Drone over rice terraces**
> Slow aerial drone shot rising over terraced rice paddies at dawn, mist drifting between the ridges, a farmer walking a narrow path. Wind, distant rooster, water trickling. Cinematic, wide angle, soft golden light.

## Image → Video (`fl2va`, first frame from `assets/first.png`)

**Continue the scene** — seed 1234, 32 s wall
> A cat slowly turns its head toward the camera and meows softly, warm indoor light.

**Guide's paired prompt for `first.png`** (describes the exact night-bedroom frame)
> A dim bedroom at night. Three kittens keep tumbling and batting at each other on the patterned rug in front of the radiator, tails flicking, while the person in the bed stays asleep under the blanket. The bedside lamp keeps its steady warm glow, the tall curtains stir faintly, night sky outside the windows. Warm low-key lamp light, static cinematic camera, quiet room tone with soft paw pats and faint fabric rustle.

**First + last frame** (`first.png` → `last.png`): the model interpolates a motion path between the
two keyframes; describe the transition, e.g.
> The kittens scatter across the rug toward the door as the lamp light stays steady; the sleeper does not move. Quiet room, soft scampering paws.

## Reference → Video (`ref2va`)

**Reference image only** — seed 7, 40 s wall (reference short edge 1024)
> Use <Picture 1> as the visual subject. The cat walks toward the window and looks outside at the night sky, soft ambient room tone.

**Guide's paired prompt for `first.png` as reference**
> Use <Picture 1> as the visual subject. The same dim night bedroom: the three kittens go on tussling on the rug by the radiator, the sleeping person does not stir, the bedside lamp holds its warm glow and the curtains move slightly. Preserve the layout, colours and low-key lighting of the reference, realistic coherent motion, static cinematic camera, synchronized quiet ambience.

**Reference video** (`assets/ref5s.mp4`; duration then follows the reference, the duration field is ignored)
> Use the reference clip's subject, framing and soundtrack. Keep the same room and lighting, re-stage the kittens' play with slightly livelier motion.

**Reference audio** (`assets/refaudio.wav`; duration follows the audio)
> A dim night bedroom with three kittens playing on a rug, warm bedside lamp, static camera. Match the motion to the rhythm of the reference sound.

## Parameter notes

| Knob | Default | Effect |
|---|---|---|
| short edge | 480 | 768 is ~3.6× slower (114 s vs 31 s at 20 steps) |
| steps | 20 | 30 improves detail ~1.5× cost; below 12 gets soft |
| duration | 5 | 4–15 s; time grows ~n^1.3 (480p) to n^1.5 (768p) |
| seed | random | same seed + same inputs → identical output on one GPU |
| flow_shift | 12.0 | guide's tuned default; leave unless experimenting |
| audio_flow_shift | 3.0 | same |
