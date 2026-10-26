// Local browser regression fixture: simulate an unavailable image optimizer.
// Originals and the application still come from the local development server.
import http from "node:http";
import net from "node:net";
const target = "http://127.0.0.1:3000";
const server = http.createServer(async (request, response) => {
  if (request.url?.startsWith("/_next/image")) {
    response.writeHead(404, { "Cache-Control": "no-store" });
    response.end("Simulated image optimizer failure");
    return;
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405);
    response.end();
    return;
  }
  try {
    const upstream = await fetch(new URL(request.url, target), {
      redirect: "manual",
    });
    const headers = Object.fromEntries(upstream.headers);
    delete headers["content-encoding"];
    delete headers["content-length"];
    response.writeHead(upstream.status, headers);
    response.end(Buffer.from(await upstream.arrayBuffer()));
  } catch {
    response.writeHead(502);
    response.end("Local app unavailable");
  }
});
server.on("upgrade", (request, socket, head) => {
  const upstream = net.connect(3000, "127.0.0.1", () => {
    const headers = Object.entries(request.headers).map(([key,value]) => `${key}: ${value}`).join("\r\n");
    upstream.write(`${request.method} ${request.url} HTTP/1.1\r\n${headers}\r\n\r\n`);
    if(head.length) upstream.write(head);
    socket.pipe(upstream);
    upstream.pipe(socket);
  });
  socket.on("error", () => upstream.destroy());
  upstream.on("error", () => socket.destroy());
});
server.listen(3001, "127.0.0.1", () =>
  console.log("Fallback regression fixture: http://127.0.0.1:3001/archive"),
);
