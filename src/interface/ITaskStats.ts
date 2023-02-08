import { IDictionary } from "./IDictionary";

export interface ITaskStats
{
    ranOn: number[];
    todayCount: number;
    lastTime: number;
    runCounts: IDictionary<number>;
}
