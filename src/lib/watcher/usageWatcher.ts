
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
	| "taskUsageView"
	| "taskTreeExplorer"
	| "taskTreeSideBar";

export type TrackedUsageKeys = `${TrackedUsageFeatures}:shown`;


export interface UsageChangeEvent
{
	readonly key: TrackedUsageKeys;
	readonly usage?: TrackedUsage;
};


export class UsageWatcher implements Disposable
{
	private _onDidChange = new EventEmitter<UsageChangeEvent | undefined>();


	constructor(private readonly wrapper: TeWrapper) {}


	dispose(): void {}


	get onDidChange(): Event<UsageChangeEvent | undefined>
	{
		return this._onDidChange.event;
	}


	get = (key: TrackedUsageKeys): TrackedUsage | undefined => this.wrapper.storage.get<TrackedUsage>("usages." + key);


	getAll = (): IDictionary<TrackedUsage> => this.wrapper.storage.get<IDictionary<TrackedUsage>>("usages", {});


	async reset(key?: TrackedUsageKeys): Promise<void>
	{
		const usages =  this.wrapper.storage.get<IDictionary<TrackedUsage>>("usages");
		if (!usages) return;
		if (!key) {
			await  this.wrapper.storage.delete("usages");
			this._onDidChange.fire(undefined);
		}
		else {
			await  this.wrapper.storage.delete("usages." + key);
			this._onDidChange.fire({ key, usage: undefined });
		}
	}


	async track(key: TrackedUsageKeys): Promise<void>
	{
		let usages =  this.wrapper.storage.get<IDictionary<TrackedUsage>>("usages");
		if (!usages) {
			usages = {}; // as NonNullable<typeof usages>;
		}

		const usedAt = Date.now();

		let usage = usages[key];
		if (!usage)
		{
			usage = {
				count: 1,
				firstUsedAt: usedAt,
				lastUsedAt: usedAt,
			};
			usages[key] = usage;
		}
		else {
			usage.count++;
			usage.lastUsedAt = usedAt;
		}

		//
		// TODO - Telemetry
		//
		//  this.wrapper.telemetry.sendEvent("usage/track", { "usage.key": key, "usage.count": usage.count });
		await this.wrapper.storage.update("usages", usages);
		this._onDidChange.fire({ key, usage });
	}
}
