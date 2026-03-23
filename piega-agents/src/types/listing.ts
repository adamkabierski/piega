/**
 * Types for parsed listing data from Chrome extension
 * and enriched area intelligence from backend APIs
 */

export interface ParsedListing {
  listingId: string;
  portal: "rightmove" | "zoopla";
  address: string;
  postcode: string | null;
  askingPrice: number;
  priceCurrency: string;
  priceDisplay: string;
  addedOrReduced: string | null; // e.g. "Reduced on 21/03/2026"
  propertyType: string; // e.g. "Semi-Detached Bungalow"
  tenure: string | null; // "FREEHOLD" | "LEASEHOLD" | null
  bedrooms: number;
  bathrooms: number;
  description: string; // full text description from listing
  latitude: number;
  longitude: number;
  imageCount: number;
  photos: Array<{
    url: string;
    caption: string; // often just "Photo 1", "Photo 2" etc.
  }>;
  floorplans: Array<{
    url: string;
    thumbnail: string;
  }>;
  agent: string; // e.g. "Eric Lloyd & Co, Paignton"
  _parsedAt: string; // ISO timestamp
  _source: string;
}

export interface EnrichedAreaData {
  imd: {
    decile: number; // 1-10 (1 = most deprived)
    rank: number;
    lsoa: string;
  } | null;
  flood: {
    zone: 1 | 2 | 3; // 1 = low, 3 = high
    description: string;
  } | null;
  crime: {
    totalIncidents: number;
    month: string;
    breakdown: Record<string, number>; // category → count
  } | null;
  boundary: {
    polygon: GeoJSON.Polygon | null;
    areaM2: number | null;
  } | null;
  // TODO: not yet implemented
  schools: Array<{
    name: string;
    type: string;
    distance: number;
    rating: string;
  }> | null;
  transport: Array<{
    name: string;
    type: string; // "rail" | "tube" | "bus"
    distance: number;
  }> | null;
  comparableSales: Array<{
    address: string;
    price: number;
    date: string;
    propertyType: string;
  }> | null;
}

// GeoJSON namespace for type compatibility
declare namespace GeoJSON {
  interface Polygon {
    type: "Polygon";
    coordinates: number[][][];
  }
}
