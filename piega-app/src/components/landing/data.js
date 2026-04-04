export function reportToBlocks(report) {
  const blocks = [];
  const r = report.results ?? {};
  const listing = report.listing ?? {};
  const vis = r.renovation_visualisation;
  const classification = r.classification;
  const costEstimate = r.cost_estimate;
  const designBrief = r.design_brief;
  const narrative = r.narrative;
  const videoFacade = r.video_facade;
  const archetype = classification?.archetype;

  const propertyName = listing.address?.split(",")[0]?.trim() ?? "Property";
  const archetypeTag = archetype
    ? `${archetype.era} \u00B7 ${archetype.displayName}` : "";
  const priceStr = listing.askingPrice
    ? `\u00A3${Math.round(listing.askingPrice / 1000)}K` : "";

  // Interiors → large sliders (first 2), then medium composites
  if (vis?.interiors?.length) {
    vis.interiors.forEach((img, i) => {
      blocks.push({
        type: i < 2 ? "large_slider" : "medium_composite",
        beforeImage: img.originalUrl,
        afterImage: img.renovatedUrl,
        room: img.room ?? img.depicts ?? "Interior",
        propertyName, archetype: archetypeTag, price: priceStr,
        reportId: report.id,
      });
    });
  }

  // Exteriors → medium composites
  if (vis?.exteriors?.length) {
    vis.exteriors.forEach((img) => {
      blocks.push({
        type: "medium_composite",
        beforeImage: img.originalUrl,
        afterImage: img.renovatedUrl,
        room: img.depicts ?? "Exterior",
        propertyName, reportId: report.id,
      });
    });
  }

  // After-only thumbnails
  const allVis = [...(vis?.interiors ?? []), ...(vis?.exteriors ?? [])];
  allVis.forEach((img) => {
    blocks.push({
      type: "small_after",
      image: img.renovatedUrl,
      alt: `${propertyName} \u2014 ${img.room ?? img.depicts ?? "renovated"}`,
      reportId: report.id,
    });
  });

  // Palette swatches
  const palette = designBrief?.designLanguage?.palette;
  if (palette?.length >= 3) {
    blocks.push({
      type: "small_palette",
      colours: palette.slice(0, 5).map((p) => p.name ?? p),
      hexValues: palette.slice(0, 5).map((p) => p.hex ?? "#B8A99A"),
      reportId: report.id,
    });
  }

  // Material spec
  const mats = designBrief?.designLanguage?.materials;
  if (mats?.length) {
    blocks.push({
      type: "small_material",
      materials: mats.slice(0, 3).map((m) => (typeof m === "string" ? m : m.name ?? m)),
      reportId: report.id,
    });
  }

  // Cost estimate → big number
  const env = costEstimate?.totalEnvelope;
  if (env) {
    const lo = Math.round((env.low ?? env.min ?? 0) / 1000);
    const hi = Math.round((env.high ?? env.max ?? 0) / 1000);
    if (lo > 0 && hi > 0) {
      blocks.push({
        type: "text_number",
        number: `\u00A3${lo}K \u2013 \u00A3${hi}K`,
        label: "estimated renovation",
        subtitle: `${archetypeTag}${archetypeTag && propertyName ? " \u00B7 " : ""}${propertyName}`,
        reportId: report.id,
      });
    }
  }

  // Video facade
  if (videoFacade?.videoUrl) {
    blocks.push({
      type: "video",
      videoUrl: videoFacade.videoUrl,
      propertyName, reportId: report.id,
    });
  }

  // Narrative hook
  if (narrative?.openingHook) {
    blocks.push({
      type: "text_hook",
      text: narrative.openingHook,
      reportId: report.id,
    });
  }

  return blocks;
}

/* ── One card per report for the CTA grid ── */

export function reportsToGridCards(reports) {
  const cards = [];
  for (const report of reports) {
    const vis = report.results?.renovation_visualisation;
    if (!vis) continue;
    const listing = report.listing ?? {};
    const classification = report.results?.classification;
    const archetype = classification?.archetype;
    const costEstimate = report.results?.cost_estimate;

    /* Best image pair: prefer first exterior, fall back to first interior */
    const best = vis?.exteriors?.[0] ?? vis?.interiors?.[0];
    if (!best?.originalUrl || !best?.renovatedUrl) continue;

    const name = listing.address?.split(",")[0]?.trim() ?? "Property";
    const archetypeLabel = archetype?.displayName ?? "";
    const era = archetype?.era ?? "";
    const label = best.room ?? best.depicts ?? "Exterior";

    /* Cost envelope */
    const env = costEstimate?.totalEnvelope;
    const costLow = env ? Math.round((env.low ?? 0) / 1000) : 0;
    const costHigh = env ? Math.round((env.high ?? 0) / 1000) : 0;
    const costStr = costLow > 0 && costHigh > 0 ? `\u00A3${costLow}K\u2013\u00A3${costHigh}K` : "";

    /* Pick one observation from the classifier — proof Piega actually read the building */
    let observation = "";
    const classifiedImages = classification?.images ?? [];
    const bestDepicts = best.depicts ?? best.room ?? "";
    for (const ci of classifiedImages) {
      const obs = ci.classification?.observations ?? [];
      if (!obs.length) continue;
      /* Prefer observations from the same image subject */
      const d = ci.classification?.depicts ?? ci.classification?.room ?? "";
      if (d && bestDepicts && d.toLowerCase().includes(bestDepicts.toLowerCase().split("_")[0])) {
        observation = obs[0];
        break;
      }
      /* Otherwise take the first non-trivial one we find */
      if (!observation) observation = obs[0];
    }

    cards.push({
      originalUrl: best.originalUrl,
      renovatedUrl: best.renovatedUrl,
      label,
      name,
      archetypeLabel,
      era,
      costStr,
      observation,
      reportId: report.id,
      createdAt: report.created_at ?? null,
    });
  }
  return cards;
}

export const TEXT_BLOCKS = [
  {
    _key: "tb-scroll", variant: "confrontation",
    lines: ["EVERY SCROLL PAST A BAD PHOTO", "IS A BET THAT THE BUILDING BEHIND IT", "ISN\u2019T WORTH \u00A3150K MORE THAN IT LOOKS."],
    punchline: "Most people see dated kitchens and keep scrolling.\nWe see construction era, renovation scope, and a number.",
  },
  {
    _key: "tb-modernisation", variant: "time",
    number: "\u201CIN NEED OF MODERNISATION.\u201D",
    lines: ["The estate agent\u2019s way of saying: we don\u2019t know either.", "Piega reads the building \u2014 era, construction, condition \u2014", "and tells you what modernisation actually costs."],
  },
  {
    _key: "tb-surveyor", variant: "hook",
    text: "A surveyor costs \u00A3500. A viewing costs a Saturday.\nPiega doesn\u2019t replace either \u2014 it tells you which\nproperties are worth spending both on.",
  },
];
