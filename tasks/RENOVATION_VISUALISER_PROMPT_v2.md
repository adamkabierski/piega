# Renovation Visualiser Agent — Copilot Prompt

## Context

This agent is part of the Piega report pipeline (see COPILOT_PROMPT.md for full architecture). It sits in the Media Generator stage and generates "after renovation" images from existing property photos.

**What it does:** Takes classified images from the Classifier agent, selects the best candidates, crafts renovation-specific prompts via Claude, and calls Nano Banana (Google Gemini image models) via fal.ai to produce "what this property could look like after renovation."

**Why it matters:** This is the most emotionally powerful part of the report. An agent trying to sell a neglected property shows buyers a before/after that makes them think "I can see it now." Images must feel realistic and tasteful — not generic AI renders.

---

## API: Nano Banana via fal.ai

Two switchable models, same fal.ai SDK:

| Model | fal.ai endpoint | Real name | Price | Use when |
|-------|----------------|-----------|-------|----------|
| **Nano Banana Pro** | `fal-ai/nano-banana-pro/edit` | Gemini 3 Pro Image | $0.15/image | Production — maximum quality, reasons about spatial relationships and lighting |
| **Nano Banana 2** | `fal-ai/nano-banana-2/edit` | Gemini 3.1 Flash Image | $0.08/image | Testing/iteration — fast, vibrant, good quality at lower cost |

Both accept `image_urls` (array) + text prompt. Both understand natural language editing and preserve scene structure without masking.

### Setup

```bash
pnpm add @fal-ai/client
```

```env
FAL_KEY=fal_...
VISUALISER_MODEL=nano-banana-pro   # or "nano-banana-2"
```

### API call shape (both models identical)

```typescript
import { fal } from "@fal-ai/client"

fal.config({ credentials: process.env.FAL_KEY })

const result = await fal.subscribe("fal-ai/nano-banana-pro/edit", {
  input: {
    prompt: "Renovate the exterior: fresh white lime render...",
    image_urls: ["https://...property-photo.jpeg"],  // NOTE: array
    num_images: 1,
    output_format: "jpeg",
    aspect_ratio: "auto",
    resolution: "1K",
  }
})
// result.data.images[0].url → generated image URL
```

### Cost per report

| Model | 5 images/report | 100 reports/month |
|-------|----------------|-------------------|
| Nano Banana Pro | $0.75 | $75 |
| Nano Banana 2 | $0.40 | $40 |

---

## Architecture: Two-step per image

```
Classified Image → Claude (craft renovation prompt) → Nano Banana (edit image) → Result
```

**Step 1 — Claude crafts the prompt.** Receives classifier observations + archetype, writes a specific Nano Banana editing instruction. This is what makes each image feel considered: Claude knows "period cottage, pre-1900, stripped walls, damp staining, timber panelling" and writes a prompt with era-appropriate materials, not generic white-gloss.

**Step 2 — Nano Banana transforms the image.** Original photo + Claude's prompt → renovated image.

---

## Image selection logic

### Exterior (up to 3)
1. `front_exterior` with `usefulness: "high"` — the hero transformation
2. `rear_exterior` or `side_exterior` with highest usefulness — garden/outdoor potential
3. Third angle if available with high usefulness, otherwise stop at 2

### Interior (up to 2)
1. `living_room` or `kitchen` with highest usefulness — rooms buyers care about most
2. Next best: `kitchen` (if #1 was living room), `bedroom`, or `bathroom` — pick where renovation impact is most dramatic

### Rules
- Only `usefulness: "high"` or `"medium"`
- Never `floorplan`, `street_view`, `detail_closeup`, `unknown`
- Never images with `skipReason`
- One image per room type (deduplicate, pick highest usefulness)
- If fewer than 5 suitable images, reduce count — never force bad sources

---

## Prompt crafting

### System prompt for Claude

```
You are an architectural visualisation prompt writer. You write image editing prompts for an AI model that transforms existing property photos based on text instructions.

Your job: given an original property photo and observations about its current condition, write a prompt that describes how the property should look after a tasteful, realistic renovation.

RULES:

1. Start with the transformation instruction directly.
   Good: "Renovate the kitchen: replace dated units with contemporary shaker-style cabinets in sage green..."
   Bad: "This is a kitchen that needs renovation. It would look better with..."

2. Be SPECIFIC about materials and finishes — don't say "modern kitchen", say "contemporary shaker-style cabinets in warm grey with brass handles, oak butcher-block worktops, metro tile splashback in soft white"

3. ALWAYS include structural preservation instructions. State what must stay the same: room dimensions, window positions, ceiling height, doorway positions, house shape and proportions, chimney positions, number of storeys.

4. Describe REALISTIC renovation, not fantasy. Modest to medium budget — no marble countertops, no chandelier lighting, no luxury finishes. Well-chosen mid-range materials with good taste. Farrow & Ball paint, not gold leaf.

5. Aesthetic: warm, considered, liveable. Not a showroom, not sterile minimalism. Think The Modern House listings — restrained good taste, natural materials, plenty of light.

6. For exteriors: fresh render/paint, repaired roof, tidy garden (not landscaped paradise), clean windows, possibly new front door in heritage colour. Cared-for, not transformed into a different building.

7. For interiors: clean walls in warm neutrals or period-appropriate colours, good flooring (engineered oak, appropriate tiles), updated fixtures, good lighting. RETAIN period features noted by classifier (cornicing, fireplaces, ceiling roses, picture rails, timber panelling).

8. Keep prompts under 150 words. Direct, concrete instructions.

9. NEVER mention "AI", "rendering", "visualisation", or "generated".

10. Respect the era. Georgian → sash windows, traditional colours. Victorian → encaustic tiles, cast iron radiators. Welsh farmhouse → lime render, slate. 1960s bungalow → mid-century modern touches.

11. End with lighting: "Warm natural daylight" or "Soft overcast light" — keeps it feeling like a real photo.
```

### User prompt template

```
Property archetype: {archetype.displayName} ({archetype.era})
Construction: {archetype.constructionType}
Image type: {depicts} — {room || "exterior"}

Observations from classifier:
{observations as bullet list}

Write an image editing prompt to show this {depicts} after a tasteful renovation for a {archetype.displayName} with a modest-to-medium budget.

Return ONLY the prompt text, nothing else.
```

### Example outputs

**Welsh farmhouse front exterior** (observations: rendered farmhouse, slate roof poor condition, overgrown garden, rubble):
```
Renovate the exterior of this Welsh farmhouse: apply fresh smooth white lime render to all walls, repair the slate roof replacing all missing and damaged tiles, paint window frames in muted heritage green, fit a solid timber front door in matching green. Clear rubble and overgrown vegetation, lay a neat gravel path bordered by low lavender hedging, add a simple dry stone wall boundary. Keep the same house shape, chimney positions, window openings, two-storey proportions, and rural hillside setting. Warm natural daylight, soft clouds.
```

**Stripped living room** (observations: fireplace with wood stove, stripped walls, damp staining, suspended ceiling, timber panelling, concrete floor):
```
Renovate this living room: remove suspended ceiling tiles to reveal full ceiling height, plaster and paint walls in warm off-white, restore timber panelling to natural oak as a dado feature, lay engineered oak herringbone flooring. Keep the fireplace and wood burning stove as focal point with a reclaimed timber beam mantel. Add two linen armchairs in oatmeal, a wool rug, brass wall sconces either side of the fireplace. Keep room dimensions, window position, doorway, and fireplace position unchanged. Warm natural daylight.
```

---

## Types

```typescript
type ImageModel = "nano-banana-pro" | "nano-banana-2"

interface RenovationVisualiserConfig {
  model: ImageModel
  maxExteriors: number           // default 3
  maxInteriors: number           // default 2
}

interface VisualisationRequest {
  imageIndex: number
  imageUrl: string
  depicts: ImageSubject
  room: string | null
  observations: string[]
  archetype: ClassificationResult["archetype"]
  type: "exterior" | "interior"
}

interface VisualisationResult {
  imageIndex: number
  originalUrl: string
  renovatedUrl: string
  depicts: ImageSubject
  room: string | null
  type: "exterior" | "interior"
  promptUsed: string
  model: ImageModel
}

interface RenovationVisualisationOutput {
  exteriors: VisualisationResult[]
  interiors: VisualisationResult[]
  totalCost: number
  totalDurationMs: number
  model: ImageModel
}
```

---

## Implementation outline

### fal.ai wrapper (src/utils/fal.ts)

```typescript
const MODEL_ENDPOINTS: Record<ImageModel, string> = {
  "nano-banana-pro": "fal-ai/nano-banana-pro/edit",
  "nano-banana-2": "fal-ai/nano-banana-2/edit",
}

const MODEL_COSTS: Record<ImageModel, number> = {
  "nano-banana-pro": 0.15,
  "nano-banana-2": 0.08,
}

async function generateRenovatedImage(
  imageUrl: string,
  prompt: string,
  model: ImageModel,
): Promise<{ url: string }>

// Also: ensureAccessibleUrl(url) — see Image URL section below
```

### Prompt crafter (src/agents/renovationVisualiser.ts)

```typescript
async function craftRenovationPrompt(
  req: VisualisationRequest
): Promise<string>
// Calls Claude Sonnet with system prompt + user template
// Returns raw prompt string
```

### Image selector (src/agents/renovationVisualiser.ts)

```typescript
function selectImagesForVisualisation(
  images: ClassificationResult["images"],
  config: RenovationVisualiserConfig,
): { exteriors: ClassifiedImage[]; interiors: ClassifiedImage[] }
```

### Main agent (src/agents/renovationVisualiser.ts)

```typescript
export async function renovationVisualiserAgent(
  classifiedImages: ClassificationResult["images"],
  archetype: ClassificationResult["archetype"],
  config?: Partial<RenovationVisualiserConfig>,
): Promise<RenovationVisualisationOutput>

// 1. selectImagesForVisualisation()
// 2. Promise.all → craftRenovationPrompt() for each
// 3. Promise.all → generateRenovatedImage() for each
// 4. Assemble results
```

---

## Image URL accessibility

Rightmove URLs may be blocked from fal.ai servers. Test first. If blocked:

```typescript
async function ensureAccessibleUrl(url: string): Promise<string> {
  // Try fetching from our backend
  const response = await fetch(url)
  if (response.ok) return url

  // If blocked, upload to fal.ai storage
  const buffer = await response.arrayBuffer()
  const file = new File([buffer], "photo.jpg", { type: "image/jpeg" })
  const uploadedUrl = await fal.storage.upload(file)
  return uploadedUrl
}
```

The Chrome extension should ideally pass image data (base64 or blob) alongside URLs to avoid this issue entirely. Consider updating ParsedListing to optionally include image data.

---

## Files to create

1. `src/utils/fal.ts` — client setup, model wrapper, URL helper
2. `src/prompts/renovationVisualiser.ts` — system prompt + user template as exported constants
3. `src/agents/renovationVisualiser.ts` — full agent
4. `fixtures/classifier-output/welsh-farmhouse.json` — save classifier output from conversation
5. `test/agents/renovationVisualiser.test.ts`
6. Update `package.json`: add `@fal-ai/client`
7. Update `.env.example`: add `FAL_KEY`, `VISUALISER_MODEL`

### Build order
1. Test fal.ai manually — one image, one handwritten prompt, call Nano Banana Pro directly
2. If Rightmove URLs blocked → implement ensureAccessibleUrl upload path
3. Wire up Claude prompt crafting, test prompt quality without image generation
4. Wire up full agent with selection logic
5. Run both models on same images, compare side by side, pick default
