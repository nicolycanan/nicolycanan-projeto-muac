import { imageSize } from "image-size";
import { requireAdmin, adminFailure, AdminError } from "@/lib/admin-auth";
import { contentEnv } from "@/lib/content-env";
export const dynamic = "force-dynamic";
const MAX = 8 * 1024 * 1024;
export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    if (Number(request.headers.get("content-length") ?? 0) > MAX + 100000)
      throw new AdminError("Envie imagens de até 8 MB.", 413);
    const form = await request.formData(),
      file = form.get("file");
    if (!(file instanceof File) || !file.size || file.size > MAX)
      throw new AdminError("Envie uma imagem de até 8 MB.", 400);
    const bytes = new Uint8Array(await file.arrayBuffer());
    let dimensions: ReturnType<typeof imageSize>;
    try {
      dimensions = imageSize(bytes);
    } catch {
      throw new AdminError("Arquivo de imagem inválido.", 400);
    }
    const formats: Record<string, string> = {
      jpg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      gif: "image/gif",
    };
    const contentType = formats[dimensions.type ?? ""];
    if (
      !contentType ||
      !dimensions.width ||
      !dimensions.height ||
      dimensions.width * dimensions.height > 60000000
    )
      throw new AdminError(
        "Use PNG, JPG, WebP ou GIF com até 60 megapixels.",
        400,
      );
    const sha256 = Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
      (b) => b.toString(16).padStart(2, "0"),
    ).join("");
    const id = crypto.randomUUID(),
      key = `images/${id}`;
    const env = await contentEnv();
    await env.muac_media.put(key, bytes, { metadata: { contentType, sha256 } });
    await env.muac_content
      .prepare(
        "INSERT INTO media(id,storage_key,original_name,content_type,size,sha256,width,height,created_at) VALUES(?,?,?,?,?,?,?,?,?)",
      )
      .bind(
        id,
        key,
        file.name.slice(0, 200),
        contentType,
        file.size,
        sha256,
        dimensions.width,
        dimensions.height,
        new Date().toISOString(),
      )
      .run();
    return Response.json(
      {
        id,
        url: `/media/${id}`,
        width: dimensions.width,
        height: dimensions.height,
        name: file.name,
      },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return adminFailure(e);
  }
}
