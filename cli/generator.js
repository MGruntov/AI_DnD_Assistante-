#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { Command } from 'commander';
import dotenv from 'dotenv';
import ora from 'ora';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnv() {
	// Prefer:
	// 1) explicit ADA_ENV_PATH
	// 2) .env in current working directory
	// 3) repo root .env (one level above cli/)
	const candidates = [];
	if (process.env.ADA_ENV_PATH) candidates.push(process.env.ADA_ENV_PATH);
	candidates.push(path.resolve(process.cwd(), '.env'));
	candidates.push(path.resolve(__dirname, '..', '.env'));

	for (const envPath of candidates) {
		try {
			dotenv.config({ path: envPath });
			// dotenv doesn't throw if missing; check existence to know whether we loaded it.
			// If the file exists, we consider it "loaded" even if it doesn't contain expected vars.
			// eslint-disable-next-line no-await-in-loop
			return envPath;
		} catch {
			// ignore
		}
	}
	return null;
}

function pickEnv(name, fallbackNames = []) {
	const direct = String(process.env[name] ?? '').trim();
	if (direct) return direct;
	for (const alt of fallbackNames) {
		const v = String(process.env[alt] ?? '').trim();
		if (v) return v;
	}
	return '';
}

function normalizeUrlBase(url) {
	const u = String(url || '').trim();
	if (!u) return '';
	return u.replace(/\/+$/, '');
}

function normalizeInt(value, { min, max, fallback }) {
	const n = Number.parseInt(String(value ?? ''), 10);
	if (!Number.isFinite(n)) return fallback;
	return Math.max(min, Math.min(max, n));
}

function validateInputs({ alignment, theme, minLevel, maxLevel }) {
	const errors = [];
	if (!alignment) errors.push('alignment is required');
	if (!theme) errors.push('theme is required');
	if (minLevel < 1 || minLevel > 20) errors.push('minLevel must be 1..20');
	if (maxLevel < 1 || maxLevel > 20) errors.push('maxLevel must be 1..20');
	if (maxLevel < minLevel) errors.push('maxLevel must be >= minLevel');
	return errors;
}

async function callGenerateScenario({ workerUrl, architectSecret, alignment, minLevel, maxLevel, theme }) {
	const url = `${normalizeUrlBase(workerUrl)}/api/architect/generate-scenario`;
	const res = await fetch(url, {
		method: 'POST',
		headers: {
			'content-type': 'application/json; charset=utf-8',
			'X-Architect-Secret': architectSecret,
		},
		body: JSON.stringify({ alignment, minLevel, maxLevel, theme }),
	});

	const text = await res.text().catch(() => '');
	let json = null;
	try {
		json = text ? JSON.parse(text) : null;
	} catch {
		json = null;
	}

	if (!res.ok) {
		const message =
			(json && typeof json.error === 'string' && json.error) ||
			(json && typeof json.message === 'string' && json.message) ||
			text ||
			`HTTP ${res.status}`;
		const err = new Error(message);
		err.status = res.status;
		err.responseText = text;
		throw err;
	}

	return json ?? { ok: true };
}

async function readBulkFile(filePath) {
	const raw = await fs.readFile(filePath, 'utf8');
	let data;
	try {
		data = JSON.parse(raw);
	} catch {
		throw new Error('bulk file is not valid JSON');
	}
	if (!Array.isArray(data)) {
		throw new Error('bulk file must be a JSON array');
	}
	return data;
}

const program = new Command();
program
	.name('ada')
	.description('ADA CLI — scenario generation and utilities')
	.version('0.1.0');

program
	.command('generate')
	.description('Generate a single scenario via the Worker /api/architect/generate-scenario endpoint')
	.requiredOption('--alignment <alignment>', 'Alignment, e.g. "Lawful Good"')
	.requiredOption('--theme <theme>', 'Theme, e.g. "Haunted coastline"')
	.option('--minLevel <n>', 'Minimum level (1..20)', '1')
	.option('--maxLevel <n>', 'Maximum level (1..20)', '2')
	.action(async (opts) => {
		loadEnv();
		const workerUrl = pickEnv('ADA_WORKER_URL', ['WORKER_URL', 'PROD_WORKER_URL']);
		const architectSecret = pickEnv('ARCHITECT_SECRET');

		if (!workerUrl) {
			console.error('Missing ADA_WORKER_URL in .env');
			process.exitCode = 2;
			return;
		}
		if (!architectSecret) {
			console.error('Missing ARCHITECT_SECRET in .env');
			process.exitCode = 2;
			return;
		}

		const alignment = String(opts.alignment ?? '').trim();
		const theme = String(opts.theme ?? '').trim();
		const minLevel = normalizeInt(opts.minLevel, { min: 1, max: 20, fallback: 1 });
		const maxLevel = normalizeInt(opts.maxLevel, { min: 1, max: 20, fallback: Math.max(1, minLevel) });

		const errors = validateInputs({ alignment, theme, minLevel, maxLevel });
		if (errors.length) {
			for (const e of errors) console.error(`- ${e}`);
			process.exitCode = 2;
			return;
		}

		const spinner = ora('Generating scenario (Gemini is thinking)…').start();
		try {
			const json = await callGenerateScenario({
				workerUrl,
				architectSecret,
				alignment,
				minLevel,
				maxLevel,
				theme,
			});
			const id = String(json?.id ?? '').trim();
			const title = String(json?.title ?? '').trim();
			spinner.succeed('Scenario generated');
			console.log(`Adventure Title: ${title || '(unknown title)'}`);
			console.log(`ID: ${id || '(unknown id)'}`);
		} catch (err) {
			spinner.fail('Scenario generation failed');
			console.error(err?.message || String(err));
			process.exitCode = 1;
		}
	});

program
	.command('bulk-generate')
	.description('Generate scenarios from a JSON file (array) sequentially')
	.argument('<file>', 'Path to a JSON file containing an array of scenario requests')
	.action(async (file) => {
		loadEnv();
		const workerUrl = pickEnv('ADA_WORKER_URL', ['WORKER_URL', 'PROD_WORKER_URL']);
		const architectSecret = pickEnv('ARCHITECT_SECRET');

		if (!workerUrl) {
			console.error('Missing ADA_WORKER_URL in .env');
			process.exitCode = 2;
			return;
		}
		if (!architectSecret) {
			console.error('Missing ARCHITECT_SECRET in .env');
			process.exitCode = 2;
			return;
		}

		let items;
		try {
			items = await readBulkFile(String(file));
		} catch (err) {
			console.error(err?.message || String(err));
			process.exitCode = 2;
			return;
		}

		for (let i = 0; i < items.length; i++) {
			const item = items[i] ?? {};
			const alignment = String(item.alignment ?? '').trim();
			const theme = String(item.theme ?? '').trim();
			const minLevel = normalizeInt(item.minLevel, { min: 1, max: 20, fallback: 1 });
			const maxLevel = normalizeInt(item.maxLevel, { min: 1, max: 20, fallback: Math.max(1, minLevel) });

			const errors = validateInputs({ alignment, theme, minLevel, maxLevel });
			if (errors.length) {
				console.error(`Item ${i + 1}/${items.length} invalid:`);
				for (const e of errors) console.error(`- ${e}`);
				process.exitCode = 2;
				return;
			}

			const spinner = ora(
				`[${i + 1}/${items.length}] Generating: ${alignment} · L${minLevel}-${maxLevel} · ${theme}`,
			).start();
			try {
				const json = await callGenerateScenario({
					workerUrl,
					architectSecret,
					alignment,
					minLevel,
					maxLevel,
					theme,
				});
				const id = String(json?.id ?? '').trim();
				const title = String(json?.title ?? '').trim();
				spinner.succeed(`OK: ${title || '(unknown title)'} (${id || 'no id'})`);
			} catch (err) {
				spinner.fail('Failed');
				console.error(err?.message || String(err));
				process.exitCode = 1;
				return;
			}
		}
	});

await program.parseAsync(process.argv);
