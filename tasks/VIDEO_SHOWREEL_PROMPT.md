# Video Showreel Agent — Copilot Prompt

## Context

This agent is part of the Piega report pipeline. It runs AFTER the Renovation Visualiser has completed, using the before/after image pairs to produce a single video showreel of the property transformation.

**What it does:** Takes every before/after pair from the Visualiser output, generates a smooth AI-powered morphing transition for each pair (the building visibly transforms from neglected to renovated), then stitches all clips into one continuous video with branding, labels, and transitions.

**Why it matters:** A shareable 20-30 second video of a property transforming is more engaging than static before/after images on WhatsApp, Instagram, or in an email. Agents can share it instantly. It's the kind of content that gets forwarded.

**This is an OPTIONAL step.** The report works without it. The video is an additive asset for sharing, not a report dependency.

---

## Architecture: Two phases

### Phase 1 — Generate transition clips (AI, via fal.ai)

For each before/after pair, use **Vidu** (start-end-to-video model) to generate a smooth morph transition. The model takes a start image (before) and end image (after) and produces a video of the transformation happening.

### Phase 2 — Assemble showreel (ffmpeg, no AI)

Stitch all clips into one video with:
- Intro card (property address, price, PIEGA branding) — 3 seconds
- Each transition clip with a text overlay (room/exterior label) — 4-6 seconds each
- Crossfade transitions between clips — 0.5 seconds each
- Outro card (PIEGA branding, report URL) — 3 seconds
- Optional: ambient background music track

```
Phase 1 (AI):
  Before/After pair 1 → Vidu → clip_1.mp4
  Before/After pair 2 → Vidu → clip_2.mp4
  Before/After pair 3 → Vidu → clip_3.mp4
  (parallel, all at once)

Phase 2 (ffmpeg):
  intro_card + clip_1 + clip_2 + clip_3 + outro_card → showreel.mp4
```

---

## API: Vidu Start-End-to-Video via fal.ai

Vidu's start-end-to-video endpoint is purpose-built for generating smooth transitions between two images. It understands spatial relationships and produces coherent morphing rather than simple cross-fades.

### Endpoint

```
fal-ai/vidu/start-end-to-video
```

### API call

```typescript
import { fal } from "@fal-ai/client"

const result = await fal.subscribe("fal-ai/vidu/start-end-to-video", {
  input: {
    prompt: "Smooth renovation transformation of a property exterior. The building gradually transforms from neglected to beautifully restored. Camera remains static, viewing angle unchanged. Natural daylight, realistic transition.",
    start_image_url: "https://...before-photo.jpg",    // original Rightmove photo
    end_image_url: "https://...after-photo.jpg",        // Nano Banana renovated version
    movement_amplitude: "auto",                          // let the model decide
    resolution: "720p",                                  // good enough for sharing
  },
  logs: true,
  onQueueUpdate: (update) => {
    if (update.status === "IN_PROGRESS") {
      console.log("[Vidu] Generating transition clip...")
    }
  }
})

// result.data.video.url → generated video URL
```

### Pricing

~$0.10-0.15 per clip (Vidu is one of the cheaper video models on fal.ai).

At 3-5 clips per showreel: **$0.30-0.75 per video showreel.**

### Important parameters

```typescript
{
  prompt: string,              // describes the transition motion
  start_image_url: string,     // before photo
  end_image_url: string,       // after photo (from Visualiser)
  movement_amplitude: "auto" | "small" | "medium" | "large",  // default "auto"
  resolution: "360p" | "720p", // 720p for quality, 360p for testing
  seed: number | null,         // for reproducibility
  enable_audio: false,         // we add music in ffmpeg, not per-clip
}
```

---

## Prompt strategy for transition clips

The transition prompt should describe HOW the transformation happens, not what the before/after look like (the images already convey that). Keep it minimal and focused on camera behaviour.

### For exteriors

```
Smooth renovation transformation of a house exterior. The building gradually transforms from its current neglected state to a beautifully restored condition. Camera remains perfectly static. Natural daylight throughout. Walls re-render, roof repairs itself, garden tidies. Realistic, steady transformation.
```

### For interiors

```
Smooth renovation of a room interior. The space gradually transforms from dated to renovated. Camera remains perfectly static, viewing angle unchanged. Walls repaint, flooring changes, fixtures update, furniture appears. Natural light, realistic transition.
```

### Key prompting rules

1. **Always say "camera remains static"** — you don't want the camera moving, you want the BUILDING changing. Camera motion + scene change = chaos.
2. **Always say "gradually transforms"** — not instant, not flickering. A smooth morph.
3. **Keep prompts short** — 2-3 sentences max. Vidu follows the images more than the text for start-end transitions.
4. **Never describe the specific before/after states** — the model sees both images, it doesn't need you to describe them.
5. **Always include "realistic"** — prevents the model from adding fantasy elements.

---

## Showreel assembly with ffmpeg

After all clips are generated, assemble them into one video. This runs on your server — ffmpeg is available in most Node.js environments via `fluent-ffmpeg` or direct shell calls.

### Dependencies

```bash
# System dependency (must be available on the server)
sudo apt-get install ffmpeg

# Node.js wrapper (optional, can also use child_process)
pnpm add fluent-ffmpeg @types/fluent-ffmpeg
```

### Showreel structure

```
[Intro card: 3s]
   Property address, price, "PIEGA." branding
   Warm dark background, your brand typography
   Fade in from black

[Clip 1: 4-6s]
   Exterior transformation
   Label overlay: "Exterior" (small, bottom-left)
   Crossfade transition →

[Clip 2: 4-6s]
   Garden / rear transformation
   Label overlay: "Garden"
   Crossfade transition →

[Clip 3: 4-6s]
   Living room transformation
   Label overlay: "Living Room"
   Crossfade transition →

[Clip 4: 4-6s] (if available)
   Kitchen / dining room transformation
   Label overlay: "Kitchen"
   Crossfade transition →

[Outro card: 3s]
   "PIEGA." branding
   Report URL: piega.co/report/{id}
   Fade to black

Total duration: 20-35 seconds depending on clip count
```

### Assembly approach

```typescript
import { execSync } from "child_process"
import { writeFileSync } from "fs"

function assembleShowreel(
  clips: Array<{ videoUrl: string; label: string }>,
  reportId: string,
  address: string,
  priceDisplay: string,
): string {
  // 1. Download all clips to temp directory
  // 2. Generate intro card image (address + price + branding)
  // 3. Generate outro card image (branding + URL)
  // 4. Use ffmpeg to:
  //    a. Convert intro/outro images to 3-second video clips
  //    b. Add label overlays to each transition clip
  //    c. Concatenate with crossfade transitions
  //    d. Add background music (optional, from a static asset)
  //    e. Output final mp4

  // ffmpeg concat with crossfade example:
  // ffmpeg -i intro.mp4 -i clip1.mp4 -i clip2.mp4 -i outro.mp4 \
  //   -filter_complex "[0][1]xfade=transition=fade:duration=0.5:offset=2.5[v01]; \
  //                     [v01][2]xfade=transition=fade:duration=0.5:offset=8[v012]; \
  //                     [v012][3]xfade=transition=fade:duration=0.5:offset=14[vout]" \
  //   -map "[vout]" -c:v libx264 -pix_fmt yuv420p output.mp4

  return outputPath
}
```

### Intro/outro card generation

Simple approach: generate a static image (using HTML → screenshot via Puppeteer, or direct Canvas API), then convert to a 3-second video clip with ffmpeg.

```typescript
// Intro card: warm dark background (#1A1816), Playfair Display heading, Inter body
// Shows:
//   PIEGA.
//   [address]
//   [price] · [archetype badge]

// Outro card: same background
// Shows:
//   PIEGA.
//   piega.co/report/{reportId}
//   "Property intelligence · United Kingdom"
```

### Background music

Include a single royalty-free ambient track as a static asset in the project. 30 seconds of warm, minimal background music. Applied at low volume (-18dB) during assembly. Not AI-generated — just a licensed track you include in the repo.

---

## Types

```typescript
interface VideoShowreelConfig {
  resolution: "360p" | "720p"       // 720p for production, 360p for testing
  includeMusic: boolean              // default true
  clipDuration: number               // Vidu generates variable length, ~4-6s
}

interface TransitionClipRequest {
  beforeUrl: string                  // original Rightmove photo
  afterUrl: string                   // Nano Banana renovated version
  label: string                      // "Exterior", "Living Room", etc.
  type: "exterior" | "interior"
  prompt: string                     // transition prompt
}

interface TransitionClipResult {
  videoUrl: string                   // fal.ai hosted video URL
  label: string
  durationSeconds: number
}

interface VideoShowreelResult {
  videoUrl: string                   // final assembled showreel URL (stored in Supabase Storage)
  durationSeconds: number            // total showreel length
  clipCount: number                  // how many transition clips
  generationCost: number             // fal.ai cost for Vidu clips
  thumbnailUrl: string               // first frame, for preview
}
```

---

## Agent function signature

```typescript
export async function videoShowreelAgent(
  visualisation: RenovationVisualisationOutput,
  listing: {
    address: string
    priceDisplay: string
    propertyType: string
  },
  reportId: string,
  config?: Partial<VideoShowreelConfig>,
): Promise<VideoShowreelResult>
```

---

## Implementation flow

```typescript
async function videoShowreelAgent(
  visualisation: RenovationVisualisationOutput,
  listing: { address: string; priceDisplay: string; propertyType: string },
  reportId: string,
  config?: Partial<VideoShowreelConfig>,
): Promise<VideoShowreelResult> {
  const cfg = { resolution: "720p", includeMusic: true, ...config }

  // 1. Build clip requests from visualisation pairs
  const allPairs = [
    ...visualisation.exteriors,
    ...visualisation.interiors,
  ]

  const clipRequests: TransitionClipRequest[] = allPairs.map(pair => ({
    beforeUrl: pair.originalUrl,
    afterUrl: pair.renovatedUrl,
    label: pair.room || pair.depicts.replace("_", " "),
    type: pair.type,
    prompt: pair.type === "exterior"
      ? "Smooth renovation transformation of a house exterior. The building gradually transforms from neglected to restored. Camera remains perfectly static. Natural daylight. Realistic, steady transformation."
      : "Smooth renovation of a room interior. The space gradually transforms from dated to renovated. Camera remains perfectly static. Natural light. Realistic transition.",
  }))

  // 2. Generate all transition clips in parallel via Vidu
  const clips = await Promise.all(
    clipRequests.map(req => generateTransitionClip(req, cfg.resolution))
  )

  // 3. Download all clip videos to temp directory
  const tempDir = await downloadClips(clips)

  // 4. Generate intro + outro card images
  const introPath = await generateIntroCard(listing, tempDir)
  const outroPath = await generateOutroCard(reportId, tempDir)

  // 5. Assemble with ffmpeg
  const showreelPath = await assembleWithFfmpeg(
    introPath, clips, outroPath, tempDir, cfg
  )

  // 6. Upload to Supabase Storage
  const videoUrl = await uploadToStorage(showreelPath, reportId)
  const thumbnailUrl = await extractThumbnail(showreelPath, reportId)

  // 7. Clean up temp files
  await cleanup(tempDir)

  return {
    videoUrl,
    durationSeconds: calculateDuration(clips),
    clipCount: clips.length,
    generationCost: clips.length * 0.12, // approximate Vidu cost
    thumbnailUrl,
  }
}
```

### Vidu clip generation wrapper

```typescript
async function generateTransitionClip(
  req: TransitionClipRequest,
  resolution: "360p" | "720p",
): Promise<TransitionClipResult> {
  // Ensure both image URLs are accessible from fal.ai
  const startUrl = await ensureAccessibleUrl(req.beforeUrl)
  const endUrl = await ensureAccessibleUrl(req.afterUrl)

  const result = await fal.subscribe("fal-ai/vidu/start-end-to-video", {
    input: {
      prompt: req.prompt,
      start_image_url: startUrl,
      end_image_url: endUrl,
      movement_amplitude: "auto",
      resolution: resolution,
      enable_audio: false,             // we add music in assembly
    },
    logs: true,
  })

  return {
    videoUrl: result.data.video.url,
    label: req.label,
    durationSeconds: result.data.video.duration || 5,  // fallback
  }
}
```

---

## Storage

```
piega_reports.results
├── classification
├── design_brief
├── renovation_visualisation
├── cost_estimate
├── narrative
└── video_showreel                    <- NEW
    ├── videoUrl: string
    ├── thumbnailUrl: string
    ├── durationSeconds: number
    ├── clipCount: number
    └── generationCost: number
```

The actual video file lives in Supabase Storage (or S3/R2), not in the JSON. The results JSON stores the URL.

---

## Updated pipeline

```
Extension → Classifier → Design Brief → [Visualiser + Cost Estimator] → Narrative Writer → Report Assembly
                                              │                                                    │
                                              └──→ Video Showreel (optional, after Visualiser) ────┘
```

The Video Showreel depends on the Visualiser (it needs the before/after pairs). It does NOT block the Narrative Writer or Report Assembly — it runs independently and the report page shows a video player if the showreel exists, or nothing if it doesn't.

---

## Files to create

```
src/agents/videoShowreel.ts            # Main agent
src/utils/ffmpeg.ts                    # ffmpeg assembly helpers
src/utils/videoCards.ts                # Intro/outro card generation
test/agents/videoShowreel.test.ts      # Test with Easingwold fixtures
```

---

## Cost summary

| Component | Cost |
|-----------|------|
| Vidu transition clips (3-5) | $0.30-0.75 |
| ffmpeg assembly | $0 (runs on server) |
| Supabase Storage | negligible |
| **Total per showreel** | **$0.30-0.75** |

This adds ~$0.50 on average to the per-report cost, bringing total pipeline cost to ~$1.10-1.65 with video.

---

## When to generate

The showreel is optional and relatively expensive. Three options for when to trigger it:

1. **Manual only** — user clicks "Generate Video" button in the pipeline hub. Best for MVP — don't burn $0.50 on every report, only when someone wants the video.
2. **On report share** — when an agent clicks "Share report," generate the video as part of the share package. Ensures the video exists when it's needed.
3. **Automatic** — generate for every report after the Visualiser completes. Most expensive, simplest UX.

Recommend option 1 for now. Add option 2 when you validate agents actually share the videos.

---

## Server requirements

ffmpeg must be installed on the server. Verify:
```bash
ffmpeg -version  # must be available
```

For Vercel/serverless: ffmpeg is NOT available by default. Options:
- Use a separate processing server (a small VPS or Railway container)
- Use fal.ai's own ffmpeg utility API (they offer video composition endpoints)
- Use a Supabase Edge Function with ffmpeg-wasm (limited but possible)

For MVP: if your backend is already a Node.js server (not serverless), ffmpeg is the simplest path. If serverless, explore fal.ai's video composition API as an alternative to local ffmpeg.

---

## Build order

1. **Test Vidu manually first** — take one before/after pair from the Easingwold report, call Vidu start-end-to-video directly, check if the morphing transition looks good for architecture. This is the quality gate. If buildings warp and windows swim, stop here — fall back to Approach B (programmatic Ken Burns with ffmpeg, no AI video).
2. If Vidu quality passes → build the clip generation wrapper
3. Build the ffmpeg assembly (intro card → clips → outro card)
4. Build the full agent
5. Add the video player to the report page (HTML5 `<video>` element, shows if `results.video_showreel` exists)
