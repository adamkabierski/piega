# Design Brief Agent — Copilot Prompt

## Context

This agent is part of the Piega report pipeline (see COPILOT_PROMPT.md for full architecture). It sits BETWEEN the Classifier and the Renovation Visualiser. It is a new step that didn't exist before.

**Previous pipeline:**
```
Extension → Classifier → Visualiser (each image prompted independently)
```

**New pipeline:**
```
Extension → Classifier → Design Brief → Visualiser (all images follow a shared brief)
```

**What it solves:** The visualiser's biggest problem is that each image is prompted independently. The kitchen gets sage green cabinets while the living room gets grey walls and the exterior gets cream render — they don't read as the same renovation. The design brief creates a single coherent vision that every image prompt must follow.

**But it does more than that.** The brief also decides:
- How aggressively to transform (gut renovation vs. cosmetic refresh vs. staging)
- Which images are actually worth transforming (and which to skip)
- What each image's prompt should emphasise given its specific qualities
- How many images total to generate (1 strong image beats 5 mediocre ones)

---

## What the Design Brief agent receives

From the Classifier output:
```typescript
{
  archetype: {
    label: string              // e.g. "period_cottage"
    displayName: string        // e.g. "Period Cottage"
    era: string                // e.g. "pre-1900"
    constructionType: string   // e.g. "Stone/rendered walls, slate roof"
    typicalCharacteristics: string[]
    confidenceScore: number
  },
  images: Array<{
    index: number
    url: string
    classification: {
      depicts: ImageSubject      // "front_exterior", "kitchen", "living_room", etc.
      room: string | null
      usefulness: "high" | "medium" | "low"
      observations: string[]     // what's visible in the photo
      skipReason: string | null
    }
  }>,
  summary: string              // 2-3 sentence architectural reading
}
```

It also receives:
- `askingPrice: number`
- `address: string`
- `propertyType: string` (from Rightmove, e.g. "Semi-Detached Bungalow")
- `bedrooms: number`
- `bathrooms: number`

---

## What the Design Brief agent produces

```typescript
interface DesignBrief {
  // 1. How aggressively to transform
  transformationStrategy: TransformationStrategy
  strategyRationale: string       // 2-3 sentences explaining why this strategy

  // 2. Unified design language
  designLanguage: {
    palette: string[]             // 3-5 named colours, e.g. ["slate grey", "raw linen", "aged brass"]
    materials: string[]           // 3-5 materials, e.g. ["lime plaster", "engineered oak", "reclaimed stone"]  
    mood: string                  // single sentence, e.g. "honest, warm, rooted in place"
    eraGuidance: string           // what to respect/avoid for this era
    avoidList: string[]           // explicit things NOT to do, e.g. ["no grey crushed velvet", "no spotlights"]
  }

  // 3. Which images to transform and how
  imageSelections: Array<{
    index: number                 // from classifier images array
    use: boolean                  // true = transform this, false = skip
    type: "exterior" | "interior"
    reason: string                // why selected or skipped
    promptGuidance: string        // specific notes for this image's prompt
    transformationIntensity: "heavy" | "moderate" | "light"  // how much to change
  }>

  // 4. Recommended output count
  recommendedCount: {
    exteriors: number             // 0-3
    interiors: number             // 0-2
    total: number
  }

  // 5. The concept statement (used in the report narrative too)
  conceptStatement: string        // 3-4 sentences describing the renovation vision
                                  // written for a human reader, not for the image model
}

type TransformationStrategy =
  | "full_renovation"    // stripped/derelict → complete rethink
  | "refresh"            // dated but liveable → new surfaces, same bones
  | "staging"            // already decent → furniture, styling, lifestyle
  | "minimal"            // already good → 1-2 subtle tweaks or nothing
  | "exterior_focus"     // interiors too poor to transform, lean on outside
```

---

## The four condition tiers — how the agent decides strategy

The agent must assess the property's condition from the classifier observations and choose a strategy. This is the most important decision it makes.

### Tier 1: "The wreck" → `full_renovation`

**Signals:** Stripped walls, concrete floors, missing roof tiles, collapsed outbuildings, rubble, no functioning kitchen/bathroom, extensive damp, absent or destroyed period features, property clearly uninhabitable.

**What the brief does:** Commits fully. Strong design direction rooted in the era and construction. Names specific colours, specific materials, a consistent mood. Should read like an architect's concept statement. Pushes for "lift" — an opinion, a character, a point of view. Not "make it nice" but "make it THIS."

**Example concept:** "This is a building that wants to be honest about its materials. Exposed stone where possible, lime render where not. The palette is slate grey, raw linen, aged brass. The kitchen doesn't pretend to be modern — it's a farmhouse kitchen with depth and warmth. Every surface earns its place."

**Image selection:** Usually plenty of high-usefulness photos because every room is visibly in need of work. Pick the most dramatic before states — rooms with fireplaces, rooms with visible ceiling height, rooms with good natural light despite the mess. These transform most convincingly.

**transformationIntensity:** `"heavy"` on all selected images.

---

### Tier 2: "The dated but liveable" → `refresh`

**Signals:** Functioning but ugly kitchen (1980s/90s units), magnolia walls, carpeted throughout, artex ceilings, working bathroom with coloured suite, intact but tired decorative scheme. Property is habitable.

**What the brief does:** Restraint. Not inventing a new building — unlocking what's already there. "Strip the carpet, sand the boards. Paint everything warm white. Kitchen gets new doors on existing carcasses — shaker profile, soft sage — and a new worktop. Not a new kitchen, a refreshed one." The brief should explicitly limit scope to prevent over-transformation.

**Example concept:** "Everything here is structurally sound. The transformation is about light, surface, and feel. We're peeling back the 1990s to let the house's proportions breathe. Warm whites, natural timber tones, and one considered colour per room — nothing dramatic, just everything slightly better."

**Image selection:** Be pickier. Some rooms may look acceptable already — skip those. Only transform the rooms that clearly need help. If the kitchen is dated but the living room is fine, only transform the kitchen. Don't generate an "after" for a room that doesn't need one.

**transformationIntensity:** `"moderate"` on most, `"light"` on rooms that are almost acceptable.

**CRITICAL:** The "after" must look like the same house, not a different one. If the generated image shows a completely different kitchen, the viewer thinks "fantasy." Keep the layout, keep the proportions, change the surfaces.

---

### Tier 3: "Already quite nice" → `staging` or `minimal`

**Signals:** Recently renovated, well-maintained, clean and light interiors, modern fixtures. The photos show a space that doesn't obviously need work.

**What the brief does:** Shifts from renovation to lifestyle presentation. Not "here's what to fix" but "here's how to present this." Prompts become about furniture staging, greenery, warmth: "Style this living room with a linen sofa facing the window, a reading lamp, a stack of books. The space is already good — show it being lived in."

For exteriors: "The garden is tidy but empty. Add a bistro table and two chairs, potted olive tree, string lights. Make it feel like someone's favourite evening spot."

**Example concept:** "This property doesn't need transformation — it needs inhabiting. The rooms are already light and well proportioned. We're adding the warmth of someone actually living here: books, linen, plants, warm light. The goal is to make the viewer imagine their life in this space, not their renovation project."

**Image selection:** Very selective. Maybe 1-2 images total, not the full 5. One beautifully staged interior and one inviting exterior. More than that feels excessive for a property that already looks good.

**transformationIntensity:** `"light"` everywhere.

**VALID OPTION:** The brief can decide `recommendedCount.total = 0` and set `transformationStrategy = "minimal"`. This means no images get generated. The report focuses on the architectural reading and numbers instead. Not every report needs before/after images.

---

### Tier 4: "The boring box" → `full_renovation` or `exterior_focus`

**Signals:** Ex-council, 1960s estate, social housing stock. Functional but architecturally featureless. Flat facade, small windows, no period features, no character. PVCu everything. Pebbledash or plain render.

**What the brief does:** Can't "restore character" because there isn't any. Instead focuses on creating character from scratch. Exterior interventions: painted front door in a standout colour, window boxes with trailing greenery, new path pattern, cleaned/painted render. Interior: single bold wallpapered feature wall, pendant lighting, engineered flooring, consistent paint colour throughout.

**Example concept:** "There's no hidden history to reveal here. The design creates character from scratch — through colour, texture, and confident choices that turn anonymous into personal. A front door that says someone lives here. A kitchen wall that has an opinion. Rooms that feel chosen, not inherited."

**Image selection:** Exteriors are critical — the exterior IS the reason buyers skip the listing. Even a flat, boring facade shot is worth transforming because curb appeal changes are cheap and dramatic (a painted door and window boxes cost £200). Interior selection depends on photo quality; if interior shots are dark and tight, lean heavily on exteriors.

**transformationIntensity:** `"heavy"` on exteriors, `"moderate"` on interiors.

**Special case — `exterior_focus`:** If all interior photos are bad quality (dark, blurry, tight angles) but exteriors are usable, set `transformationStrategy = "exterior_focus"`. Generate 2-3 exterior transformations and 0 interiors. A report with three strong exterior before/afters and a note saying "interior viewing recommended" is more credible than forced AI hallucinations of rooms you can barely see.

---

## Camera angle and photo quality rules

These rules apply ACROSS all condition tiers. The design brief agent must evaluate photo quality, not just content.

### Rule 1: Never transform what you can't read

If a photo is so dark, blurry, or tightly cropped that neither the classifier nor a human can confidently identify what room it is or what condition it's in:
- `use: false`
- `reason: "Photo too dark/blurry/tight to produce a credible transformation"`

The classifier's `usefulness: "low"` catches most of these, but the design brief should double-check. A `usefulness: "medium"` photo might still be too poor for image generation specifically.

### Rule 2: Wide angles over tight angles

A wide-angle shot of an ugly room gives the model enough spatial context to produce a believable transformation. A tight shot of one corner gives almost nothing to work with.

When two photos show the same room, prefer the one that shows more of the room, even if it's not the most flattering angle. The design brief should note this in `promptGuidance`:
- Good: "Wide shot showing full room depth, fireplace wall, and window — push the transformation"
- Bad: "Tight corner crop, only shows one wall and part of ceiling — light changes only, don't reimagine the space"

### Rule 3: If all interiors are bad, lean on exteriors

Some listings have 3 decent exterior shots and 7 terrible interior shots. Set:
- `transformationStrategy: "exterior_focus"`
- `recommendedCount: { exteriors: 3, interiors: 0, total: 3 }`

An honest report that shows a beautifully transformed exterior and says "interior photos don't do the space justice" is more credible than forced hallucinations.

### Rule 4: Partial views and flat facades are fine

A flat facade shot (common for terraces, ex-council, social housing) is actually good for image editing. It's essentially a texture transformation: new render, new door, window boxes, tidy garden edge. Simple geometry = fewer model hallucinations.

Set `promptGuidance: "Flat facade, simple geometry — focus on surface treatment, door colour, and garden edge. Don't attempt to change the building's proportions."`

### Rule 5: One strong image beats five mediocre ones

If only one photo is genuinely high quality:
- `recommendedCount: { exteriors: 1, interiors: 0, total: 1 }` (or vice versa)
- The report puts that single powerful before/after as the hero

The design brief should always prefer fewer, better images over hitting a target count. The `recommendedCount` is a recommendation based on available quality, not a quota to fill.

### Rule 6: Duplicate angles — pick one, skip the rest

If two photos show the same subject from similar angles (common on Rightmove — two front exterior shots from slightly different positions), pick the better one and explicitly skip the other:
- Image 0: `use: true, reason: "Best front exterior — clearer, more of the facade visible"`
- Image 1: `use: false, reason: "Duplicate angle of front exterior, image 0 is stronger"`

---

## Implementation

### This is a SINGLE Claude call

The design brief is one call to Claude Sonnet. It receives all classified images and property metadata, and returns the full DesignBrief JSON. This is not a chain of agents — it's one well-prompted LLM call with structured output.

### System prompt

```
You are an architectural design consultant preparing a renovation brief for a UK property. You work at the intersection of architecture and property marketing — your job is to decide what a property could look like after renovation, and create a coherent visual strategy for showing that transformation.

You will receive:
- A classified property listing (archetype, era, construction type, condition observations)
- Every listing photo with classifications (what each shows, how useful it is)
- Basic property details (price, bedrooms, type)

You must produce a structured design brief that answers four questions:

1. HOW AGGRESSIVELY SHOULD WE TRANSFORM?
   Assess the property's condition tier:
   - "full_renovation" — stripped, derelict, uninhabitable, major structural/cosmetic work needed
   - "refresh" — dated but liveable, needs new surfaces and updated fixtures, bones are fine
   - "staging" — already decent, needs furniture/styling to show lifestyle potential
   - "minimal" — already good, maybe 1-2 tweaks or nothing at all
   - "exterior_focus" — interior photos are too poor quality to work with, focus on outside only

2. WHAT IS THE DESIGN LANGUAGE?
   Create a unified palette, material set, and mood that will apply to EVERY image. This must be:
   - Rooted in the building's era and construction type (a Victorian terrace ≠ a 1960s bungalow)
   - Specific enough to follow (name actual colours and materials, not "modern finishes")
   - Realistic for a modest-to-medium budget (no marble, no luxury brands, no fantasy)
   - Opinionated — have a point of view. "Warm white walls" is generic. "Lime plaster left deliberately imperfect, catching south light" has character.
   
   Also include an avoidList — things that would undermine the design:
   - Generic: "no grey crushed velvet, no chrome spotlights, no feature wall wallpaper from B&Q"
   - Era-specific: for a Victorian, "no flush modern doors, no LED strip lighting, no open plan where it wouldn't have existed"

3. WHICH IMAGES SHOULD WE TRANSFORM?
   For each classified image, decide:
   - use: true/false
   - If true: what the prompt should emphasise (what to change, what to preserve, how hard to push)
   - If false: why (too dark, duplicate angle, room doesn't need transformation, etc.)
   
   Rules:
   - Never transform usefulness: "low" images
   - Never transform floorplans, street views, or detail closeups
   - Wide angles over tight crops — more context = better output
   - One image per room type — if two photos show the kitchen, pick the better one
   - If all interior photos are poor, set strategy to "exterior_focus" and select 0 interiors
   - If the property already looks good, you may select 0 images total (strategy: "minimal")
   - Always prefer fewer, better images over hitting a target count

4. HOW MANY IMAGES TOTAL?
   Recommend a count based on available quality, not a fixed target:
   - Tier 1 wreck with good photos: up to 3 exterior + 2 interior = 5
   - Tier 2 dated with mixed photos: 1-2 exterior + 1-2 interior = 2-4
   - Tier 3 nice property: 1 exterior + 1 interior = 2, or 0 total
   - Tier 4 boring box: 2-3 exterior + 0-1 interior = 2-3
   - Bad photo quality across the board: reduce count to what's actually usable

Finally, write a CONCEPT STATEMENT — 3-4 sentences describing the renovation vision in plain English. This is for the report narrative, not for the image model. It should make a buyer or agent think "yes, I can see that."

RESPOND WITH VALID JSON matching the DesignBrief schema. No markdown, no explanation, just the JSON.
```

### User prompt template

```
PROPERTY DETAILS:
Address: {address}
Asking price: {priceDisplay}
Type: {propertyType}
Bedrooms: {bedrooms} | Bathrooms: {bathrooms}

ARCHETYPE:
{archetype.displayName} ({archetype.era})
Construction: {archetype.constructionType}
Characteristics: {archetype.typicalCharacteristics.join(", ")}
Confidence: {archetype.confidenceScore}

ARCHITECTURAL SUMMARY:
{summary}

CLASSIFIED IMAGES:
{for each image:}
  Image {index} — {classification.depicts} ({classification.room || "exterior"})
  Usefulness: {classification.usefulness}
  {classification.skipReason ? "SKIP REASON: " + classification.skipReason : ""}
  Observations:
  {classification.observations.map(o => "  - " + o).join("\n")}
{end for}

Produce the DesignBrief JSON.
```

---

## How the Visualiser uses the brief

The Renovation Visualiser agent changes as follows:

**Before (current):**
```
For each image:
  1. Select based on hardcoded priority rules
  2. Claude writes a prompt from scratch using only that image's observations
  3. Nano Banana generates the image
```

**After (with design brief):**
```
1. Design brief has already decided which images to use and how
2. For each selected image:
   a. Claude writes a prompt CONSTRAINED BY:
      - The brief's designLanguage (palette, materials, mood)
      - The brief's per-image promptGuidance
      - The brief's transformationIntensity for this image
   b. Nano Banana generates the image
```

The per-image prompt crafter's system prompt changes to include:

```
You are writing an image editing prompt for a specific photo. You MUST follow the design brief below — every material, colour, and mood choice must come from this brief. Do not invent your own palette or materials.

DESIGN BRIEF:
Strategy: {brief.transformationStrategy}
Palette: {brief.designLanguage.palette.join(", ")}
Materials: {brief.designLanguage.materials.join(", ")}
Mood: {brief.designLanguage.mood}
Era guidance: {brief.designLanguage.eraGuidance}
AVOID: {brief.designLanguage.avoidList.join(", ")}

GUIDANCE FOR THIS SPECIFIC IMAGE:
{imageSelection.promptGuidance}
Transformation intensity: {imageSelection.transformationIntensity}
```

This way the kitchen, living room, and exterior all use the same slate grey, the same oak, the same brass — because they're all following the same brief.

---

## Project integration

### New file
```
src/agents/designBrief.ts          # The agent
src/prompts/designBrief.ts         # System prompt + user template
src/types/agents.ts                # Add DesignBrief type (update existing file)
```

### Updated file
```
src/agents/renovationVisualiser.ts  # Now receives DesignBrief as input
src/prompts/renovationVisualiser.ts # System prompt updated to reference brief
```

### Agent function signature

```typescript
export async function designBriefAgent(
  classification: ClassificationResult,
  listing: {
    askingPrice: number
    address: string
    propertyType: string
    bedrooms: number
    bathrooms: number
  }
): Promise<DesignBrief>
```

### Updated visualiser signature

```typescript
export async function renovationVisualiserAgent(
  classifiedImages: ClassificationResult["images"],
  archetype: ClassificationResult["archetype"],
  designBrief: DesignBrief,                          // NEW — required input
  config?: Partial<RenovationVisualiserConfig>,
): Promise<RenovationVisualisationOutput>
```

The visualiser no longer runs its own image selection logic — it reads `designBrief.imageSelections` and only processes images where `use: true`.

### Updated pipeline

```
Extension → Classifier → Design Brief → Visualiser
                              ↓
                         (also feeds into Cost Estimator and Report Narrative later)
```

The design brief is useful beyond just the visualiser. The `conceptStatement` goes into the report narrative. The `transformationStrategy` and `designLanguage` inform the cost estimator (a full renovation costs more than a refresh). The `strategyRationale` can appear in the report's honest layer.

---

## Testing strategy

### Test 1: Tier assessment accuracy

Feed classifier outputs from different property types and verify the agent picks the right strategy:
- Welsh farmhouse (stripped, derelict) → `full_renovation`
- 1990s estate house (dated kitchen, magnolia walls) → `refresh`
- Recently renovated new-build → `staging` or `minimal`
- Ex-council flat with bad photos → `exterior_focus`

### Test 2: Image selection quality

Verify the agent makes sensible selection decisions:
- Skips `usefulness: "low"` images
- Skips duplicate angles
- Prefers wide shots over tight crops
- Reduces count when photo quality is poor
- Returns `total: 0` for properties that don't need transformation

### Test 3: Design coherence

Generate a brief, then manually check:
- Do the palette colours work together?
- Are the materials appropriate for the era?
- Does the avoidList catch obvious mistakes?
- Would the concept statement make sense to an estate agent?

### Test 4: End-to-end with visualiser

Run: Classifier → Design Brief → Visualiser on the Welsh farmhouse.
Compare the generated images against the OLD pipeline (no brief).
Check: do the images feel like the same renovation project?

---

## Cost

One Claude Sonnet call with ~2000 tokens input (classified images + metadata) and ~500 tokens output (the brief JSON).

Estimated cost: ~$0.01 per brief.

At 100 reports/month: $1/month. Negligible.

---

## What to build now

1. Add `DesignBrief` type to `src/types/agents.ts`
2. Create `src/prompts/designBrief.ts` with system prompt + user template
3. Create `src/agents/designBrief.ts` — single Claude call, structured JSON output
4. Update `src/agents/renovationVisualiser.ts` to accept and follow the brief
5. Update `src/prompts/renovationVisualiser.ts` to include brief constraints in per-image prompts
6. Create `test/agents/designBrief.test.ts` — test with Welsh farmhouse + other fixtures
7. Create `test/agents/designBriefToVisualiser.test.ts` — end-to-end coherence test

### Build order
1. Define the DesignBrief type
2. Write and test the design brief agent in isolation (cheapest to iterate on — just text in/out)
3. Update the visualiser to consume the brief
4. Run end-to-end comparison: old pipeline vs. new pipeline with brief
