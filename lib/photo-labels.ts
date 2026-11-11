import type { Dict } from "./i18n";

/** Plain helpers shared by server pages and client components (no server-only imports). */
export function photoLabels(t: Dict) {
  return {
    pick: t.host.pickPhotos, hint: t.host.dropHint, limits: t.host.uploadHint, selected: t.host.selectedPhotos, remove: t.host.removeSelected,
    cover: t.host.cover, earlier: t.host.moveEarlier, later: t.host.moveLater, badType: t.host.badType, tooBig: t.host.tooBig, tooMany: t.host.tooMany,
  };
}

export function typeLabel(t: Dict, type: string): string {
  return ({ apartment: t.listing.typeApartment, villa: t.listing.typeVilla, loft: t.listing.typeLoft, studio: t.listing.typeStudio } as Record<string, string>)[type] ?? type;
}
