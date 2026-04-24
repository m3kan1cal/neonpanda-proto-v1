import type { APIGatewayProxyResultV2 } from "aws-lambda";
import { createErrorResponse } from "./api-helpers";

// Shared pagination parsing for list handlers.
// Keeps validation behavior and 400 error-body shape consistent with the
// canonical get-workouts handler so every paginated endpoint rejects bad
// input the same way.

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface PaginationParseSuccess {
  ok: true;
  params: PaginationParams;
}

export interface PaginationParseFailure {
  ok: false;
  response: APIGatewayProxyResultV2;
}

export type PaginationParseResult =
  | PaginationParseSuccess
  | PaginationParseFailure;

// Parses and validates `limit` (1-100) and `offset` (>=0) from query string
// parameters, returning an error response matching get-workouts on invalid
// input. Returning unset values (limit=undefined, offset=undefined) is
// deliberate: downstream helpers interpret an absent limit as "return the
// full list" to preserve backward compatibility with existing callers that
// never paginated.
export const parsePaginationParams = (
  queryParams: Record<string, string | undefined> | null | undefined,
): PaginationParseResult => {
  const params: PaginationParams = {};
  const query = queryParams || {};
  const { limit, offset } = query;

  if (limit !== undefined && limit !== null && limit !== "") {
    const limitNum = parseInt(limit as string, 10);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return {
        ok: false,
        response: createErrorResponse(
          400,
          "limit must be a number between 1 and 100",
        ),
      };
    }
    params.limit = limitNum;
  }

  if (offset !== undefined && offset !== null && offset !== "") {
    const offsetNum = parseInt(offset as string, 10);
    if (isNaN(offsetNum) || offsetNum < 0) {
      return {
        ok: false,
        response: createErrorResponse(
          400,
          "offset must be a non-negative number",
        ),
      };
    }
    params.offset = offsetNum;
  }

  return { ok: true, params };
};

// Applies an offset/limit slice to an already-filtered + sorted array. Kept
// here so in-memory paginated DynamoDB helpers (workouts, memories,
// conversations, programs, shared programs, reports) share a single
// implementation and offset semantics.
export const applyPaginationSlice = <T>(
  items: T[],
  params: PaginationParams,
): T[] => {
  const offset =
    typeof params.offset === "number" && params.offset > 0 ? params.offset : 0;
  const sliced = offset > 0 ? items.slice(offset) : items;
  if (typeof params.limit === "number" && params.limit > 0) {
    return sliced.slice(0, params.limit);
  }
  return sliced;
};
