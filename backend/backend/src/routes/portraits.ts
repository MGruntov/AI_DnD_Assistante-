import type { App } from '../appRoutes';
import type { Env } from '../env';

// Keep in sync with the legacy router's Gemini API version.
const GEMINI_API_VERSION = 'v1beta';

function parseSeed(raw: string | null | undefined): number | null {
	if (!raw) return null;
	const n = Number.parseInt(String(raw), 10);
	if (!Number.isFinite(n)) return null;
	// Keep it within a reasonable 32-bit-ish range.
	return Math.max(0, Math.min(2_147_483_647, n));
}

function base64ToUint8Array(b64: string): Uint8Array {
	// atob is available in Workers.
	const bin = atob(b64);
	const bytes = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
	return bytes;
}

function extractInlineImage(data: any): { mimeType: string; bytes: Uint8Array } | null {
	const parts: any[] = data?.candidates?.[0]?.content?.parts;
	if (!Array.isArray(parts) || parts.length === 0) return null;

	for (const p of parts) {
		// Gemini uses camelCase in most docs (inlineData), but accept snake_case just in case.
		const inline = p?.inlineData ?? p?.inline_data ?? null;
		const mimeType = typeof inline?.mimeType === 'string' ? inline.mimeType : typeof inline?.mime_type === 'string' ? inline.mime_type : '';
		const b64 = typeof inline?.data === 'string' ? inline.data : '';
		if (b64) {
			return {
				mimeType: mimeType || 'image/png',
				bytes: base64ToUint8Array(b64),
			};
		}
	}
	return null;
}

async function generatePortraitImageViaGemini(env: Env, prompt: string, seed: number | null): Promise<Response> {
	const apiKey = typeof env.GEMINI_API_KEY === 'string' ? env.GEMINI_API_KEY.trim() : '';
	if (!apiKey) {
		return new Response('GEMINI_API_KEY is not configured', { status: 500 });
	}

	// User-requested model name.
	// Note: If this model name is not available in your project/region, the request will fail and
	// the frontend will fall back to Pollinations.
	const modelName = 'models/gemini-2.5-flash-image';

	const url =
		`https://generativelanguage.googleapis.com/${encodeURIComponent(GEMINI_API_VERSION)}/${modelName}:generateContent` +
		`?key=${encodeURIComponent(apiKey)}`;

	const body: any = {
		contents: [
			{
				role: 'user',
				parts: [{ text: prompt }],
			},
		],
		generationConfig: {
			// Keep it fairly stable; image models can still be creative.
			temperature: 0.7,
			maxOutputTokens: 64,
			...(seed != null ? { seed } : {}),
		},
	};

	let upstreamStatus: number | null = null;
	let upstreamSnippet = '';
	try {
		console.log('[portraits] calling Gemini image model', {
			model: modelName,
			seed: seed ?? null,
			promptSnippet: prompt.slice(0, 120),
		});

		const res = await fetch(url, {
			method: 'POST',
			headers: { 'content-type': 'application/json; charset=utf-8' },
			body: JSON.stringify(body),
		});
		upstreamStatus = res.status;
		if (!res.ok) {
			upstreamSnippet = (await res.text().catch(() => '')).slice(0, 600);
			console.warn('[portraits] Gemini image generation failed', {
				status: res.status,
				snippet: upstreamSnippet,
			});
			return new Response(
				`Gemini image generation failed with status ${res.status}${upstreamSnippet ? `: ${upstreamSnippet}` : ''}`,
				{
					status: 502,
					headers: {
						'x-ada-portraits': 'gemini',
						'x-ada-portraits-model': modelName,
						'x-ada-portraits-upstream-status': String(res.status),
					},
				},
			);
		}

		const json = await res.json().catch(() => null);
		if (!json) return new Response('Gemini returned non-JSON response', { status: 502 });

		const image = extractInlineImage(json);
		if (!image) {
			console.warn('[portraits] Gemini response had no inline image payload');
			return new Response('Gemini did not return an inline image payload', { status: 502 });
		}

		return new Response(image.bytes, {
			status: 200,
			headers: {
				'content-type': image.mimeType || 'image/png',
				// Portraits are ephemeral; avoid caching surprises during iteration.
				'cache-control': 'no-store',
				'x-ada-portraits': 'gemini',
				'x-ada-portraits-model': modelName,
				...(upstreamStatus != null ? { 'x-ada-portraits-upstream-status': String(upstreamStatus) } : {}),
			},
		});
	} catch (err: any) {
		const msg = err && typeof err.message === 'string' ? err.message : 'Unknown error calling Gemini image model';
		console.warn('[portraits] Gemini image generation error', { message: msg });
		return new Response(`Gemini image generation error: ${msg}`, { status: 502 });
	}
}

export function registerPortraitRoutes(app: App): void {
	// GET so the browser can load it directly as an <img src="...">.
	// Example:
	//   /api/portraits/generate?prompt=...&seed=123
	app.get('/api/portraits/generate', async (c) => {
		const prompt = String(c.req.query('prompt') || '').trim();
		const seed = parseSeed(c.req.query('seed'));

		if (!prompt) return c.text('prompt is required', 400);
		if (prompt.length > 600) return c.text('prompt is too long', 400);

		// Add a small, consistent prefix to keep style reasonable.
		const fullPrompt = prompt.toLowerCase().includes('portrait')
			? prompt
			: `fantasy D&D character portrait, digital painting, ${prompt}`;

		console.log('[portraits] /api/portraits/generate', {
			seed: seed ?? null,
			promptSnippet: fullPrompt.slice(0, 120),
		});
		const res = await generatePortraitImageViaGemini(c.env, fullPrompt, seed);
		return res;
	});
}
