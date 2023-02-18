
import { ILog } from "./ILog";
import { IStorage } from "./IStorage";
import { ITeContext } from "./ITeContext";
import { ITeWebview } from "./ITeWebview";
import { ITeFigures } from "./ITeFigures";
import { IDictionary } from "./IDictionary";
import { ITeUtilities } from "./ITeUtilities";
import { ITeFileCache } from "./ITeFileCache";
import { ITeFilesystem } from "./ITeFilesystem";
import { IConfiguration } from "./IConfiguration";
import { ITaskExplorerApi } from "./ITaskExplorerApi";
import { ITaskTreeView, ITeTaskTree } from "./ITeTaskTree";
import { ExtensionContext, TreeItem, TreeView, WorkspaceFolder } from "vscode";

export interface ITeWrapper
{
	init(): Promise<void>;

	debugging: boolean;
	env: "dev" | "tests" | "production";
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
	figures: ITeFigures;
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
