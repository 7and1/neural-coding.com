import type { Context } from "hono";
import type { Env } from "../env";

export function requireAdmin(c: Context<{ Bindings: Env }>): Response | null {
  const expected = c.env.ADMIN_TOKEN;
  if (!expected) return new Response("ADMIN_TOKEN not configured", { status: 500 });

  const header = c.req.header("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
  if (!token || token !== expected) return new Response("Unauthorized", { status: 401 });
  return null;
}

