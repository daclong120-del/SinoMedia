import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

interface CliOptions {
  apiKey: string;
  baseUrl: string;
  bodyFile?: string;
  command: "chat" | "health";
  endpoint?: string;
  inputFile?: string;
  instructions?: string;
  message?: string;
  model: string;
  outDir: string;
  timeoutMs: number;
}

interface SavedRun {
  request: {
    baseUrl: string;
    body: unknown;
    endpoint: string;
    hasApiKey: boolean;
    method: string;
    url: string;
  };
  response: {
    body: unknown;
    durationMs: number;
    headers: Record<string, string>;
    ok: boolean;
    outputText: string;
    status: number;
    statusText: string;
  };
}

const DEFAULT_BASE_URL = "http://localhost:8080";
const DEFAULT_ENDPOINT = "/responses";
const DEFAULT_MODEL = "gpt-4o-mini";

async function main(): Promise<void> {
  await loadDotEnv(".env");
  const options = parseOptions(process.argv.slice(2));

  if (options.command === "health") {
    await runHealthCheck(options);
    return;
  }

  await runChat(options);
}

async function loadDotEnv(filePath: string): Promise<void> {
  let raw = "";
  try {
    raw = await readFile(filePath, "utf8");
  } catch {
    return;
  }

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex <= 0) continue;
    const key = trimmed.slice(0, equalsIndex).trim();
    const value = unquoteEnvValue(trimmed.slice(equalsIndex + 1).trim());
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

async function runChat(options: CliOptions): Promise<void> {
  await mkdir(options.outDir, { recursive: true });

  const body = await buildRequestBody(options);
  const result = await callResponses(options, body);
  const outputText = extractOutputText(result.body);
  const saved: SavedRun = {
    request: {
      baseUrl: options.baseUrl,
      body,
      endpoint: result.endpoint,
      hasApiKey: Boolean(options.apiKey),
      method: "POST",
      url: result.url,
    },
    response: {
      body: result.body,
      durationMs: result.durationMs,
      headers: result.headers,
      ok: result.ok,
      outputText,
      status: result.status,
      statusText: result.statusText,
    },
  };

  const filePath = path.join(options.outDir, `responses-chat-${Date.now()}.json`);
  await writeFile(filePath, JSON.stringify(saved, null, 2), "utf8");

  console.log(`POST ${result.url} -> ${result.status} ${result.durationMs}ms`);
  console.log(`Saved: ${filePath}`);

  if (outputText) {
    console.log(outputText);
  } else {
    console.log(previewJson(result.body));
  }

  if (!result.ok) {
    process.exitCode = 1;
  }
}

async function runHealthCheck(options: CliOptions): Promise<void> {
  const url = joinUrl(options.baseUrl, options.endpoint || "/");
  const startedAt = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    const response = await fetch(url, {
      headers: buildHeaders(options.apiKey),
      method: "GET",
      signal: controller.signal,
    });
    const text = await response.text();
    console.log(`GET ${url} -> ${response.status} ${Date.now() - startedAt}ms`);
    console.log(previewText(text));
    if (!response.ok) {
      process.exitCode = 1;
    }
  } finally {
    clearTimeout(timer);
  }
}

async function buildRequestBody(options: CliOptions): Promise<unknown> {
  if (options.bodyFile) {
    const raw = await readFile(options.bodyFile, "utf8");
    return JSON.parse(raw) as unknown;
  }

  const input = options.inputFile ? await readFile(options.inputFile, "utf8") : options.message;
  if (!input || !input.trim()) {
    throw new Error("Missing message. Use --message \"hello\" or --input-file prompt.txt.");
  }

  return {
    model: options.model,
    input,
    ...(options.instructions ? { instructions: options.instructions } : {}),
  };
}

async function callResponses(
  options: CliOptions,
  body: unknown,
): Promise<{
  body: unknown;
  durationMs: number;
  endpoint: string;
  headers: Record<string, string>;
  ok: boolean;
  status: number;
  statusText: string;
  url: string;
}> {
  const endpointCandidates = options.endpoint
    ? [normalizeEndpoint(options.endpoint)]
    : [DEFAULT_ENDPOINT, "/v1/responses"];

  let lastResult:
    | {
        body: unknown;
        durationMs: number;
        endpoint: string;
        headers: Record<string, string>;
        ok: boolean;
        status: number;
        statusText: string;
        url: string;
      }
    | undefined;

  for (const endpoint of endpointCandidates) {
    const result = await postJson(options, endpoint, body);
    lastResult = result;
    if (result.status !== 404) {
      return result;
    }
  }

  return lastResult as NonNullable<typeof lastResult>;
}

async function postJson(options: CliOptions, endpoint: string, body: unknown) {
  const url = joinUrl(options.baseUrl, endpoint);
  const startedAt = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    const response = await fetch(url, {
      body: JSON.stringify(body),
      headers: buildHeaders(options.apiKey),
      method: "POST",
      signal: controller.signal,
    });
    const headers = headersToObject(response.headers);
    const text = await response.text();
    return {
      body: parseMaybeJson(text),
      durationMs: Date.now() - startedAt,
      endpoint,
      headers,
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      url,
    };
  } finally {
    clearTimeout(timer);
  }
}

function parseOptions(args: string[]): CliOptions {
  const command = args[0] === "health" ? "health" : "chat";
  const optionArgs = args[0] === "chat" || args[0] === "health" ? args.slice(1) : args;
  const options: CliOptions = {
    apiKey: process.env.RESPONSES_API_KEY || process.env.RESPONSE_API_KEY || process.env.OPENAI_API_KEY || "",
    baseUrl: process.env.RESPONSES_BASE_URL || process.env.RESPONSE_BASE_URL || DEFAULT_BASE_URL,
    command,
    endpoint: process.env.RESPONSES_ENDPOINT || undefined,
    model: process.env.RESPONSES_MODEL || DEFAULT_MODEL,
    outDir: "responses",
    timeoutMs: Number(process.env.RESPONSES_TIMEOUT_MS || 120000),
  };

  for (let index = 0; index < optionArgs.length; index += 1) {
    const arg = optionArgs[index];
    const readValue = (): string => {
      const value = optionArgs[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`Missing value for ${arg}`);
      }
      index += 1;
      return value;
    };

    switch (arg) {
      case "--api-key":
        options.apiKey = readValue();
        break;
      case "--base-url":
        options.baseUrl = readValue();
        break;
      case "--body-file":
        options.bodyFile = readValue();
        break;
      case "--endpoint":
        options.endpoint = readValue();
        break;
      case "--input-file":
        options.inputFile = readValue();
        break;
      case "--instructions":
        options.instructions = readValue();
        break;
      case "--message":
      case "-m":
        options.message = readValue();
        break;
      case "--model":
        options.model = readValue();
        break;
      case "--out":
        options.outDir = readValue();
        break;
      case "--timeout":
        options.timeoutMs = Number(readValue());
        break;
      case "--help":
      case "-h":
        printUsage();
        process.exit(0);
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }

  if (!Number.isFinite(options.timeoutMs) || options.timeoutMs < 1000) {
    throw new Error("--timeout must be at least 1000");
  }

  return options;
}

function buildHeaders(apiKey: string): Record<string, string> {
  return {
    "accept": "application/json",
    "content-type": "application/json",
    ...(apiKey ? { "authorization": `Bearer ${apiKey}` } : {}),
  };
}

function extractOutputText(body: unknown): string {
  if (!body || typeof body !== "object") {
    return typeof body === "string" ? body : "";
  }

  const record = body as Record<string, unknown>;
  if (typeof record.output_text === "string") {
    return record.output_text;
  }

  const output = Array.isArray(record.output) ? record.output : [];
  const parts: string[] = [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const itemRecord = item as Record<string, unknown>;
    collectText(itemRecord.content, parts);
    collectText(itemRecord.text, parts);
  }

  const choices = Array.isArray(record.choices) ? record.choices : [];
  for (const choice of choices) {
    if (!choice || typeof choice !== "object") continue;
    const choiceRecord = choice as Record<string, unknown>;
    const message = choiceRecord.message;
    if (message && typeof message === "object") {
      collectText((message as Record<string, unknown>).content, parts);
    }
  }

  return parts.join("\n").trim();
}

function collectText(value: unknown, parts: string[]): void {
  if (typeof value === "string") {
    parts.push(value);
    return;
  }
  if (!Array.isArray(value)) {
    return;
  }
  for (const contentItem of value) {
    if (typeof contentItem === "string") {
      parts.push(contentItem);
      continue;
    }
    if (!contentItem || typeof contentItem !== "object") continue;
    const contentRecord = contentItem as Record<string, unknown>;
    if (typeof contentRecord.text === "string") {
      parts.push(contentRecord.text);
    }
  }
}

function headersToObject(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

function parseMaybeJson(text: string): unknown {
  if (!text.trim()) {
    return null;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function joinUrl(baseUrl: string, endpoint: string): string {
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  return `${normalizedBase}${normalizeEndpoint(endpoint)}`;
}

function normalizeEndpoint(endpoint: string): string {
  return endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
}

function previewJson(value: unknown): string {
  return previewText(JSON.stringify(value, null, 2));
}

function previewText(text: string): string {
  const compact = text.replace(/\s+/g, " ").trim();
  return compact.length > 1200 ? `${compact.slice(0, 1200)}...` : compact;
}

function unquoteEnvValue(value: string): string {
  if (
    (value.startsWith("\"") && value.endsWith("\"")) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function formatError(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error);
  }

  const cause = (error as Error & { cause?: unknown }).cause;
  if (cause && typeof cause === "object") {
    const code = "code" in cause ? String((cause as { code?: unknown }).code) : "";
    const address = "address" in cause ? String((cause as { address?: unknown }).address) : "";
    const port = "port" in cause ? String((cause as { port?: unknown }).port) : "";
    const suffix = [code, address, port].filter(Boolean).join(" ");
    if (suffix) {
      return `${error.message} (${suffix})`;
    }
  }

  return error.message;
}

function printUsage(): void {
  console.log(`
Usage:
  npm run responses:chat -- --message "hello"
  npm run responses:chat -- --input-file prompt.txt
  npm run responses:chat -- --body-file request.json
  npm run responses:health

Environment:
  RESPONSES_BASE_URL   Default: http://localhost:8080
  RESPONSES_API_KEY    Optional bearer token for the Open Responses server
  RESPONSES_MODEL      Default: gpt-4o-mini
  RESPONSES_ENDPOINT   Default: /responses, falls back to /v1/responses on 404

Options:
  --base-url http://localhost:8080
  --api-key key
  --endpoint /responses
  --model openrouter/deepseek/deepseek-r1
  --message "hello"
  --instructions "You are concise."
  --input-file prompt.txt
  --body-file request.json
  --out responses
  --timeout 120000
`);
}

main().catch((error) => {
  console.error(formatError(error));
  process.exitCode = 1;
});
