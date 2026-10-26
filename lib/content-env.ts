import { getCloudflareContext } from "@opennextjs/cloudflare";
export type ContentEnv = {
  muac_content: D1Database;
  muac_media: KVNamespace;
  CONTENT_BACKEND?: string;
  ACCESS_TEAM_DOMAIN: string;
  ACCESS_AUD: string;
};
export async function contentEnv(): Promise<ContentEnv> {
  const { env } = await getCloudflareContext({ async: true });
  return env as unknown as ContentEnv;
}
