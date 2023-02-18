
import { ILog } from "./ILog";
import { IStorage } from "./IStorage";
import { ITeContext } from "./ITeContext";
import { ITeWebview } from "./ITeWebview";
import { ITeFigures } from "./ITeFigures";
import { IDictionary } from "./IDictionary";
import { ITeFileCache } from "./ITeFileCache";
import { ITeFilesystem } from "./ITeFilesystem";
import { IConfiguration } from "./IConfiguration";
import { ITeFileWatcher } from "./ITeFileWatcher";
import { ITeUsageWatcher } from "./ITeUsageWatcher";
import { ITaskExplorerApi } from "./ITaskExplorerApi";
import { ITeConfigWatcher } from "./ITeConfigWatcher";
import { ITeLicenseManager } from "./ITeLicenseManager";
import { ITaskTreeView, ITeTaskTree } from "./ITeTaskTree";
import { ExtensionContext, TreeItem, TreeView, WorkspaceFolder } from "vscode";
import { ITeCommonUtilities, ITePathUtilities, ITeTaskUtilities, ITeUtilities } from "./ITeUtilities";
import { ITeTreeManager } from "./ITeTreeManager";
import { ITeTaskManager } from "./ITeTaskManager";


export interface ITeWrapper
{
	init(): Promise<void>;

	tests: boolean;
	readonly debugging: boolean;
	readonly env: "dev" | "tests" | "production";
	readonly id: string;
	readonly busy: boolean;

	api: ITaskExplorerApi;
	commonUtils: ITeCommonUtilities;
	config: IConfiguration;
	context: ExtensionContext;
	contextTe: ITeContext;
	configWatcher: ITeConfigWatcher;
	explorer: ITeTaskTree;
	explorerView: TreeView<TreeItem>;
	fileWatcher: ITeFileWatcher;
	figures: ITeFigures;
	homeView: ITeWebview;
	filecache: ITeFileCache;
	fs: ITeFilesystem;
	licenseManager: ITeLicenseManager;
	licensePage: ITeWebview;
	log: ILog;
	logControl: IDictionary<any>;
	parsingReportPage: ITeWebview;
	pathUtils: ITePathUtilities;
	releaseNotesPage: ITeWebview;
	sidebar: ITeTaskTree;
	sidebarView: TreeView<TreeItem>;
	sorters: any;
	storage: IStorage;
	treeManager: ITeTreeManager;
	taskManager: ITeTaskManager;
	taskUsageView: ITeWebview;
	taskCountView: ITeWebview;
	taskUtils: ITeTaskUtilities;
	usage: ITeUsageWatcher;
	utils: ITeUtilities;
	views: IDictionary<ITaskTreeView>;
	wsfolder: WorkspaceFolder;
}
