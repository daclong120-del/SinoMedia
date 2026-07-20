import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";

interface EndpointCatalog {
  catalogVersion: number;
  format: string;
  exportedAt: string;
  endpoints: EndpointEntry[];
}

interface EndpointEntry {
  contentTypes?: Record<string, number>;
  count?: number;
  host: string;
  method: HttpMethod | string;
  pathname: string;
  queryParamNames?: string[];
  resourceType?: string;
  sampleUrls?: string[];
  scheme?: string;
  statusCodes?: Record<string, number>;
}

interface BrowserCookie {
  domain: string;
  name: string;
  value: string;
  path?: string;
  secure?: boolean;
  expirationDate?: number;
}

interface CliOptions {
  bodyFile?: string;
  catalog: string;
  concurrency: number;
  cookies?: string;
  host?: string;
  includePost: boolean;
  limit: number;
  message?: string;
  method?: string;
  outDir: string;
  path?: string;
  timeoutMs: number;
  yes: boolean;
}

interface FetchResult {
  bodyFile?: string;
  contentType: string | null;
  durationMs: number;
  error?: string;
  method: string;
  ok: boolean;
  responseBytes?: number;
  status?: number;
  url: string;
}

const DEFAULT_HEADERS = {
  "accept": "application/json, text/plain, */*",
  "accept-language": "vi,en-US;q=0.9,en;q=0.8",
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
};

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);
  const options = parseOptions(args);
  const catalog = await loadJson<EndpointCatalog>(options.catalog);

  if (command === "list") {
    const endpoints = selectEndpoints(catalog.endpoints, { ...options, includePost: true });
    printEndpointList(endpoints, catalog);
    return;
  }

  if (command === "run") {
    const endpoints = selectEndpoints(catalog.endpoints, options);
    await runEndpoints(endpoints, options);
    return;
  }

  printUsage();
  process.exitCode = 1;
}

function parseOptions(args: string[]): CliOptions {
  const options: CliOptions = {
    catalog: "api-finder-raw.json",
    concurrency: 2,
    includePost: false,
    limit: 10,
    outDir: "responses",
    timeoutMs: 15000,
    yes: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const readValue = (): string => {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`Missing value for ${arg}`);
      }
      index += 1;
      return value;
    };

    switch (arg) {
      case "--catalog":
        options.catalog = readValue();
        break;
      case "--message":
      case "-m":
        options.message = readValue();
        break;
      case "--cookies":
        options.cookies = readValue();
        break;
      case "--host":
        options.host = readValue();
        break;
      case "--path":
        options.path = readValue();
        break;
      case "--method":
        options.method = readValue().toUpperCase();
        break;
      case "--limit":
        options.limit = Number(readValue());
        break;
      case "--concurrency":
        options.concurrency = Number(readValue());
        break;
      case "--timeout":
        options.timeoutMs = Number(readValue());
        break;
      case "--out":
        options.outDir = readValue();
        break;
      case "--body-file":
        options.bodyFile = readValue();
        break;
      case "--include-post":
        options.includePost = true;
        break;
      case "--yes":
        options.yes = true;
        break;
      case "--help":
      case "-h":
        printUsage();
        process.exit(0);
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }

  if (!Number.isFinite(options.limit) || options.limit < 1) {
    throw new Error("--limit must be a positive number");
  }
  if (!Number.isFinite(options.concurrency) || options.concurrency < 1) {
    throw new Error("--concurrency must be a positive number");
  }
  if (!Number.isFinite(options.timeoutMs) || options.timeoutMs < 1000) {
    throw new Error("--timeout must be at least 1000");
  }

  return options;
}

async function loadJson<T>(filePath: string): Promise<T> {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
}

function selectEndpoints(endpoints: EndpointEntry[], options: CliOptions): EndpointEntry[] {
  return endpoints
    .filter((endpoint) => {
      if (options.host && endpoint.host !== options.host) return false;
      if (options.path) {
        const hasExact = endpoints.some((e) => e.pathname === options.path);
        if (hasExact) {
          if (endpoint.pathname !== options.path) return false;
        } else {
          if (!endpoint.pathname.includes(options.path)) return false;
        }
      }
      if (options.method && endpoint.method.toUpperCase() !== options.method) return false;
      if (!options.includePost && !["GET", "HEAD"].includes(endpoint.method.toUpperCase())) return false;
      return true;
    })
    .slice(0, options.limit);
}

function printEndpointList(endpoints: EndpointEntry[], catalog: EndpointCatalog): void {
  console.log(`Catalog: ${catalog.format} v${catalog.catalogVersion}, exportedAt=${catalog.exportedAt}`);
  console.log(`Matched endpoints: ${endpoints.length}`);
  for (const [index, endpoint] of endpoints.entries()) {
    const statuses = Object.keys(endpoint.statusCodes ?? {}).join(",") || "-";
    const contentTypes = Object.keys(endpoint.contentTypes ?? {}).join(",") || "-";
    console.log(
      `${index + 1}. ${endpoint.method.toUpperCase()} ${endpoint.host}${endpoint.pathname} ` +
        `(hits=${endpoint.count ?? 0}, status=${statuses}, type=${contentTypes})`,
    );
  }
}

async function runEndpoints(endpoints: EndpointEntry[], options: CliOptions): Promise<void> {
  if (endpoints.length === 0) {
    console.log("No endpoints matched.");
    return;
  }

  const hasNonGet = endpoints.some((endpoint) => !["GET", "HEAD"].includes(endpoint.method.toUpperCase()));
  if (hasNonGet && (!options.includePost || !options.yes)) {
    throw new Error("Non-GET requests require both --include-post and --yes.");
  }

  await mkdir(options.outDir, { recursive: true });
  const cookies = options.cookies ? await loadJson<BrowserCookie[]>(options.cookies) : [];
  const body = options.bodyFile ? await readFile(options.bodyFile, "utf8") : undefined;
  
  let sessionToken: string | undefined;
  try {
    const rawSession = await readFile("session.json", "utf8");
    const parsedSession = JSON.parse(rawSession);
    sessionToken = parsedSession.accessToken;
    if (sessionToken) {
      console.log("Loaded active session token from session.json.");
    }
  } catch {}

  const queue = [...endpoints];
  const results: FetchResult[] = [];

  async function worker(): Promise<void> {
    while (queue.length > 0) {
      const endpoint = queue.shift();
      if (!endpoint) continue;
      const result = await callEndpoint(endpoint, cookies, body, options, sessionToken);
      results.push(result);
      const status = result.status ? String(result.status) : "ERR";
      console.log(`${result.method} ${redactUrl(result.url)} -> ${status} ${result.durationMs}ms`);

      if (result.ok && result.bodyFile) {
        try {
          const content = await readFile(result.bodyFile, "utf8");
          console.log(`\n--- Response Content (${result.contentType}) ---`);
          if (result.contentType?.includes("text/event-stream")) {
            const lines = content.split("\n");
            let finalText = "";
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const dataStr = line.slice(6).trim();
                if (dataStr === "[DONE]") break;
                try {
                  const parsed = JSON.parse(dataStr);
                  const part = parsed.message?.content?.parts?.[0];
                  if (part) {
                    finalText = part;
                  }
                } catch {}
              }
            }
            if (finalText) {
              console.log(finalText);
            } else {
              console.log(content.slice(0, 1000));
            }
          } else {
            try {
              const parsed = JSON.parse(content);
              console.log(JSON.stringify(parsed, null, 2));
            } catch {
              console.log(content.slice(0, 1000));
            }
          }
          console.log("-----------------------------------------\n");
        } catch {}
      }
    }
  }

  const workers = Array.from({ length: Math.min(options.concurrency, endpoints.length) }, () => worker());
  await Promise.all(workers);

  const summaryPath = path.join(options.outDir, `summary-${Date.now()}.json`);
  await writeFile(summaryPath, JSON.stringify(results, null, 2), "utf8");
  console.log(`Saved summary: ${summaryPath}`);
}

async function callEndpoint(
  endpoint: EndpointEntry,
  cookies: BrowserCookie[],
  body: string | undefined,
  options: CliOptions,
  sessionToken?: string,
): Promise<FetchResult> {
  const startedAt = Date.now();
  const url = endpoint.sampleUrls?.[0] ?? `${endpoint.scheme ?? "https"}://${endpoint.host}${endpoint.pathname}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    const method = endpoint.method.toUpperCase();
    let finalBody = body;
    if (options.message && method === "POST" && endpoint.pathname.includes("/conversation")) {
      const messageId = crypto.randomUUID();
      const parentMessageId = crypto.randomUUID();
      finalBody = JSON.stringify({
        action: "next",
        messages: [
          {
            id: messageId,
            author: {
              role: "user"
            },
            content: {
              content_type: "text",
              parts: [options.message]
            },
            metadata: {}
          }
        ],
        parent_message_id: parentMessageId,
        model: "auto",
        timezone_offset_min: -420,
        suggestions: [],
        history_and_training_disabled: false,
        conversation_mode: {
          kind: "primary_assistant"
        },
        force_paragen: false,
        force_paragen_model_slug: "",
        force_nulligen: false,
        force_rate_limit: false
      });
    }

    let conduitToken: string | undefined;
    if (method === "POST" && endpoint.pathname === "/backend-api/f/conversation") {
      console.log("Calling /backend-api/f/conversation/prepare to get conduit token...");
      const prepareUrl = `${endpoint.scheme ?? "https"}://${endpoint.host}/backend-api/f/conversation/prepare`;
      const prepareHeaders = buildHeaders(
        { ...endpoint, pathname: "/backend-api/f/conversation/prepare" },
        cookies,
        "POST",
        undefined,
        sessionToken
      );
      prepareHeaders["x-conduit-token"] = "no-token";
      
      try {
        const prepareRes = await fetch(prepareUrl, {
          method: "POST",
          headers: prepareHeaders,
          body: finalBody ?? "{}",
        });
        if (prepareRes.ok) {
          const prepareJson: any = await prepareRes.json();
          conduitToken = prepareJson.conduit_token;
          console.log(`Acquired conduit token successfully: ${conduitToken?.slice(0, 20)}...`);
        } else {
          console.warn(`Prepare request failed with status: ${prepareRes.status}`);
          const text = await prepareRes.text();
          console.warn("Prepare error response:", text);
        }
      } catch (prepareErr) {
        console.warn("Failed to call prepare endpoint:", (prepareErr as Error).message);
      }
    }

    const headers = buildHeaders(endpoint, cookies, method, finalBody, sessionToken, conduitToken);
    const response = await fetch(url, {
      body: shouldSendBody(method) ? finalBody ?? "{}" : undefined,
      headers,
      method,
      signal: controller.signal,
    });
    const bytes = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get("content-type");
    const bodyPath = path.join(options.outDir, `${Date.now()}-${safeFileName(endpoint.host + endpoint.pathname)}.body`);
    await writeFile(bodyPath, bytes);

    return {
      bodyFile: bodyPath,
      contentType,
      durationMs: Date.now() - startedAt,
      method,
      ok: response.ok,
      responseBytes: bytes.byteLength,
      status: response.status,
      url,
    };
  } catch (error) {
    return {
      contentType: null,
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
      method: endpoint.method.toUpperCase(),
      ok: false,
      url,
    };
  } finally {
    clearTimeout(timer);
  }
}

function findCookieValue(cookies: BrowserCookie[], host: string, name: string): string | undefined {
  const nowSeconds = Date.now() / 1000;
  const match = cookies.find((cookie) => {
    const domain = cookie.domain.startsWith(".") ? cookie.domain.slice(1) : cookie.domain;
    const domainMatches = host === domain || host.endsWith(`.${domain}`);
    const isExpired = cookie.expirationDate !== undefined && cookie.expirationDate <= nowSeconds;
    return domainMatches && !isExpired && cookie.name === name;
  });
  return match?.value;
}

function buildHeaders(
  endpoint: EndpointEntry,
  cookies: BrowserCookie[],
  method: string,
  body: string | undefined,
  sessionToken?: string,
  conduitToken?: string,
): Record<string, string> {
  const headers: Record<string, string> = {
    ...DEFAULT_HEADERS,
    "referer": `${endpoint.scheme ?? "https"}://${endpoint.host}/`,
  };
  const cookieHeader = buildCookieHeader(cookies, endpoint.host);
  if (cookieHeader) {
    headers.cookie = cookieHeader;
  }
  if (endpoint.host.endsWith("chatgpt.com")) {
    const token = sessionToken || findCookieValue(cookies, endpoint.host, "__Secure-next-auth.session-token");
    if (token) {
      headers.authorization = `Bearer ${token}`;
    }
    const deviceId = findCookieValue(cookies, endpoint.host, "oai-did");
    if (deviceId) {
      headers["oai-device-id"] = deviceId;
    }
    if (conduitToken) {
      headers["x-conduit-token"] = conduitToken;
    }
  }
  if (shouldSendBody(method)) {
    headers["content-type"] = inferContentType(endpoint, body);
  }
  return headers;
}

function buildCookieHeader(cookies: BrowserCookie[], host: string): string {
  const nowSeconds = Date.now() / 1000;
  return cookies
    .filter((cookie) => {
      const domain = cookie.domain.startsWith(".") ? cookie.domain.slice(1) : cookie.domain;
      const domainMatches = host === domain || host.endsWith(`.${domain}`);
      const isExpired = cookie.expirationDate !== undefined && cookie.expirationDate <= nowSeconds;
      return domainMatches && !isExpired;
    })
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
}

function inferContentType(endpoint: EndpointEntry, body: string | undefined): string {
  if (body) {
    const trimmed = body.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      return "application/json";
    }
  }
  const catalogType = Object.keys(endpoint.contentTypes ?? {})[0];
  return catalogType && catalogType !== "text/event-stream" ? catalogType : "application/json";
}

function shouldSendBody(method: string): boolean {
  return ["POST", "PUT", "PATCH"].includes(method);
}

function safeFileName(input: string): string {
  return input.replace(/[^a-z0-9._-]+/gi, "_").replace(/^_+|_+$/g, "").slice(0, 120) || "response";
}

function redactUrl(input: string): string {
  const sensitiveParams = new Set(["token", "access_token", "refresh_token", "msToken", "verifyFp", "fp", "uifid", "a_bogus"]);
  try {
    const url = new URL(input);
    for (const key of sensitiveParams) {
      if (url.searchParams.has(key)) {
        url.searchParams.set(key, "***");
      }
    }
    return url.toString();
  } catch {
    return input;
  }
}

function printUsage(): void {
  console.log(`
Usage:
  npm run list -- [filters]
  npm run run -- [filters] [options]

Filters:
  --host chatgpt.com
  --path /backend-api/conversations
  --method GET
  --limit 10

Options:
  --catalog api-finder-raw.json
  --cookies cookie.json
  --out responses
  --concurrency 2
  --timeout 15000
  --body-file request-body.json
  --message "hello"
  --include-post --yes
`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
