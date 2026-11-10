/**
 * Temporary illustrative photos for DEMO listings only.
 * They are NOT photos of real properties. Real photos are uploaded per listing from the host
 * panel (stored in the `photos` table / R2), which replaces these rows. Swap this list to change the demo set.
 */
export const DEMO_PHOTOS = [
  "https://images.pexels.com/photos/10471491/pexels-photo-10471491.jpeg?auto=compress&dpr=1&h=750&w=1260",
  "https://images.pexels.com/photos/7040696/pexels-photo-7040696.jpeg?auto=compress&dpr=1&h=750&w=1260",
  "https://images.pexels.com/photos/7195595/pexels-photo-7195595.jpeg?auto=compress&dpr=1&h=750&w=1260",
  "https://images.pexels.com/photos/11296222/pexels-photo-11296222.jpeg?auto=compress&dpr=1&h=750&w=1260",
] as const;

/** Photos for the n-th demo listing: same set, rotated so neighbouring cards differ. */
export function demoPhotosFor(index: number): string[] {
  return DEMO_PHOTOS.map((_, i) => DEMO_PHOTOS[(index + i) % DEMO_PHOTOS.length]);
}
