
import { ExtensionContext, WorkspaceFolder } from "vscode";
import { IConfiguration } from "./IConfiguration";
import { ILog } from "./ILog";
import { IStorage } from "./IStorage";


export interface ITeContext
{
	getContext<T>(key: string, defaultValue?: T): T;
	getContext<T>(key: string): T | undefined;
	setContext(key: string, value: unknown): Promise<void>;
}

export interface ITeWrapper
{
    // api: TeApi;
	busy: boolean;
	config: IConfiguration;
	context: ExtensionContext;
	contextTe: ITeContext; // TeContext;
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
	homeView: any;
	taskUsageView: any;
	taskCountView: any;
	parsingReportPage: any;
	licensePage: any;
	releaseNotesPage: any;
	explorerView: any;
	sidebarView: any;
	views: any;
	wsfolder: WorkspaceFolder;
	usage: any;
	env: string;
	id: string;
	taskManager: any;
	// configWatcher: any;
	fileWatcher: any;
	figures: any;
	init(): Promise<void>;
	logControl: any;
	pathUtils: any;
	taskUtils: any;
	sorters: any;
	commonUtils: any;
}
