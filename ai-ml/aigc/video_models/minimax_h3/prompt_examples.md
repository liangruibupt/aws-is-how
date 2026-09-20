# MiniMax-H3 prompt examples

MiniMax-H3 generates **video + synchronized audio** from one prompt, so a good prompt describes four
things: the subject and scene, the motion, the camera, and the **sound**. Prompts that leave sound
out still get a soundtrack, but a less controlled one.

Every prompt below was run on the g7e deployment in this folder (480p, 16:9, 5 s, 20 steps) unless
noted. Seeds are given so results can be reproduced bit-for-bit on a single GPU.

## Anatomy of a prompt

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
