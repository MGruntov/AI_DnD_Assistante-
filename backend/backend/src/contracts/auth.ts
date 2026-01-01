import { z } from 'zod';

export const usernameSchema = z
	.string()
	.trim()
	.min(1, 'Username is required')
	.max(64, 'Username must be at most 64 characters')
	.regex(/^[A-Za-z0-9_\-]+$/, 'Username may only contain letters, numbers, underscore, and dash');

export const passwordSchema = z
	.string()
	.min(1, 'Password is required')
	.max(128, 'Password must be at most 128 characters');

export const registerBodySchema = z.object({
	username: usernameSchema,
	password: passwordSchema,
});

export const loginBodySchema = z.object({
	username: usernameSchema,
	password: z.string().min(1),
});

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
