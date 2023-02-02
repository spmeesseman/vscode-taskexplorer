

interface StoredSession
{
	id: string;
	accessToken: string;
	scopes: string[];
	account?: {
		label?: string;
		displayName?: string;
		id: string;
	};
}
