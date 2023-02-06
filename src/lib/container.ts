
import WebviewManager from "../webview/webViewManager";
import registerAddToExcludesCommand from "../commands/addToExcludes";
import registerEnableTaskTypeCommand from "../commands/enableTaskType";
import registerDisableTaskTypeCommand from "../commands/disableTaskType";
import registerRemoveFromExcludesCommand from "../commands/removeFromExcludes";
import { Commands } from "./constants";
import { IDictionary } from "../interface";
import { IStorage } from "../interface/IStorage";
import { configuration } from "./utils/configuration";
import { UsageWatcher } from "./watcher/usageWatcher";
import { TaskTreeManager } from "../tree/treeManager";
import { LicenseManager } from "./auth/licenseManager";
import { AntTaskProvider } from "../providers/ant";
import { BashTaskProvider } from "../providers/bash";
import { GulpTaskProvider } from "../providers/gulp";
import { MakeTaskProvider } from "../providers/make";
import { RubyTaskProvider } from "../providers/ruby";
import { NsisTaskProvider } from "../providers/nsis";
import { PerlTaskProvider } from "../providers/perl";
import { BatchTaskProvider } from "../providers/batch";
import { MavenTaskProvider } from "../providers/maven";
import { GruntTaskProvider } from "../providers/grunt";
import { GradleTaskProvider } from "../providers/gradle";
import { PipenvTaskProvider } from "../providers/pipenv";
import { PythonTaskProvider } from "../providers/python";
import { WebpackTaskProvider } from "../providers/webpack";
import { JenkinsTaskProvider } from "../providers/jenkins";
import { ComposerTaskProvider } from "../providers/composer";
import { TaskExplorerProvider } from "../providers/provider";
import { PowershellTaskProvider } from "../providers/powershell";
import { ILicenseManager } from "../interface/ILicenseManager";
import { ITaskExplorerProvider } from "../interface/ITaskProvider";
import { AppPublisherTaskProvider } from "../providers/appPublisher";
import { ParsingReportPage } from "../webview/page/parsingReportPage";
import { ExtensionContext, EventEmitter, ExtensionMode, tasks } from "vscode";


export const isContainer = (container: any): container is TeContainer => container instanceof TeContainer;

export class TeContainer
{
	static #instance: TeContainer | undefined;

	private _licenseManager: ILicenseManager;
	private _treeManager: TaskTreeManager;
	private _webviewManager: WebviewManager;

	private _ready = false;
	private readonly _version: string;
	private readonly _prerelease;
	private readonly _context: ExtensionContext;
	private _onReady: EventEmitter<void> = new EventEmitter<void>();
	// private _subscription: SubscriptionService;
	// private _subscriptionAuthentication: SubscriptionAuthenticationProvider;
	// private _statusBarController: StatusBarController;
	private readonly _storage: IStorage;
	// private readonly _telemetry: TelemetryService;
	private readonly _usage: UsageWatcher;
	// private _viewCommands: ViewCommands | undefined;
	// private _welcomeWebview: WelcomeWebview;
	// private _releaseNotesWebview: ReleaseNotesPage;
    private readonly _providers: IDictionary<ITaskExplorerProvider>;


	static create(context: ExtensionContext, storage: IStorage, prerelease: boolean, version: string, previousVersion: string | undefined)
    {
		if (TeContainer.#instance) throw new Error("TeContainer is already initialized");

		TeContainer.#instance = new TeContainer(context, storage, prerelease, version, previousVersion);
		return TeContainer.#instance;
	}


	private constructor(context: ExtensionContext, storage: IStorage, prerelease: boolean, version: string, previousVersion: string | undefined)
    {
		this._context = context;
		this._prerelease = prerelease;
		this._version = version;
        this._storage = storage;
		this._providers = {};

		//
		// Create license manager instance
		//
		context.subscriptions.push((this._licenseManager = this._licenseManager = new LicenseManager(this)));

		//
		// Create the Webviews Manager
		//
		context.subscriptions.push((this._webviewManager = new WebviewManager(this)));

		//
		// Create task tree manager and register the tree providers
		//
		context.subscriptions.push((this._treeManager = new TaskTreeManager(this)));

		// context.subscriptions.push((this._storage = storage));
		// context.subscriptions.push((this._telemetry = new TelemetryService(this)));
		context.subscriptions.push((this._usage = new UsageWatcher(this, storage)));

		//
		// Authentication Provider
		//
		// context.subscriptions.push(
		// 	new TeAuthenticationProvider(context)
		// );

		// context.subscriptions.push(configuration.onWillChange(this.onConfigurationChanging, this));

		// const server = new ServerConnection(this);
		// context.subscriptions.push(server);
		// context.subscriptions.push(
		// 	(this._subscriptionAuthentication = new SubscriptionAuthenticationProvider(this, server)),
		// );
		// context.subscriptions.push((this._subscription = new SubscriptionService(this, previousVersion)));

		// context.subscriptions.push((this._welcomeWebview = new WelcomeWebview(this)));
	}


	static get instance(): TeContainer {
		return TeContainer.#instance ?? TeContainer.#proxy;
	}


	static #proxy = new Proxy<TeContainer>({} as TeContainer,
    {
		get: (_target, prop) =>
        {
			if (!TeContainer.#instance) return (TeContainer.#instance as any)[prop];
			if (prop === "config") return configuration;
			throw new Error("TeContainer is not initialized");
		},
	});


	get onReady()
	{
		return this._onReady.event;
	}


	async ready()
	{
		if (this._ready) throw new Error("TeContainer is already ready");

		this._ready = true;
		this.registerCommands();
		this.registerTaskProviders();
		queueMicrotask(() => this._onReady.fire());
	}


	private registerCommands()
	{
		registerAddToExcludesCommand(this._context);
		registerDisableTaskTypeCommand(this._context);
		registerEnableTaskTypeCommand(this._context);
		registerRemoveFromExcludesCommand(this._context);
	}


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
        this.registerTaskProvider("ant", new AntTaskProvider());                    // Apache Ant Build Automation Tool
        this.registerTaskProvider("apppublisher", new AppPublisherTaskProvider());  // App Publisher (work related)
        this.registerTaskProvider("composer", new ComposerTaskProvider());          // PHP / composer.json
        this.registerTaskProvider("gradle", new GradleTaskProvider());              // Gradle multi-Language Automation Tool
        this.registerTaskProvider("grunt", new GruntTaskProvider());                // Gulp JavaScript Toolkit
        this.registerTaskProvider("gulp", new GulpTaskProvider());                  // Grunt JavaScript Task Runner
        this.registerTaskProvider("jenkins", new JenkinsTaskProvider());            // Jenkinsfile validation task
        this.registerTaskProvider("make", new MakeTaskProvider());                  // C/C++ Makefile
        this.registerTaskProvider("maven", new MavenTaskProvider());                // Apache Maven Toolset
        this.registerTaskProvider("pipenv", new PipenvTaskProvider());              // Pipfile for Python pipenv package manager
        this.registerTaskProvider("webpack", new WebpackTaskProvider());
        // Script type tasks
        this.registerTaskProvider("bash", new BashTaskProvider());
        this.registerTaskProvider("batch", new BatchTaskProvider());
        this.registerTaskProvider("nsis", new NsisTaskProvider());
        this.registerTaskProvider("perl", new PerlTaskProvider());
        this.registerTaskProvider("powershell", new PowershellTaskProvider());
        this.registerTaskProvider("python", new PythonTaskProvider());
        this.registerTaskProvider("ruby", new RubyTaskProvider());
    };

	get context()
	{
		return this._context;
	}

	get debugging()
    {
		return this._context.extensionMode === ExtensionMode.Development;
	}

	get env(): "dev" | "tests" | "production"
    {
        let env: "dev" | "tests" | "production" = "production";
		if (this.prereleaseOrDebugging) {
			env = configuration.get<"dev" | "tests" | "production">("runtimeEnvironment", "tests");
		}
		return env;
	}

	get id()
    {
		return this._context.extension.id;
	}

	get prerelease()
	{
		return this._prerelease;
	}

	get prereleaseOrDebugging()
	{
		return this._prerelease || this.debugging;
	}

	get providers()
	{
		return this._providers;
	}

	get licenseManager()
    {
		return this._licenseManager;
	}

	get treeManager()
    {
		return this._treeManager;
	}

	get webviewManager()
    {
		return this._webviewManager;
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

	private _parsingReportPage: ParsingReportPage | undefined;
	get parsingReportPage() {
		if (!this._parsingReportPage) {
			this._context.subscriptions.push((this._parsingReportPage = new ParsingReportPage(this)));
		}
		return this._parsingReportPage;
	}

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

	// get welcomeWebview() {
	// 	return this._welcomeWebview;
	// }
}
