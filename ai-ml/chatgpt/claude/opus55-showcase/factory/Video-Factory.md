 One template, many videos

  A. 主图视频工厂 (product video factory) ⭐ my pick
  - The video: A 15-second product film for a made-up product, such as a glass perfume bottle with a gold cap. It opens with a light sweep across the bottle, then an exploded view with feature labels,
    macro close-ups of the glass and liquid, and a turntable showing the colour options.
  - The hook: The same timeline renders 9:16 (Douyin/Taobao), 1:1 (the main product image) and 16:9 (Amazon), for any colour option or language, just by changing URL parameters. One command produces a
    whole batch of videos.
  - Why it matters: E-commerce teams need thousands of these videos, and they are expensive to shoot. It also differs from 02: glass, liquid and caustics instead of painted metal.

  B. 年度购物报告 (personalized year in review)
  - The video: A vertical "Wrapped"-style story generated from an order-history JSON. Animated text, charts that morph into each other, and items flying into a cart. A different JSON gives a different
    video.
  - Why it matters: It's the strongest example of generating video from code at scale, and it could come with an AWS rendering pipeline (headless Chromium on Batch/ECS → S3). Visually it's the least
    spectacular idea.

  Physics simulation

  C. 奶茶广告 (bubble tea commercial)
  - The video: Tapioca pearls drop into a cup, milk swirls into the tea, ice cubes clink, condensation forms on the plastic, and a straw punches through the sealed lid.
  - Why it matters: GPU fluid and particle simulation with refraction. It has the biggest wow factor and the highest technical risk.

  D. 丝巾 (silk scarf)
  - The video: A silk scarf with a pattern generated in code (Dunhuang ceiling or Song brocade motifs) catches the wind, drapes over a mannequin bust, then folds itself into a gift box.
  - Why it matters: Cloth simulation, pattern design and silk sheen together. Medium to high risk.

  E. 开箱 ASMR (unboxing)
  - The video: A knife cuts the tape, the box flaps swing open, tissue paper crinkles, and the product rises into a beam of light. Tape tearing and paper crinkling sounds are synthesized.
  - Why it matters: It's short and satisfying. It could also work as the opening of A.

  Stories and data

  F. 一个包裹的旅程 (a parcel's journey)
  - The video: One continuous shot. A tap on 下单, then warehouse robots carry shelves to a picker, a box folds itself, a sorter belt routes it, a truck leaves at dawn, a courier makes the last-mile
    delivery, and it ends on a doorstep. Isometric, low-poly 3D.
  - Why it matters: Robot crowd path-planning plus 02-style choreography at a much larger scale. It's the most cinematic and fits Amazon well, but it's the biggest job.

  G. 双11 零点大屏 (Singles' Day midnight war room)
  - The video: A countdown 10→0, then a night view of China with order arcs flying from every city to the warehouses. The GMV counter speeds up, and milestones burst on screen ("¥10B in 1 minute 36
    seconds").
  - Why it matters: Motion graphics plus instanced 3D with around 100k arcs. It tells a strong "peak traffic" story for AWS.

  H. 直播间秒杀 motion pack (live-commerce flash-sale graphics)
  - The video: On-screen graphics for a shopping livestream: "3-2-1 上链接", a red-envelope rain, a stock bar draining to "已抢光", scrolling danmaku comments and the shopping-cart pop-up.
  - Why it matters: A reusable graphics kit. Smaller in scope.

  Why A: it's the most native to e-commerce and has the clearest business case. The message would be "Opus 5.5 wrote a video template that makes a product video for every product, every channel and
  every language." Its glass and liquid materials also look nothing like 01 or 02. If you want sheer spectacle instead, C or F.



Three ways to build it (the option One has been used for this Video Factory):

  1. Three.js page + Node/Playwright/ffmpeg script ⭐ recommended
     - The stack from 02: no build step, and the same code serves preview and rendering.
     - Timing is a pure function of t and the chosen variant, and all on-screen text is driven by the timeline rather than CSS transitions. So every frame renders the same way every time, and batch
       rendering is just "load the variant → step through frames → pipe to ffmpeg".
     - Glass uses Three.js's transmission material with a fake caustics pass.
  2. Remotion + React Three Fiber
     - Remotion is designed for exactly this kind of templated batch rendering.
     - Downsides: it adds a build step and npm dependencies, and Remotion requires a paid company license for organisations above 3 people, which is awkward for an AWS sample.
  3. Blender + Python
     - Real ray-traced glass and caustics, so the best image quality.
     - Downsides: it leaves the web, there's no in-browser preview, rendering is much slower, and it breaks the series' "open the page and watch it" idea.