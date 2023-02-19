

export interface State extends BaseState
{
	seconds?: number;
	taskType?: string;
}

export interface BaseState
{
	enabled: boolean;
	nonce?: string;
	pinned: boolean;
	webroot?: string;
}
