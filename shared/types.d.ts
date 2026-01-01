export type UserPublic = {
	id: string;
	username: string;
	createdAt: string;
};

export type ApiError = {
	error: string;
};

export type ApiOk = {
	ok: true;
};
