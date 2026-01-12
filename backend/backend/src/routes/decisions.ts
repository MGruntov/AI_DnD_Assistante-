/**
 * Decision search endpoint for semantic matching
 * 
 * Accepts user narrative prompt and:
 * 1. Embeds it using Cloudflare Workers AI (text-embeddings)
 * 2. Computes cosine similarity against pre-computed decision embeddings
 * 3. Returns top-k similar decisions with metadata
 */

import { Hono } from 'hono';
import type { App } from '../appRoutes';

// Pre-loaded decision embeddings
let decisionEmbeddings: Record<string, number[]> = {};
let embeddingsLoaded = false;

/**
 * Load pre-computed decision embeddings
 */
async function loadDecisionEmbeddings(requestUrl: string) {
	if (embeddingsLoaded) return decisionEmbeddings;
	
	try {
		// Get the origin from the current request to work with any backend
		const origin = new URL(requestUrl).origin;
		
		// In Cloudflare Workers, assets are served at the root
		let response = await fetch(new URL('/decision_embeddings.json', origin));
		
		if (!response.ok) {
			// Fallback: try relative
			response = await fetch('./decision_embeddings.json');
		}
		
		if (response.ok) {
			const data = await response.json();
			decisionEmbeddings = data;
			embeddingsLoaded = true;
			console.log(`[decisions] ✓ Loaded ${Object.keys(data).length} decision embeddings from ${origin}`);
			return data;
		} else {
			console.warn(`[decisions] Could not load embeddings, status: ${response.status}`);
		}
	} catch (e) {
		console.warn('[decisions] Could not load embeddings from public:', e);
	}
	
	// Fallback: initialize empty
	console.warn('[decisions] Using empty embeddings - decision_embeddings.json not found');
	embeddingsLoaded = true;
	return {};
}

/**
 * Cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
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

/**
 * Embed text using Cloudflare Workers AI
 */
async function embedText(text: string, env: any): Promise<number[]> {
	if (!env.AI) {
		throw new Error('Cloudflare AI binding not available');
	}
	
	// Use Cloudflare's text embedding model
	const response = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
		text: text
	});
	
	// Response format: { shape: [1, 768], data: [[...]] }
	if (response && response.data && Array.isArray(response.data) && response.data.length > 0) {
		return response.data[0];
	}
	
	throw new Error('Failed to generate embedding');
}

export function registerDecisionRoutes(app: App) {
	app.post('/api/decisions/search', async (c) => {
		try {
			const body = await c.req.json().catch(() => ({}));
			const prompt = String(body.prompt || '').trim();
			const topK = parseInt(String(body.topK || '10'), 10);
			
			if (!prompt) {
				return c.json(
					{ 
						error: 'Missing prompt',
						ok: false,
						results: []
					},
					{ status: 400 }
				);
			}
			
			// Load embeddings using the current request's URL
			await loadDecisionEmbeddings(c.req.url);
			
			// Embed the user prompt using Cloudflare Workers AI
			console.log('[decisions/search] Embedding prompt with Cloudflare AI...');
			const promptEmbedding = await embedText(prompt, c.env);
			
			// Compute cosine similarity with all decision embeddings
			console.log('[decisions/search] Computing similarities...');
			const similarities: Array<{
				decisionId: string;
				similarity: number;
			}> = [];
			
			for (const [decisionId, embedding] of Object.entries(decisionEmbeddings)) {
				const emb = Array.isArray(embedding) ? embedding : (embedding as any).embedding;
				if (!Array.isArray(emb)) continue;
				
				const score = cosineSimilarity(promptEmbedding, emb);
				similarities.push({
					decisionId,
					similarity: score,
				});
			}
			
			// Sort by similarity (descending) and take top-k
			const topResults = similarities
				.sort((a, b) => b.similarity - a.similarity)
				.slice(0, topK);
			
			console.log(`[decisions/search] Found ${topResults.length} matches (from ${similarities.length} total decisions)`);
			
			return c.json({
				ok: true,
				prompt,
				promptEmbeddingDim: promptEmbedding.length,
				totalDecisions: similarities.length,
				topK,
				results: topResults,
			});
			
		} catch (error) {
			console.error('[decisions/search] Error:', error);
			return c.json(
				{
					ok: false,
					error: 'Search failed',
					details: error instanceof Error ? error.message : String(error),
				},
				{ status: 500 }
			);
		}
	});
}
