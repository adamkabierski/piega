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

export const TEXT_BLOCKS = [
  {
    _key: "tb-cost", variant: "confrontation",
    lines: ["AN ARCHITECT CHARGES \u00A32,000.", "A SURVEYOR \u00A3500.", "A DESIGNER \u00A33,000."],
    punchline: "We did all three.\nFrom a Rightmove link.",
  },
  {
    _key: "tb-time", variant: "time",
    number: "90 SECONDS.",
    lines: ["From listing to renovation concept.", "Including the cost estimate", "your builder won\u2019t give you."],
  },
  {
    _key: "tb-hook", variant: "hook",
    text: "\u201CThe estate agent calls it \u2018characterful.\u2019\nThe surveyor would call it \u2018structural movement.\u2019\nWe call it Thursday.\u201D",
  },
];
