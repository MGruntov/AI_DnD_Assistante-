/**
 * Decision matcher utility
 * 
 * Calls the backend /api/decisions/search endpoint to embed user prompts
 * and get semantically similar decisions ranked by cosine similarity.
 */

import { apiPostJson } from './api-client.js';

/**
 * Search for decisions matching user prompt
 * 
 * @param {string} baseUrl - Backend URL (from speech.js BACKEND_BASE_URL)
 * @param {string} prompt - User narrative prompt
 * @param {number} topK - Number of top results to return (default 10)
 * @returns {Promise<{ok: boolean, results: Array<{decisionId: string, similarity: number}>, totalDecisions?: number, error?: string}>}
 */
export async function searchDecisionsByPrompt(baseUrl, prompt, topK = 10) {
	if (!prompt || !String(prompt).trim()) {
		return {
			ok: false,
			results: [],
			error: 'Empty prompt',
		};
	}

	try {
		const result = await apiPostJson(baseUrl, '/api/decisions/search', {
			prompt: String(prompt).trim(),
			topK,
		});

		if (!result.ok) {
			console.warn('[decision-matcher] Search failed:', result.data);
			return {
				ok: false,
				results: [],
				error: result.data?.error || 'Search failed',
			};
		}

		return {
			ok: true,
			prompt: result.data?.prompt || prompt,
			results: result.data?.results || [],
			totalDecisions: result.data?.totalDecisions || 0,
			topK: result.data?.topK || topK,
		};
	} catch (e) {
		console.error('[decision-matcher] Error:', e);
		return {
			ok: false,
			results: [],
			error: e instanceof Error ? e.message : 'Unknown error',
		};
	}
}

/**
 * Cosine similarity between two embedding vectors (for client-side use)
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number} similarity score [0, 1]
 */
export function cosineSimilarity(a, b) {
	if (!a || !b || a.length !== b.length) return 0;

	let dotProduct = 0;
	let normA = 0;
	let normB = 0;

	for (let i = 0; i < a.length; i++) {
		dotProduct += a[i] * b[i];
		normA += a[i] * a[i];
		normB += b[i] * b[i];
	}

	const denominator = Math.sqrt(normA) * Math.sqrt(normB);
	if (denominator === 0) return 0;

	return dotProduct / denominator;
}
