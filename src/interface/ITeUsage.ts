import { Event } from "vscode";
import { IDictionary } from "./IDictionary";

export interface ITeTrackedUsageCount
{
	today: number;
	last7Days: number;
	last14Days: number;
	last30Days: number;
	last60Days: number;
	last90Days: number;
	total: number;
	yesterday: number;
}

export interface ITaskRuntimeInfo
{
    average: number;
    fastest: number;
    first: number;
    last: number;
    slowest: number;
    avgDown: boolean;
    avgUp: boolean;
    lastDown: boolean;
    lastUp: boolean;
    newFast: boolean;
    newSlow: boolean;
}

export interface ITeTrackedUsage {
	count: ITeTrackedUsageCount;
	first: number;
	timestamp: number;
	timestamps: number[];
}

export interface ITeUsageChangeEvent
{
	readonly key: string;
	readonly usage?: ITeTrackedUsage;
};

export interface ITeUsage
{
	onDidChange: Event<ITeUsageChangeEvent | undefined>;
    get(key: string): ITeTrackedUsage | undefined;
    getAll(): IDictionary<ITeTrackedUsage>;
    reset(key?: string): Promise<void>;
    track(key: string): Promise<ITeTrackedUsage>;
}
