
import { ExtensionContext } from "vscode";
import { IConfiguration } from "./IConfiguration";
import { ILog } from "./ILog";
import { IStorage } from "./IStorage";


export interface ITeWrapper
{
    // api: TeApi;
	busy: boolean;
	config: IConfiguration;
	context: ExtensionContext;
	// contextTe: TeContext;
	debugging: boolean;
	configwatcher: boolean;
	utils: any;
	storage: IStorage;
	treeManager: any;
	explorer: any;
	sidebar: any;
	fs: any;
	filecache: any;
	api: any;
	log: ILog;
	tests: boolean;
	licenseManager: any;
}
