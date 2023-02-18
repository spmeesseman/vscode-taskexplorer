
import { TeApi } from "./api";
import * as fs from "./utils/fs";
import { Strings } from "./constants";
import { TeServer } from "./auth/server";
import { TeFileCache } from "./fileCache";
import { TaskTree } from "src/tree/tree";
import * as utilities from "./utils/utils";
import { IStorage } from "../interface/IStorage";
import { IDictionary, ILog } from "../interface";
import { TaskManager } from "src/tree/taskManager";
import { ContextKeys, TeContext } from "./context";
import { AntTaskProvider } from "../providers/ant";
import { HomeView } from "../webview/view/homeView";
import { BashTaskProvider } from "../providers/bash";
import { GulpTaskProvider } from "../providers/gulp";
import { MakeTaskProvider } from "../providers/make";
import { RubyTaskProvider } from "../providers/ruby";
import { NsisTaskProvider } from "../providers/nsis";
import { PerlTaskProvider } from "../providers/perl";
import { ITeWrapper } from "src/interface/ITeWrapper";
import { UsageWatcher } from "./watcher/usageWatcher";
import { TeFileWatcher } from "./watcher/fileWatcher";
import { TaskTreeManager } from "../tree/treeManager";
import { LicenseManager } from "./auth/licenseManager";
import { BatchTaskProvider } from "../providers/batch";
import { MavenTaskProvider } from "../providers/maven";
import { GruntTaskProvider } from "../providers/grunt";
import { registerStatusBarItem } from "./statusBarItem";
import { GradleTaskProvider } from "../providers/gradle";
import { PipenvTaskProvider } from "../providers/pipenv";
import { PythonTaskProvider } from "../providers/python";
import { TeConfigWatcher } from "./watcher/configWatcher";
import { LicensePage } from "../webview/page/licensePage";
import { registerDonateCommand } from "../commands/donate";
import { WebpackTaskProvider } from "../providers/webpack";
import { JenkinsTaskProvider } from "../providers/jenkins";
import { ComposerTaskProvider } from "../providers/composer";
import { TaskExplorerProvider } from "../providers/provider";
import { IConfiguration } from "../interface/IConfiguration";
import { TaskCountView } from "../webview/view/taskCountView";
import { TaskUsageView } from "../webview/view/taskUsageView";
import { ReleaseNotesPage } from "../webview/page/releaseNotes";
import { PowershellTaskProvider } from "../providers/powershell";
import { ITaskExplorerProvider } from "../interface/ITaskProvider";
import { AppPublisherTaskProvider } from "../providers/appPublisher";
import { ParsingReportPage } from "../webview/page/parsingReportPage";
import { registerAddToExcludesCommand } from "../commands/addToExcludes";
import { registerEnableTaskTypeCommand } from "../commands/enableTaskType";
import { registerDisableTaskTypeCommand } from "../commands/disableTaskType";
import { registerRemoveFromExcludesCommand } from "../commands/removeFromExcludes";
import { ExtensionContext, ExtensionMode, tasks, workspace, WorkspaceFolder, env, TreeItem, TreeView, Disposable } from "vscode";


export class TeWrapper implements ITeWrapper, Disposable
{
	private _ready = false;
	private _tests = false;
	private _busy = false;
	private _initialized = false;

	private readonly _log: ILog;
	private readonly _teApi: TeApi;
	private readonly _version: string;
	private readonly _storage: IStorage;
	private readonly _homeView: HomeView;
	private readonly _usage: UsageWatcher;
	private readonly _teContext: TeContext;
	private readonly _fileCache: TeFileCache;
	private readonly _licensePage: LicensePage;
	private readonly _disposables: Disposable[];
	private readonly _context: ExtensionContext;
	private readonly _fileWatcher: TeFileWatcher;
	private readonly _treeManager: TaskTreeManager;
	private readonly _taskUsageView: TaskUsageView;
	private readonly _taskCountView: TaskCountView;
	private readonly _configuration: IConfiguration;
	private readonly _configWatcher: TeConfigWatcher;
	// private readonly _telemetry: TelemetryService;
	private readonly _licenseManager: LicenseManager;
	private readonly _releaseNotesPage: ReleaseNotesPage;
	private readonly _previousVersion: string | undefined;
	private readonly _parsingReportPage: ParsingReportPage;
    private readonly _providers: IDictionary<ITaskExplorerProvider>;
	// private _onReady: EventEmitter<void> = new EventEmitter<void>();
	// private _onInitialized: EventEmitter<void> = new EventEmitter<void>();
	// private _onWorkCompleted: EventEmitter<void> = new EventEmitter<void>();


	constructor(context: ExtensionContext, storage: IStorage, configuration: IConfiguration, log: ILog)
    {
		this._context = context;
        this._storage = storage;
        this._configuration = configuration;
		this._log = log;
		this._providers = {};

		this._version = this._context.extension.packageJSON.version;
		this._previousVersion = this._storage.get<string>("taskexplorer.version");

		this._teContext = new TeContext();
		this._fileCache = new TeFileCache(this);
		this._fileWatcher = new TeFileWatcher(this);
		this._configWatcher = new TeConfigWatcher(this);

		this._licenseManager = new LicenseManager(this);
		this._treeManager = new TaskTreeManager(this);
		this._usage = new UsageWatcher(this);

		this._homeView = new HomeView(this);
		this._taskCountView = new TaskCountView(this);
		this._taskUsageView = new TaskUsageView(this);

		this._licensePage = new LicensePage(this);
		this._parsingReportPage = new ParsingReportPage(this);
		this._releaseNotesPage = new ReleaseNotesPage(this);

		this._teApi = new TeApi(this);

		//
		// TODO - Telemetry
		//
		// teWrapper.telemetry.setGlobalAttributes({
		// 	debugging: container.debugging,
		// 	insiders: insiders,
		// 	prerelease: prerelease,
		// 	install: previousVersion == null,
		// 	upgrade: previousVersion != null && version !== previousVersion,
		// 	upgradedFrom: previousVersion != null && version !== previousVersion ? previousVersion : undefined,
		// });

		//
		// TODO - Telemetry
		//
		// const startTime = sw.startTime;
		// const endTime = hrtime();
		// const elapsed = sw.elapsed();
		// container.telemetry.sendEvent(
		// 	"activate",
		// 	{
		// 		"activation.elapsed": elapsed,
		// 		"activation.mode": mode?.name,
		// 		...flatCfg,
		// 	},
		// 	startTime,
		// 	endTime,
		// );

		this._disposables = [
			this._usage,
			this._homeView,
			this._treeManager,
			this._licensePage,
			this._fileWatcher,
			this._taskCountView,
			this._taskUsageView,
			this._licenseManager,
			this._releaseNotesPage,
			this._parsingReportPage
		];

		context.subscriptions.push(this);
	}


	dispose()
	{
		this._disposables.forEach((d) => {
            d.dispose();
        });
        this._disposables.splice(0);
	}


	init = async() =>
	{
		if (this._initialized) {
			throw new Error("TeWrapper is already initialized/ready");
		}
		this.log.methodStart("app wrapper init", 1, "", false, [
			[ "version", this._version ], [ "previous version", this._previousVersion  ],
		]);
		await this.storage.update("taskexplorer.version", this._version);
		//
		// Register global status bar item
		//
		registerStatusBarItem(this._context);
		//
		// Register all task provider services, i.e. ant, batch, bash, python, etc...
		//
		this.registerTaskProviders();
		//
		// Init/register file type watchers
		// This "used" to also start the file scan to build the file task file cache. It now
		// does not on startup.  We use rebuildCache() below, so as to initiate one scan as
		// opposed to one scan per task type, like it did previously.  Note that if task types
		// are enabled or disabled in settings after startup, then the individual calls to
		// registerFileWatcher() will perform the scan for that task type.
		//
		await this._fileWatcher.init("   ");
		//
		// Context
		//
		this.registerContextMenuCommands();
		await this._teContext.setContext(ContextKeys.Debugging, this.debugging);
		await this._teContext.setContext(ContextKeys.Tests, this.tests);
        await this._teContext.setContext(ContextKeys.Enabled, this.config.get<boolean>("enableSideBar") ||
                   /* istanbul ignore next */ this.config.get<boolean>("enableExplorerView"));
		//
		// Signal we are ready/done
		//
		queueMicrotask(() => { this._initialized = true; /* this._onInitialized.fire();  */ });
		//
		// Start the whole work process, i.e. read task files and build the task tree, etc.
		// Large workspaces can take a bit of time if persistent caching isn't enabled, so
		// we do it now and not wait until the view is first visible/focused/activated.
		//
		queueMicrotask(() => this.run());
		this.log.methodDone("app wrapper init", 1);
	};


	private run = async() =>
	{
		const now = Date.now(),
			  lastDeactivated = await this.storage.get2<number>("lastDeactivated", 0),
			  lastWsRootPathChange = await this.storage.get2<number>("lastWsRootPathChange", 0);
		this.log.methodStart("app wrapper run", 1, "", true);
		//
		// Authentication
		//
		await this.licenseManager.checkLicense("   ");
		// const session = await licenseManager.getSession("TeAuth", [], { create: true });
		// if (session) {
		//     window.showInformationMessage(`Welcome back ${session.account.name}`);
		// }
		//
		// Maybe how 'what's new'or 'welcome' page
		//
		/* istanbul ignore next */
		if (this.versionchanged) { /* TODO */ }
		// utilities.oneTimeEvent(this.onReady)(() => { /* TODO */ });
		//
		// Build the file cache, this kicks off the whole process as refresh cmd will be issued
		// down the line in the initialization process.
		// On a workspace folder move that changes the 1st folder, VSCode restarts the extension.
		// To make the tree reload pain as light as possible, we now always persist the file cache
		// regardless if the user settings has activated it or not when the extension deactivates
		// in this scenario. So check this case and proceed as necessary.
		//
		this._treeManager.setMessage(Strings.ScanningTaskFiles);
		const rootFolderChanged  = now < lastDeactivated + 5000 && /* istanbul ignore next */now < lastWsRootPathChange + 5000;
		/* istanbul ignore else */
		if (this.tests || /* istanbul ignore next */!rootFolderChanged)
		{
			await this.filecache.rebuildCache("   ");
		}     //
		else // See comments/notes above
		{   //
			const enablePersistentFileCaching = this.config.get<boolean>("enablePersistentFileCaching");
			this._configWatcher.enableConfigWatcher(false);
			await this.config.update("enablePersistentFileCaching", true);
			await this.filecache.rebuildCache("   ");
			await this.config.update("enablePersistentFileCaching", enablePersistentFileCaching);
			this._configWatcher.enableConfigWatcher(true);
		}

		await this.storage.update2("lastDeactivated", 0);
		await this.storage.update2("lastWsRootPathChange", 0);
		//
		// Start the first tree build/load
		//
		this._treeManager.setMessage(Strings.RequestingTasks);
		await this._treeManager.loadTasks("   ");
		this._treeManager.setMessage();
		//
		// Log the environment
		//
		this.log.methodDone("app wrapper run", 1, "", [
			[ "machine id", env.machineId ], [ "session id", env.sessionId ], [ "app name", env.appName ],
			[ "remote name", env.remoteName ], [ "is new ap install", env.isNewAppInstall ]
		]);
		//
		// Signal that the startup work has completed
		//
		queueMicrotask(() => { this._ready = true; /* this._onReady.fire(); */ });
	};


	private registerContextMenuCommands = () =>
	{
		registerDonateCommand(this._disposables);
		registerDisableTaskTypeCommand(this._disposables);
		registerEnableTaskTypeCommand(this._disposables);
		registerAddToExcludesCommand(this, this._disposables);
		registerRemoveFromExcludesCommand(this, this._disposables);
	};


    private registerTaskProvider = (providerName: string, provider: TaskExplorerProvider) =>
    {
        this.context.subscriptions.push(tasks.registerTaskProvider(providerName, provider));
        this._providers[providerName] = provider;
    };


	private registerTaskProviders = () =>
    {   //
        // Internal Task Providers
        //
        // These tak types are provided internally by the extension.  Some task types (npm, grunt,
        //  gulp, ts) are provided by VSCode itself
        //
        // TODO: VSCODE API now implements "resolveTask" in addition to "provideTask".  Need to implement
        //     https://code.visualstudio.com/api/extension-guides/task-provider
        //
        this.registerTaskProvider("ant", new AntTaskProvider(this));                    // Apache Ant Build Automation Tool
        this.registerTaskProvider("apppublisher", new AppPublisherTaskProvider(this));  // App Publisher (work related)
        this.registerTaskProvider("composer", new ComposerTaskProvider(this));          // PHP / composer.json
        this.registerTaskProvider("gradle", new GradleTaskProvider(this));              // Gradle multi-Language Automation Tool
        this.registerTaskProvider("grunt", new GruntTaskProvider(this));                // Gulp JavaScript Toolkit
        this.registerTaskProvider("gulp", new GulpTaskProvider(this));                  // Grunt JavaScript Task Runner
        this.registerTaskProvider("jenkins", new JenkinsTaskProvider(this));            // Jenkinsfile validation task
        this.registerTaskProvider("make", new MakeTaskProvider(this));                  // C/C++ Makefile
        this.registerTaskProvider("maven", new MavenTaskProvider(this));                // Apache Maven Toolset
        this.registerTaskProvider("pipenv", new PipenvTaskProvider(this));              // Pipfile for Python pipenv package manager
        this.registerTaskProvider("webpack", new WebpackTaskProvider(this));
        // Script type tasks
        this.registerTaskProvider("bash", new BashTaskProvider(this));
        this.registerTaskProvider("batch", new BatchTaskProvider(this));
        this.registerTaskProvider("nsis", new NsisTaskProvider(this));
        this.registerTaskProvider("perl", new PerlTaskProvider(this));
        this.registerTaskProvider("powershell", new PowershellTaskProvider(this));
        this.registerTaskProvider("python", new PythonTaskProvider(this));
        this.registerTaskProvider("ruby", new RubyTaskProvider(this));
    };


	get api(): TeApi {
		return this._teApi;
	}

	get busy(): boolean {
		return this._busy || !this._ready || !this._initialized || this._fileCache.isBusy() || this._treeManager.isBusy() ||
			   this._fileWatcher.isProcessingFsEvent() || this._configWatcher.isProcessingConfigChange() || this._licenseManager.isBusy();
	}

	get config(): IConfiguration {
		return this._configuration;
	}

	set configwatcher(e: boolean) {
		this._configWatcher.enableConfigWatcher(e);
	}

	get context(): ExtensionContext {
		return this._context;
	}

	get contextTe(): TeContext {
		return this._teContext;
	}

	get debugging(): boolean {
		return this._context.extensionMode === ExtensionMode.Development;
	}

	get env(): "dev" | "tests" | "production" {
		const isDev = this._context.extensionMode === ExtensionMode.Development,
			  isTests = this._context.extensionMode === ExtensionMode.Test;
		/* istanbul ignore next */
		return !isDev && !isTests ? "production" : (isDev ? "dev" : "tests");
	}

    get explorer(): TaskTree {
        return this.treeManager.views.taskExplorer.tree;
    }

    get explorerView(): TreeView<TreeItem> {
        return this.treeManager.views.taskExplorer.view;
    }

	get filecache(): TeFileCache {
		return this._fileCache;
	}

	get fileWatcher(): TeFileWatcher {
		return this._fileWatcher;
	}

	get fs(): typeof fs {
		return fs;
	}

	get homeView(): HomeView {
		return this._homeView;
	}

	get id(): string {
		return this._context.extension.id;
	}

	get log(): ILog {
		return this._log;
	}

	// get onInitialized() {
	// 	return this._onInitialized.event;
	// }

	// get onReady() {
	// 	return this._onReady.event;
	// }

	get providers(): IDictionary<ITaskExplorerProvider> {
		return this._providers;
	}

	get licenseManager(): LicenseManager {
		return this._licenseManager;
	}

	get licensePage(): LicensePage {
		return this._licensePage;
	}

	get parsingReportPage(): ParsingReportPage {
		return this._parsingReportPage;
	}

	get releaseNotesPage(): ReleaseNotesPage {
		return this._releaseNotesPage;
	}

	get server(): TeServer {
		return this.licenseManager.server;
	}

    get sidebar(): TaskTree {
        return this.treeManager.views.taskExplorerSideBar.tree;
    }

    get sidebarView(): TreeView<TreeItem> {
        return this.treeManager.views.taskExplorerSideBar.view;
    }

	get storage(): IStorage {
		return this._storage;
	}

	get taskManager(): TaskManager {
		return this._treeManager.taskManager;
	}

	get taskCountView(): TaskCountView {
		return this._taskCountView;
	}

	get taskUsageView(): TaskUsageView {
		return this._taskUsageView;
	}

	get tests(): boolean {
		return this._tests || this._context.extensionMode === ExtensionMode.Test;
	}

	set tests(v) {
		this._tests = v;
	}

	get treeManager(): TaskTreeManager {
		return this._treeManager;
	}

	get usage(): UsageWatcher {
		return this._usage;
	}

	get utils(): typeof utilities {
		return utilities;
	}

	get version(): string {
		return this._version;
	}

	get versionchanged(): boolean {
		return this._version !== this._previousVersion;
	}

    get views() {
        return this.treeManager.views;
    }

	get wsfolder(): WorkspaceFolder {
		return (workspace.workspaceFolders as WorkspaceFolder[])[0];
	}

	// await window.withProgress(
	// {
	// 	location: ProgressLocation.Window,
	// 	cancellable: false,
	// 	title: "ExtJs"
	// },
	// async (progress) => _run(progress));

    // private updateProgress = async(action: string, pct: number) =>
    // {
    //     (this.progress as Progress<{ message: string }>).report({
    //         message: `: Parsing ${action} ${pct}%`
    //     });
    //     await utils.sleep(1); // let progress update
    // };

	// private _keyboard: Keyboard;
	// get keyboard() {
	// 	return this._keyboard;
	// }

	// get subscription() {
	// 	return this._subscription;
	// }

	// get subscriptionAuthentication() {
	// 	return this._subscriptionAuthentication;
	// }

	// get statusBar() {
	// 	return this._statusBarController;
	// }

	// get telemetry(): TelemetryService {
	// 	return this._telemetry;
	// }

	// get viewCommands() {
	// 	if (!this._viewCommands) {
	// 		this._viewCommands = new ViewCommands(this);
	// 	}
	// 	return this._viewCommands;
	// }

}
