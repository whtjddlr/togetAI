// Upstash Redis가 설정되면 분산 fixed-window를 사용하고, 없거나 실패하면 인스턴스 메모리로 fallback한다.
// 인메모리 fallback은 서버리스 인스턴스별로 카운트되므로 완화 장치이지 완전한 방어는 아니다.
const MAX_TRACKED_CLIENTS = 10_000;
const UPSTASH_REQUEST_TIMEOUT_MS = 2_000;

type RateLimitBucket = {
  windowStartMs: number;
  count: number;
};

type RateLimitOptions = {
  limit: number;
  windowMs: number;
};

type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

type UpstashRedisConfig = {
  url: string;
  token: string;
};

type UpstashPipelineResult = {
  result?: unknown;
  error?: string;
};

const buckets = new Map<string, RateLimitBucket>();

function getUpstashRedisConfig(): UpstashRedisConfig | undefined {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (!url || !token) {
    return undefined;
  }

  return {
    url: url.replace(/\/+$/, ''),
    token,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isUpstashPipelineResult(value: unknown): value is UpstashPipelineResult {
  return isRecord(value) && (value.error === undefined || typeof value.error === 'string');
}

function isUpstashPipelineResponse(value: unknown): value is UpstashPipelineResult[] {
  return Array.isArray(value) && value.every(isUpstashPipelineResult);
}

function readNumericResult(value: unknown, command: string): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  throw new Error(`Unexpected Upstash ${command} result.`);
}

function pruneExpiredBuckets(now: number, windowMs: number) {
  if (buckets.size < MAX_TRACKED_CLIENTS) {
    return;
  }

  for (const [key, bucket] of buckets) {
    if (now - bucket.windowStartMs >= windowMs) {
      buckets.delete(key);
    }
  }
}

export function getClientKey(request: Request, userId?: string): string {
  const normalizedUserId = userId?.trim();

  if (normalizedUserId) {
    return `user:${normalizedUserId}`;
  }

  const forwardedFor = request.headers.get('x-forwarded-for');

  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  // 프록시 IP가 없으면 scope별 unknown으로 묶이는 한계가 있다. Phase 1 auth에서 인증 기반 키로 보완한다.
  return request.headers.get('x-real-ip') ?? 'unknown';
}

function checkMemoryRateLimit(scope: string, clientKey: string, options: RateLimitOptions): RateLimitResult {
  const key = `${scope}:${clientKey}`;
  const now = Date.now();
  const bucket = buckets.get(key);

  pruneExpiredBuckets(now, options.windowMs);

  if (!bucket || now - bucket.windowStartMs >= options.windowMs) {
    buckets.set(key, { windowStartMs: now, count: 1 });
    return { allowed: true };
  }

  if (bucket.count >= options.limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.windowStartMs + options.windowMs - now) / 1000)),
    };
  }

  bucket.count += 1;
  return { allowed: true };
}

async function checkUpstashRateLimit(
  scope: string,
  clientKey: string,
  options: RateLimitOptions,
  config: UpstashRedisConfig,
): Promise<RateLimitResult> {
  const windowSeconds = Math.max(1, Math.ceil(options.windowMs / 1000));
  const key = `ratelimit:${scope}:${clientKey}`;
  const response = await fetch(`${config.url}/pipeline`, {
    method: 'POST',
    signal: AbortSignal.timeout(UPSTASH_REQUEST_TIMEOUT_MS),
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([
      ['INCR', key],
      ['EXPIRE', key, windowSeconds, 'NX'],
      ['TTL', key],
    ]),
  });

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(`Upstash pipeline failed with ${response.status}: ${errorText.slice(0, 300)}`);
  }

  const responseBody: unknown = await response.json();

  if (!isUpstashPipelineResponse(responseBody) || responseBody.length !== 3) {
    throw new Error('Unexpected Upstash pipeline response shape.');
  }

  const commandError = responseBody.find((item) => typeof item.error === 'string' && item.error.trim());

  if (commandError?.error) {
    throw new Error(`Upstash command failed: ${commandError.error}`);
  }

  const count = readNumericResult(responseBody[0].result, 'INCR');
  const ttl = readNumericResult(responseBody[2].result, 'TTL');

  if (!Number.isInteger(count) || count < 1) {
    throw new Error('Unexpected Upstash INCR count.');
  }

  if (!Number.isInteger(ttl)) {
    throw new Error('Unexpected Upstash TTL value.');
  }

  if (ttl < 0) {
    // TTL이 없으면 Redis 키가 영구 누적될 수 있으므로 fail-open fallback으로 보낸다.
    throw new Error('Upstash rate limit key is missing TTL.');
  }

  if (count <= options.limit) {
    return { allowed: true };
  }

  return {
    allowed: false,
    retryAfterSeconds: Math.max(1, ttl),
  };
}

export async function checkRateLimit(
  scope: string,
  clientKey: string,
  options: RateLimitOptions,
): Promise<RateLimitResult> {
  const upstashConfig = getUpstashRedisConfig();

  if (!upstashConfig) {
    return checkMemoryRateLimit(scope, clientKey, options);
  }

  try {
    return await checkUpstashRateLimit(scope, clientKey, options, upstashConfig);
  } catch (error) {
    console.error('[rateLimit] upstash failed, falling back to memory:', error);

    return checkMemoryRateLimit(scope, clientKey, options);
  }
}
