import { NextRequest, NextResponse } from "next/server";
import { verifyApiToken } from "@/lib/guards/token.guard";

function determineRequiredScopes(pathArray: string[], method: string): string[] | null {
  const pathStr = pathArray.join("/");
  
  if (method === "POST" && pathStr === "rpc/claim_next_crawler_task") return ["crawler:claim"];
  if (method === "POST" && pathStr === "crawler_logs") return ["crawler:write_logs"];
  
  // Tasks
  if (method === "GET" && pathStr === "crawler_tasks") return ["crawler:read_task"];
  if (method === "PATCH" && pathStr === "crawler_tasks") return ["crawler:update_task"];
  
  // Accounts
  if (method === "GET" && pathStr === "crawler_accounts") return ["crawler:read_accounts"];
  if (method === "PATCH" && pathStr === "crawler_accounts") return ["crawler:update_accounts"];
  if (method === "POST" && pathStr === "crawler_accounts") return ["crawler:write_accounts"];
  
  // Data ingestion
  if (method === "POST" && pathStr === "crawled_authors") return ["crawler:write_data"];
  if (method === "POST" && pathStr === "crawled_posts") return ["crawler:write_data"];
  if (method === "GET" && pathStr === "crawled_posts") return ["crawler:read_data"];
  if (method === "POST" && pathStr === "crawled_comments") return ["crawler:write_data"];
  
  // Metrics snapshots
  if (method === "POST" && pathStr === "post_metric_snapshots") return ["crawler:write_data"];
  if (method === "POST" && pathStr === "author_metric_snapshots") return ["crawler:write_data"];

  // Deny anything else
  return null;
}

async function handleProxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  const pathArray = resolvedParams.path || [];
  
  // 1. Verify token
  const requiredScopes = determineRequiredScopes(pathArray, req.method);
  
  if (!requiredScopes) {
    return NextResponse.json({ error: "Endpoint not allowed or unsupported method" }, { status: 403 });
  }

  const { token, error, status } = await verifyApiToken(req, requiredScopes);
  
  if (error || !token) {
    return NextResponse.json({ error }, { status });
  }

  // Basic security validation for structural integrity
  let parsedBody: any = null;
  const pathStr = pathArray.join("/");
  
  if (req.method !== "GET" && req.method !== "HEAD") {
    try {
      parsedBody = await req.json();
    } catch {
      // Ignore if body is not JSON or empty
    }
  }

  if (req.method === "PATCH" && pathStr === "crawler_tasks") {
    const idParam = req.nextUrl.searchParams.get("id");
    if (!idParam) {
      return NextResponse.json({ error: "Missing id parameter for update" }, { status: 400 });
    }
    const uuidRegex = /^eq\.[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (!uuidRegex.test(idParam)) {
      return NextResponse.json({ error: "Invalid id format. Expected eq.<uuid>" }, { status: 400 });
    }

    if (parsedBody && typeof parsedBody === "object" && !Array.isArray(parsedBody)) {
      const allowedKeys = ["status", "error_message", "updated_at", "metadata"];
      const keys = Object.keys(parsedBody);
      const hasDisallowedKeys = keys.some(key => !allowedKeys.includes(key));
      if (hasDisallowedKeys) {
        return NextResponse.json({ error: "Disallowed fields in body. Only status, error_message, updated_at, metadata are allowed." }, { status: 400 });
      }
    }
  }

  // 2. Prepare forward request to Supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  // Construct target URL including search params
  const targetUrl = new URL(`${supabaseUrl}/rest/v1/${pathArray.join("/")}`);
  req.nextUrl.searchParams.forEach((value, key) => {
    targetUrl.searchParams.append(key, value);
  });

  // Prepare headers, stripping out internal Next.js headers and replacing auth with Service Role Key
  const forwardHeaders = new Headers();
  req.headers.forEach((value, key) => {
    // Skip some headers
    if (["host", "connection", "content-length", "authorization", "x-api-key"].includes(key.toLowerCase())) {
      return;
    }
    forwardHeaders.set(key, value);
  });
  forwardHeaders.set("apikey", serviceRoleKey);
  forwardHeaders.set("Authorization", `Bearer ${serviceRoleKey}`);

  // Fetch from Supabase
  try {
    let bodyPayload;
    if (req.method !== "GET" && req.method !== "HEAD") {
      bodyPayload = parsedBody ? JSON.stringify(parsedBody) : req.body;
    }

    const response = await fetch(targetUrl.toString(), {
      method: req.method,
      headers: forwardHeaders,
      body: bodyPayload,
      // @ts-ignore - Next.js extended fetch options
      duplex: 'half' 
    });

    // Create a new response to stream back to the client
    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => {
      // Don't forward content-encoding to avoid double-compression issues
      if (key.toLowerCase() !== "content-encoding") {
        responseHeaders.set(key, value);
      }
    });

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (err: any) {
    console.error("Proxy error:", err);
    return NextResponse.json({ error: "Failed to connect to backend service" }, { status: 502 });
  }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const PATCH = handleProxy;
export const DELETE = handleProxy;
export const OPTIONS = handleProxy;
