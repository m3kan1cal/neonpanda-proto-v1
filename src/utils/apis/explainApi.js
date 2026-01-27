import { authenticatedFetch, getApiUrl } from "./apiConfig";

/**
 * Get an AI-generated explanation for a fitness term
 *
 * @param {string} term - The term to explain (e.g., "Barbell", "Deadlift", "Posterior Chain")
 * @param {"equipment" | "exercise" | "focus_area"} termType - The type of term
 * @returns {Promise<{term: string, termType: string, explanation: string, generatedAt: string}>}
 */
export const explainTerm = async (term, termType) => {
  const url = getApiUrl("/explain-term");

  const response = await authenticatedFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ term, termType }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to get explanation");
  }

  const data = await response.json();
  return data; // { term, termType, explanation, generatedAt }
};
