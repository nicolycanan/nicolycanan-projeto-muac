import { contentEnv } from "@/lib/content-env";
export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^[a-f0-9-]{36}$/.test(id)) return new Response(null, { status: 404 });
  const env = await contentEnv();
  const object = await env.muac_media.getWithMetadata<{
    contentType: string;
    sha256: string;
  }>(`images/${id}`, { type: "arrayBuffer", cacheTtl: 60 });
  if (!object.value || !object.metadata)
    return new Response(null, {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  const headers = {
    "Content-Type": object.metadata.contentType,
    "Cache-Control": "public, max-age=31536000, immutable",
    ETag: `"${object.metadata.sha256}"`,
    "X-Content-Type-Options": "nosniff",
  };
  if (request.headers.get("if-none-match") === headers.ETag)
    return new Response(null, { status: 304, headers });
  return new Response(object.value, { headers });
}
