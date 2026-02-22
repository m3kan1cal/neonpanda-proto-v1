import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import { logger } from "./logger";

const ssmClient = new SSMClient({});

const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry<T> {
  value: T;
  expiry: number;
}

const parameterCache = new Map<string, CacheEntry<string>>();

/**
 * Fetch a single SSM parameter value with in-memory caching.
 * Returns the string value, or the defaultValue if the parameter
 * is missing, empty, or the read fails.
 *
 * The cache persists across warm Lambda invocations (module-level).
 */
export async function getSsmParameter(
  paramPath: string,
  options?: { cacheTtlMs?: number; defaultValue?: string },
): Promise<string> {
  const ttl = options?.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
  const defaultValue = options?.defaultValue ?? "";

  const cached = parameterCache.get(paramPath);
  if (cached && Date.now() < cached.expiry) {
    return cached.value;
  }

  try {
    const result = await ssmClient.send(
      new GetParameterCommand({ Name: paramPath }),
    );
    const value = result.Parameter?.Value ?? defaultValue;
    parameterCache.set(paramPath, { value, expiry: Date.now() + ttl });
    return value;
  } catch (error) {
    logger.warn("Failed to read SSM parameter", {
      paramPath,
      error: error instanceof Error ? error.message : String(error),
    });
    // Return stale cache if available, otherwise the default value
    return cached?.value ?? defaultValue;
  }
}

/**
 * Fetch an SSM parameter and parse it as a comma-separated list.
 * Returns a Set of trimmed, non-empty strings.
 *
 * Useful for allow/deny lists stored as "userId1,userId2,userId3".
 */
export async function getSsmStringList(
  paramPath: string,
  options?: { cacheTtlMs?: number },
): Promise<Set<string>> {
  const raw = await getSsmParameter(paramPath, options);
  const items = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return new Set(items);
}
