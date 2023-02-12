
import { log } from "./log/log";
import * as fs from "./utils/fs";
import * as fileCache from "./fileCache";
import { TaskTree } from "src/tree/tree";
import * as utilities from "./utils/utils";
import { isExtensionBusy } from "src/extension";
import { IStorage } from "../interface/IStorage";
import { AntTaskProvider } from "../providers/ant";
import { HomeView } from "../webview/view/homeView";
import { ContextKeys, setContext } from "./context";
import { BashTaskProvider } from "../providers/bash";
import { GulpTaskProvider } from "../providers/gulp";
import { MakeTaskProvider } from "../providers/make";
import { RubyTaskProvider } from "../providers/ruby";
import { NsisTaskProvider } from "../providers/nsis";
import { PerlTaskProvider } from "../providers/perl";
import { configuration } from "./utils/configuration";
import { UsageWatcher } from "./watcher/usageWatcher";
import { TaskTreeManager } from "../tree/treeManager";
import { LicenseManager } from "./auth/licenseManager";
import { BatchTaskProvider } from "../providers/batch";
import { MavenTaskProvider } from "../providers/maven";
import { GruntTaskProvider } from "../providers/grunt";
import { registerStatusBarItem } from "./statusBarItem";
import { GradleTaskProvider } from "../providers/gradle";
import { PipenvTaskProvider } from "../providers/pipenv";
import { PythonTaskProvider } from "../providers/python";
import { LicensePage } from "../webview/page/licensePage";
import { registerDonateCommand } from "../commands/donate";
import { WebpackTaskProvider } from "../providers/webpack";
import { JenkinsTaskProvider } from "../providers/jenkins";
import { ComposerTaskProvider } from "../providers/composer";
import { TaskExplorerProvider } from "../providers/provider";
import { IConfiguration } from "../interface/IConfiguration";
import { TaskCountView } from "../webview/view/taskCountView";
import { TaskUsageView } from "../webview/view/taskUsageView";
import { TeAuthenticationProvider } from "./auth/authProvider";
import { ReleaseNotesPage } from "../webview/page/releaseNotes";
import { enableConfigWatcher, registerConfigWatcher } from "./watcher/configWatcher";
import { IDictionary, ILog, ITaskTreeView } from "../interface";
import { PowershellTaskProvider } from "../providers/powershell";
import { ITaskExplorerProvider } from "../interface/ITaskProvider";
import { AppPublisherTaskProvider } from "../providers/appPublisher";
import { ParsingReportPage } from "../webview/page/parsingReportPage";
import { registerAddToExcludesCommand } from "../commands/addToExcludes";
import { registerEnableTaskTypeCommand } from "../commands/enableTaskType";
import { registerDisableTaskTypeCommand } from "../commands/disableTaskType";
import { registerRemoveFromExcludesCommand } from "../commands/removeFromExcludes";
import { ExtensionContext, EventEmitter, ExtensionMode, tasks, workspace, WorkspaceFolder } from "vscode";


export const isContainer = (container: any): container is TeWrapper => container instanceof TeWrapper;

export class TeWrapper
{
	static #instance: TeWrapper | undefined;

	private _licenseManager: LicenseManager;
	private _treeManager: TaskTreeManager;

	private _ready = false;
	private _busy = false;
	private _tests = false;
	private readonly _version: string;
	private readonly _prerelease;
	private readonly _context: ExtensionContext;
	private readonly _previousVersion: string | undefined;
	private _onReady: EventEmitter<void> = new EventEmitter<void>();
	private readonly _storage: IStorage;
	private readonly _configuration: IConfiguration;
	private readonly _log: ILog;
	// private readonly _telemetry: TelemetryService;
	private readonly _usage: UsageWatcher;
	private _homeView: HomeView;
	private _taskCountView: TaskCountView;
	private _taskUsageView: TaskUsageView;
	private _licensePage: LicensePage;
	private _releaseNotesPage: ReleaseNotesPage;
	private _parsingReportPage: ParsingReportPage;
    private readonly _providers: IDictionary<ITaskExplorerProvider>;


	static create(context: ExtensionContext, storage: IStorage, configuration: IConfiguration, prerelease: boolean, version: string, previousVersion: string | undefined)
    {
		if (TeWrapper.#instance) throw new Error("TeWrapper is already initialized");
		TeWrapper.#instance = new TeWrapper(context, storage, configuration, prerelease, version, previousVersion);
		return TeWrapper.#instance;
	}


	private constructor(context: ExtensionContext, storage: IStorage, configuration: IConfiguration, prerelease: boolean, version: string, previousVersion: string | undefined)
    {
		this._context = context;
		this._prerelease = prerelease;
		this._version = version;
		this._previousVersion = previousVersion;
        this._storage = storage;
        this._configuration = configuration;
		this._log = log;
		this._providers = {};

		this._licenseManager = new LicenseManager(this);
		this._treeManager = new TaskTreeManager(this);
		this._usage = new UsageWatcher(this, storage);

		this._homeView = new HomeView(this);
		this._taskCountView = new TaskCountView(this);
		this._taskUsageView = new TaskUsageView(this);

		this._licensePage = new LicensePage(this);
		this._parsingReportPage = new ParsingReportPage(this);
		this._releaseNotesPage = new ReleaseNotesPage(this);

		context.subscriptions.push(
			this._homeView ,
			this._licenseManager,
			this._licensePage,
			this._parsingReportPage,
			this._releaseNotesPage,
			this._taskCountView,
			this._taskUsageView,
			this._treeManager,
			this._usage
		);
	}


	static get instance(): TeWrapper {
		return TeWrapper.#instance ?? TeWrapper.#proxy;
	}


	static #proxy = new Proxy<TeWrapper>({} as TeWrapper,
    {
		get: (_target, prop) =>
        {
			if (TeWrapper.#instance) return (TeWrapper.#instance as any)[prop];
			if (prop === "config") return configuration;
			throw new Error("TeWrapper is not initialized");
		},
	});


	get onReady() {
		return this._onReady.event;
	}


	ready = async() =>
	{
		if (this._ready) {
			throw new Error("TeWrapper is already ready");
		}
		await fileCache.registerFileCache(this);
		registerConfigWatcher(this);
		this.registerTaskProviders();
		this.registerContextMenuCommands();
		registerStatusBarItem(this._context);
		if (this.debugging) {
			await setContext(ContextKeys.Debugging, true);
		}
		else if (this.tests) {
			await setContext(ContextKeys.Tests, true);
		}
        await setContext(ContextKeys.Enabled, this.configuration.get<boolean>("enableExplorerView") ||
                                              this.configuration.get<boolean>("enableSideBar"));
		this._ready = true;
		queueMicrotask(() => this._onReady.fire());
	};


	private registerContextMenuCommands = () =>
	{
		registerDonateCommand(this._context);
		registerAddToExcludesCommand(this._context);
		registerDisableTaskTypeCommand(this._context);
		registerEnableTaskTypeCommand(this._context);
		registerRemoveFromExcludesCommand(this._context);
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


	get configuration(): IConfiguration {
		return this._configuration;
	}

	get context() {
		return this._context;
	}

	get debugging() {
		return this._context.extensionMode === ExtensionMode.Development;
	}

	set configwatcher(e: boolean) {
		enableConfigWatcher(e);
	}

	get env(): "dev" | "tests" | "production"
    {
		const isDev = this._context.extensionMode === ExtensionMode.Development,
			  isTests = this._context.extensionMode === ExtensionMode.Test;
		return !isDev && !isTests ? "production" : (isTests ? "tests" : "dev");
	}

    get explorer()
    {
        return this.treeManager.views.taskExplorer?.tree;
    }

    set explorer(tree)
    {
        (this.treeManager.views.taskExplorer as ITaskTreeView).tree = tree as TaskTree;
    }

    get explorerView() {
        return this.treeManager.views.taskExplorer?.view;
    }

	get filecache() {
		return fileCache;
	}

	get fs() {
		return fs;
	}

	get id() {
		return this._context.extension.id;
	}

	get busy() {
		return isExtensionBusy() || this._busy;
	}

	get log() {
		return this._log;
	}

	get prerelease(){
		return this._prerelease;
	}

	get prereleaseOrDebugging() {
		return this._prerelease || this.debugging;
	}

	get providers() {
		return this._providers;
	}

	get licenseManager() {
		return this._licenseManager;
	}


    get sidebar() {
        return this.treeManager.views.taskExplorerSideBar?.tree;
    }

    set sidebar(tree) {
        if (this.treeManager.views.taskExplorerSideBar) {
            this.treeManager.views.taskExplorerSideBar.tree = tree as TaskTree;
        }
    }

    get sidebarView() {
        return this.treeManager.views.taskExplorerSideBar?.view;
    }

	get treeManager() {
		return this._treeManager;
	}

	get taskManager() {
		return this._treeManager.taskManager;
	}

	get storage(): IStorage {
		return this._storage;
	}

	get usage(): UsageWatcher {
		return this._usage;
	}

	get version(): string {
		return this._version;
	}

	get homeView() {
		return this._homeView;
	}

	get taskCountView() {
		return this._taskCountView;
	}

	get taskUsageView() {
		return this._taskCountView;
	}

	get licensePage() {
		return this._licensePage;
	}

	get parsingReportPage() {
		return this._parsingReportPage;
	}

	get releaseNotesPage() {
		return this._releaseNotesPage;
	}

	get tests() {
		return this._tests || this._context.extensionMode === ExtensionMode.Test;
	}

	set tests(v) {
		this._tests = v;
	}

	get utils() {
		return utilities;
	}

	get wsfolder() {
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
