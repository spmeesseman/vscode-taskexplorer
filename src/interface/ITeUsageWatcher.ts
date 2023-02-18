import { Event } from "vscode";
import { IDictionary } from "./IDictionary";

export interface TrackedUsage {
	count: number;
	countToday: number;
	firstUsedAt: number;
	lastUsedAt: number;
}

export interface UsageChangeEvent
{
	readonly key: string;
	readonly usage?: TrackedUsage;
};

export interface ITeUsageWatcher
{
	onDidChange: Event<UsageChangeEvent | undefined>;
    get(key: string): TrackedUsage | undefined;
    getAll(): IDictionary<TrackedUsage>;
    reset(key?: string): Promise<void>;
    track(key: string): Promise<void>;
}
