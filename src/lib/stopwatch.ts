
import log from "./log/log";
// import { hrtime } from "@env/hrtime";
import { hrtime } from "./env/node/hrtime";
import { GlyphChars } from "./constants";
import { isString } from "./utils/utils";
import { IDictionary } from "../interface";

interface StopwatchLogOptions { message?: string; suffix?: string };
interface StopwatchOptions { logLevel?: number; log: StopwatchLogOptions };


export class Stopwatch
{
	private static instanceCount = 0;
	private static readonly watches: IDictionary<Stopwatch> = {};

	private logLevel = 1;
	private _time: [number, number] = [ 0, 0 ];
	private readonly instance = `[${++Stopwatch.instanceCount}] `;


	constructor(public readonly scope: string | undefined, options?: StopwatchOptions, ...params: any[])
	{
		if (isString(scope)) {
			scope = "";
			this.instance = "";
			this.logLevel = options?.logLevel || 1;
		}
	}


	elapsed()
	{
		const [ secs, nanoSecs ] = hrtime(this._time);
		return secs * 1000 + Math.floor(nanoSecs / 1000000);
	}


	log(options?: StopwatchLogOptions)
	{
		this.logCore(this.scope, options, false);
	}


	restart(options?: StopwatchLogOptions)
	{
		this.logCore(this.scope, options, true);
		this._time = hrtime();
	}


	get startTime()
	{
		return this._time;
	}


	stop(options?: StopwatchLogOptions)
	{
		this.restart(options);
	}


	private logCore(scope: string | undefined, options: StopwatchLogOptions | undefined, logTotalElapsed: boolean): void
	{
		if (!logTotalElapsed) {
			log.write(`${this.instance}${scope}${options?.message ?? ""}${options?.suffix ?? ""}`, this.logLevel);
			return;
		}

		const [ secs, nanoSecs ] = hrtime(this._time);
		const ms = secs * 1000 + Math.floor(nanoSecs / 1000000);

		const prefix = `${this.instance}${scope}${options?.message ?? ""}`;
		const msg = `${prefix ? `${prefix} ${GlyphChars.Dot} ` : ""}${ms} ms${options?.suffix ?? ""}`;
		if (ms > 250) {
			log.warn(msg);
		}
		else {
			log.write(msg, this.logLevel);
		}
	}


	static start(key: string, options?: StopwatchOptions, ...params: any[])
	{
		Stopwatch.watches[key]?.log();
		Stopwatch.watches[key] = new Stopwatch(key, options, ...params);
	}


	static log(key: string, options?: StopwatchLogOptions)
	{
		Stopwatch.watches[key]?.log(options);
	}


	static stop(key: string, options?: StopwatchLogOptions)
	{
		Stopwatch.watches[key]?.stop(options);
		delete Stopwatch.watches[key];
	}

}
