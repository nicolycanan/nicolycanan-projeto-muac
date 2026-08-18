declare module './.open-next/server-functions/default/handler.mjs' {
  export function handler(reqOrResp: any, env: any, ctx: any, signal?: any): Promise<Response>;
}

declare module './.open-next/middleware/handler.mjs' {
  export function handler(request: Request, env: any, ctx: any): Promise<any>;
}
