// Public content contract. The Notion adapter is kept for rollback only.
import * as notion from "./notion-content";
import { contentEnv } from "./content-env";
import { publishedArticles, articleBySlug } from "./article-store";
export type * from "./notion-content";
export { getPlaylists, getCurrentPlaylist } from "./notion-content";
async function usesDatabase() {
  return (
    (process.env.NODE_ENV === "development" &&
      process.env.MUAC_LOCAL === "1") ||
    (await contentEnv()).CONTENT_BACKEND === "d1"
  );
}
export async function getArchive() {
  return (await usesDatabase()) ? publishedArticles() : notion.getArchive();
}
export async function getArchiveEntry(slug: string) {
  return (await usesDatabase())
    ? articleBySlug(slug)
    : notion.getArchiveEntry(slug);
}
export async function getFeaturedEntry() {
  const entries = await getArchive();
  return entries.find((e) => e.featured) ?? entries[0] ?? null;
}
export async function getProfiles() {
  return (await usesDatabase()) ? [] : notion.getProfiles();
}
export async function getProfileBySlug(slug: string) {
  return (await usesDatabase()) ? null : notion.getProfileBySlug(slug);
}
export async function getProfileEntries(slug: string) {
  return (await getArchive()).filter((e) =>
    e.profiles.some((p) => p.slug === slug),
  );
}
