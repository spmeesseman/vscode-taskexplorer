
export interface ITeContext
{
	getContext<T>(key: string, defaultValue?: T): T;
	getContext<T>(key: string): T | undefined;
	setContext(key: string, value: unknown): Promise<void>;
}
