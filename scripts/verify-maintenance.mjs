import assert from "node:assert/strict";

const origin = "https://muac.muaclife.workers.dev";
for (const path of [
  "/",
  "/archive",
  "/archive/001",
  "/about",
  "/radio",
  "/gallery",
  "/sitemap.xml",
]) {
  const response = await fetch(origin + path);
  assert.equal(response.status, 503, path);
  assert.match(await response.text(), /uma pausa<br>no acervo/);
  assert.equal(response.headers.get("retry-after"), "300");
  assert.match(response.headers.get("cache-control"), /no-store/);
}
for (const font of ["schoolbell", "space-grotesk", "work-sans"]) {
  const response = await fetch(`${origin}/maintenance/fonts/${font}.woff2`);
  assert.equal(response.status, 200);
  assert.ok((await response.arrayBuffer()).byteLength > 1000);
}
for (const path of [
  "/dashboard/articles",
  "/dashboard/api/articles",
  "/api/analytics/stats",
  "/api/analytics/logs",
]) {
  const response = await fetch(origin + path, { redirect: "manual" });
  assert.equal(response.status, 302);
  assert.ok(
    response.headers.get("location")?.includes(".cloudflareaccess.com/"),
  );
}
const event = await fetch(origin + "/api/analytics", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ event: "pageview", path: "/" }),
});
assert.equal(event.status, 204);
console.log(
  "PASS: public pages paused; MUAC fonts available; dashboard protected; maintenance visits bypass analytics.",
);
