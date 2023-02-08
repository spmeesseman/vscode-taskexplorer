
import { TeWrapper } from "../wrapper";
import { IDictionary } from "../../interface";
import { IStorage } from "../../interface/IStorage";
import { Disposable, Event, EventEmitter } from "vscode";

export interface TrackedUsage {
	count: number;
	firstUsedAt: number;
	lastUsedAt: number;
}

export type TrackedUsageFeatures =
	| "runlastTask"
	| "openSideBar"
	| "clearFavorites"
	| "clearLastTasks"
	| "licensePage"
	| "parsingReportPage"
	| "releaseNotesPage"
	| "homeView"
	| "taskCountView"
	| "taskUsageView";

export type TrackedUsageKeys = `${TrackedUsageFeatures}:shown`;


export interface UsageChangeEvent
{
	readonly key: TrackedUsageKeys;
	readonly usage?: TrackedUsage;
};


export class UsageWatcher implements Disposable
{
	private storage: IStorage;
	private te: TeWrapper;

	private _onDidChange = new EventEmitter<UsageChangeEvent | undefined>();


	constructor(te: TeWrapper, storage: IStorage)
	{
		this.storage = storage;
		this.te = te;
	}

	dispose(): void {}


	get onDidChange(): Event<UsageChangeEvent | undefined>
	{
		return this._onDidChange.event;
	}


	get(key: TrackedUsageKeys): TrackedUsage | undefined
	{
		return this.storage.get<TrackedUsage>("usages." + key);
	}


	async reset(key?: TrackedUsageKeys): Promise<void>
	{
		const usages = this.storage.get("usages");
		if (!usages) return;
		if (!key) {
			await this.storage.delete("usages");
			this._onDidChange.fire(undefined);

			return;
		}
		await this.storage.delete("usages." + key);
		this._onDidChange.fire({ key, usage: undefined });
	}


	async track(key: TrackedUsageKeys): Promise<void>
	{
		let usages = this.storage.get<IDictionary<any>>("usages");
		if (!usages) {
			usages = {}; // as NonNullable<typeof usages>;
		}

		const usedAt = Date.now();

		let usage = usages[key];
		if (!usage) {
			usage = {
				count: 0,
				firstUsedAt: usedAt,
				lastUsedAt: usedAt,
			};
			usages[key] = usage;
		} else {
			if (usage.count !== Number.MAX_SAFE_INTEGER) {
				usage.count++;
			}
			usage.lastUsedAt = usedAt;
		}

		//
		// TODO - Telemetry
		//
		// this.telemetry.sendEvent("usage/track", { "usage.key": key, "usage.count": usage.count });

		await this.storage.update("usages", usages);

		this._onDidChange.fire({ key, usage });
	}
}
