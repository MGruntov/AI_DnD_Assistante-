/**
 * Decision search endpoint for semantic matching
 * 
 * Accepts user narrative prompt and:
 * 1. Embeds it using sentence-transformers
 * 2. Computes cosine similarity against pre-computed decision embeddings
 * 3. Returns top-k similar decisions with metadata
 */

import { Hono } from 'hono';
import type { App } from '../appRoutes';

// Lazy-load embedding model on first use
let embeddingModel: any = null;
let decisionEmbeddings: Record<string, number[]> = {};
let embeddingsLoaded = false;

/**
 * Load the embedding model from transformers
 */
async function loadEmbeddingModel() {
	if (embeddingModel) return embeddingModel;
	
	const { pipeline } = await import('@xenova/transformers');
	console.log('[decisions] Loading embedding model (all-MiniLM-L6-v2)...');
	embeddingModel = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
	console.log('[decisions] Model loaded');
	return embeddingModel;
}

/**
 * Load pre-computed decision embeddings
 * In production, these would come from KV storage or a bundled asset
 */
async function loadDecisionEmbeddings(env: any) {
	if (embeddingsLoaded) return decisionEmbeddings;
	
	try {
		// Try to fetch from public directory first
		const response = await fetch('./decision_embeddings.json');
		if (response.ok) {
			const data = await response.json();
			decisionEmbeddings = data;
			embeddingsLoaded = true;
			console.log(`[decisions] Loaded ${Object.keys(data).length} decision embeddings`);
			return data;
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
 * Embed text using the transformer model
 */
async function embedText(text: string): Promise<number[]> {
	const model = await loadEmbeddingModel();
	
	// Get embeddings from model
	const output = await model(text, {
		pooling: 'mean',
		normalize: true,
	});
	
	// Convert tensor to array
	const embedding = Array.from(output.data);
	return embedding;
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
			
			// Load embeddings
			await loadDecisionEmbeddings(c.env);
			
			// Embed the user prompt
			console.log('[decisions/search] Embedding prompt...');
			const promptEmbedding = await embedText(prompt);
			
			// Compute cosine similarity with all decision embeddings
			console.log('[decisions/search] Computing similarities...');
			const similarities: Array<{
				decisionId: string;
				similarity: number;
			}> = [];
			
			for (const [decisionId, embedding] of Object.entries(decisionEmbeddings)) {
				const emb = Array.isArray(embedding) ? embedding : embedding.embedding;
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
