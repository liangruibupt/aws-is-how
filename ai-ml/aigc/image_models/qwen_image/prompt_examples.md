# Qwen-Image-2.1 prompt examples

Everything below was generated on the g7e deployment in this folder (1K tier unless noted). Seeds
are listed so results reproduce. The model follows plain natural-language prompts well — no special
tags — but three patterns matter:

1. **Text in images**: put the exact string in double quotes. `a sign that reads "OPEN 7AM"`.
   Rendering is reliable for short Latin and CJK strings.
2. **Transparent output**: wrap the prompt in the official phrasing (the console's "Transparent
   background" checkbox does this for you):
   > `This is an RGBA image with transparency. <description>. The image has alpha channel and the background is transparent.`
3. **Editing**: address reference images as `<image1>`, `<image2>`, … (first upload = `<image1>`).
   Say what to change **and** what to keep ("keep the sign text unchanged").

The official prompt-rewriter checkpoints (`Qwen/Qwen-Image-2.1-PE-T2I` / `-PE-I2I`, Qwen3.5-VL 9B)
expand short prompts into detailed ones and pick an aspect ratio; not deployed here, but the style
they produce — long, concrete, camera/lighting/material detail — is what the model was tuned on.

## Text → Image

**Neon sign (text rendering)** — seed 42, 1024², 40 steps, 10.0 s
> A neon shop sign that reads "QWEN IMAGE 2.1", rainy night, reflections on wet pavement

**Hand-painted café sign** — seed 7, 16:9 1K (1376×768), 40 steps, 10.5 s
> A hand-painted wooden sign hanging outside a mountain café that reads "OPEN 7AM", morning light, pine trees behind

**2K landscape** — seed 42, 2048², 40 steps, 51.7 s
> A panoramic mountain landscape at golden hour, ultra detailed

**Portrait lighting (from the release notes' strengths)**
> Close-up portrait of an elderly fisherman, weathered skin, salt-and-pepper beard, Rembrandt lighting from a window on the left, shallow depth of field, 85mm, muted teal background

**Product shot**
> A matte black ceramic pour-over coffee set on a walnut table, single soft key light, subtle steam, minimalist e-commerce catalog style, off-white backdrop

**Chinese typography / poster**
> 一张极简风格的海报，中央用书法字体写着"秋分"，下方小字"2026年9月23日"，米白色宣纸底，一枝红枫，留白充足

## Transparent (RGBA)

**Sticker** — seed 11, 1024², 30 steps, 7.2 s (56% of pixels fully transparent)
> A cute red panda mascot waving, flat vector sticker style

**Cutout / subject extraction** — use edit mode with a photo as `<image1>` and the RGBA phrasing:
> This is an RGBA image with transparency. Extract the person from <image1> exactly as they appear, no background. The image has alpha channel and the background is transparent.

**UI asset**
> This is an RGBA image with transparency. A glossy 3D app icon of a paper airplane, blue gradient, soft shadow baked in. The image has alpha channel and the background is transparent.

## Edit / Reference → Image

**Global restyle, preserve text** — seed 3, 1 ref, 40 steps, 11.4 s
> Make it a snowy winter scene at dusk with warm light glowing from the café windows, keep the sign text unchanged

**Background swap** (README example)
> Change the background to a sunset beach

**Local edit by annotation**: draw a circle or paint over the region in the reference image first, then
> Remove the watch inside the red circle and keep everything else identical

**Multi-reference composition** (up to 10 images)
> These three characters from <image1>, <image2> and <image3> are sitting around a campfire in a forest at night, same art style as <image1>

**Virtual try-on style assembly**
> The person in <image1> wearing the jacket from <image2> and the sneakers from <image3>, full-body studio shot, neutral grey background

**Identity-preserving scene change**
> The same woman as <image1>, now standing on a rainy Tokyo street at night holding a transparent umbrella, neon reflections, keep her face and hairstyle exactly

## Parameter notes

| Knob | Default | Notes |
|---|---|---|
| steps | 40 | 20 is a usable draft at half the time; the release was tuned at 40 |
| true_cfg_scale | 1.0 | Model is CFG-distilled. >1 enables the negative prompt at ~2× cost; rarely needed |
| tier | 1K | 2K is ~5× slower (51 s vs 10 s at 1:1) and needs ~57 GB |
| aspect (edit) | auto | Follows the first reference image's aspect; pick a preset to force a canvas |
| seed | random | Same seed + inputs → identical output on one GPU |
