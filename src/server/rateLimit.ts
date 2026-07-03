// 인스턴스 메모리 기반 고정 윈도우 레이트리밋.
// 서버리스 배포에서는 인스턴스별로 카운트되므로 완화 장치이지 완전한 방어는 아니다.
const MAX_TRACKED_CLIENTS = 10_000;

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

const buckets = new Map<string, RateLimitBucket>();

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

export function getClientKey(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');

  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  return request.headers.get('x-real-ip') ?? 'unknown';
}

export function checkRateLimit(scope: string, clientKey: string, options: RateLimitOptions): RateLimitResult {
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
