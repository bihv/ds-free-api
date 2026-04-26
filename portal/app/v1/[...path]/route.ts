import { NextRequest, NextResponse } from "next/server";
import { logRequest } from "@/lib/db";
import { getConfig } from "@/lib/config";

/**
 * Proxy all OpenAI-compatible requests to the upstream ds-free-api server
 * while logging stats to SQLite.
 */
async function proxyRequest(request: NextRequest, pathSegments: string[]): Promise<NextResponse> {
  const config = getConfig();
  const proxyPath = "/v1/" + pathSegments.join("/");
  const searchParams = request.nextUrl.search || "";
  const targetUrl = `${config.upstream_url}${proxyPath}${searchParams}`;
  const startTime = Date.now();

  let model = "";
  let stream = false;
  let bodyBytes: Uint8Array | null = null;

  // Parse request body to extract model info
  if (request.method === "POST") {
    try {
      const ab = await request.arrayBuffer();
      bodyBytes = new Uint8Array(ab);
      const bodyJson = JSON.parse(new TextDecoder().decode(bodyBytes));
      model = bodyJson.model || "";
      stream = !!bodyJson.stream;
    } catch {
      // Not JSON or parsing failed — still proxy it
    }
  }

  try {
    // Build headers, forwarding everything except host
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      if (key.toLowerCase() !== "host") {
        headers[key] = value;
      }
    });

    const fetchOptions: RequestInit = {
      method: request.method,
      headers,
    };

    if (bodyBytes) {
      fetchOptions.body = bodyBytes as unknown as BodyInit;
    }

    const upstreamResponse = await fetch(targetUrl, fetchOptions);
    const duration = Date.now() - startTime;

    // For streaming responses, we need to pass through the stream
    // and log after the fact
    if (stream && upstreamResponse.ok && upstreamResponse.body) {
      // Log the request immediately (we won't know final token counts for streaming)
      logRequest({
        method: request.method,
        path: proxyPath,
        model,
        stream: true,
        status_code: upstreamResponse.status,
        duration_ms: duration,
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
        error: "",
        account: upstreamResponse.headers.get("x-ds-account") || "",
      });

      // Pass through the stream
      const responseHeaders = new Headers();
      upstreamResponse.headers.forEach((value, key) => {
        responseHeaders.set(key, value);
      });

      return new NextResponse(upstreamResponse.body, {
        status: upstreamResponse.status,
        headers: responseHeaders,
      });
    }

    // Non-streaming: read the full response
    const responseBody = await upstreamResponse.arrayBuffer();
    const responseBytes = new Uint8Array(responseBody);

    // Try to parse token usage from response
    let promptTokens = 0;
    let completionTokens = 0;
    let totalTokens = 0;
    let error = "";

    try {
      const responseJson = JSON.parse(new TextDecoder().decode(responseBytes));
      if (responseJson.usage) {
        promptTokens = responseJson.usage.prompt_tokens || 0;
        completionTokens = responseJson.usage.completion_tokens || 0;
        totalTokens = responseJson.usage.total_tokens || 0;
      }
      if (responseJson.error) {
        error = typeof responseJson.error === "string"
          ? responseJson.error
          : responseJson.error.message || JSON.stringify(responseJson.error);
      }
    } catch {
      // Not JSON response
    }

    // Log the request
    logRequest({
      method: request.method,
      path: proxyPath,
      model,
      stream: false,
      status_code: upstreamResponse.status,
      duration_ms: Date.now() - startTime,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: totalTokens,
      error: upstreamResponse.status >= 400 ? error || `HTTP ${upstreamResponse.status}` : error,
      account: upstreamResponse.headers.get("x-ds-account") || "",
    });

    // Return the response
    const responseHeaders = new Headers();
    upstreamResponse.headers.forEach((value, key) => {
      responseHeaders.set(key, value);
    });

    return new NextResponse(responseBytes, {
      status: upstreamResponse.status,
      headers: responseHeaders,
    });
  } catch (err) {
    const duration = Date.now() - startTime;
    const errorMsg = err instanceof Error ? err.message : String(err);

    logRequest({
      method: request.method,
      path: proxyPath,
      model,
      stream,
      status_code: 502,
      duration_ms: duration,
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
      error: errorMsg,
      account: "",
    });

    return NextResponse.json(
      { error: { message: "Proxy error: " + errorMsg, type: "proxy_error" } },
      { status: 502 }
    );
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyRequest(request, path);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyRequest(request, path);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyRequest(request, path);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyRequest(request, path);
}
