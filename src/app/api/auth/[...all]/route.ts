import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth";

/**
 * Better Auth's catch-all, the one REST exception to the domain rule that reads
 * are routes and writes are commands. The auth system is built when a request
 * arrives rather than when this module is imported, so collecting page data for
 * a build never asks for a session secret.
 */
export const { GET, POST } = toNextJsHandler((request) =>
  getAuth().handler(request)
);
