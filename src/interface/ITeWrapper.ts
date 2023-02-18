
import { ExtensionContext, TreeItem, TreeView, WorkspaceFolder } from "vscode";
import { IConfiguration } from "./IConfiguration";
import { ITeFileCache } from "./ITeFileCache";
import { ITeFilesystem } from "./ITeFilesystem";
import { ILog } from "./ILog";
import { IStorage } from "./IStorage";
import { ITaskExplorerApi } from "./ITaskExplorerApi";
import { ITeContext } from "./ITeContext";
import { ITeUtilities } from "./ITeUtilities";
import { ITeWebview } from "./ITeWebview";
import { IDictionary } from "./IDictionary";
import { ITaskTreeView, ITeTaskTree } from "./ITeTaskTree";

export interface ITeWrapper
{
	init(): Promise<void>;

	debugging: boolean;
	env: string;
	id: string;
	tests: boolean;
	busy: boolean;

	api: ITaskExplorerApi;
	commonUtils: any;
	config: IConfiguration;
	context: ExtensionContext;
	contextTe: ITeContext;
	configwatcher: boolean;
	// configWatcher: any;
	explorer: ITeTaskTree;
	explorerView: TreeView<TreeItem>;
	fileWatcher: any;
	figures: any;
	homeView: ITeWebview;
	filecache: ITeFileCache;
	fs: ITeFilesystem;
	licenseManager: any;
	licensePage: ITeWebview;
	log: ILog;
	logControl: IDictionary<any>;
	parsingReportPage: ITeWebview;
	pathUtils: any;
	releaseNotesPage: ITeWebview;
	sidebar: ITeTaskTree;
	sidebarView: TreeView<TreeItem>;
	sorters: any;
	storage: IStorage;
	treeManager: any;
	taskManager: any;
	taskUsageView: ITeWebview;
	taskCountView: ITeWebview;
	taskUtils: any;
	usage: any;
	utils: ITeUtilities;
	views: IDictionary<ITaskTreeView>;
	wsfolder: WorkspaceFolder;
}
