
import { TeWebviewView } from "../../webviewView";
import { IpcMessage, onIpc } from "../../protocol";
import { ContextKeys } from "../../../lib/constants";
import { registerCommand } from "../../../lib/command";
// import type { Subscription } from "../../subscription";
import type { TeContainer } from "../../../lib/container";
// import { Deferrable, debounce } from "../../system/function";
// import { getAvatarUriFromGravatarEmail } from "../../avatars";
import { StorageChangeEvent } from "../../../interface/IStorage";
// import { configuration } from "../../../lib/utils/configuration";
import { getContext, onDidChangeContext } from "../../../lib/context";
// import { ViewsLayout } from "../../../lib/commands/setViewsLayout";
// import { IpcMessage, onIpc, CompleteStepParams } from "../../protocol";
// import { ensurePlusFeaturesEnabled } from "../../plus/subscription/utils";
// import type { SubscriptionChangeEvent } from "../../plus/subscription/subscriptionService";
import { ConfigurationChangeEvent, Disposable, WebviewPanelOnDidChangeViewStateEvent, WebviewView, window, workspace } from "vscode";
import {
	CompletedActions, CompleteStepCommandType, DidChangeConfigurationType, DidChangeExtensionEnabledType,
	DidChangeSubscriptionNotificationType, DismissBannerCommandType,
	DismissSectionCommandType, DismissStatusCommandType, DismissBannerParams, DismissSectionParams, State, CompleteStepParams
} from "./protocol";


export class HomeView extends TeWebviewView<State>
{

	// private _validating: Promise<void> | undefined;
	// private _validateSubscriptionDebounced: Deferrable<HomeWebviewView["validateSubscription"]> | undefined = undefined;


	constructor(container: TeContainer)
	{
		super(container, "Home", "home.html", "taskExplorer.views.home", `${ContextKeys.WebviewViewPrefix}home`, "homeView");
		this.disposables.push(
			// this.container.subscription.onDidChange(this.onSubscriptionChanged, this),
			onDidChangeContext(key => { if (key === ContextKeys.Disabled) this.notifyExtensionEnabled(); }),
			workspace.getConfiguration().onDidChange((e: any) => { this.onConfigurationChanged(e); }, this),
			this.container.storage.onDidChange(e => { this.onStorageChanged(e); })
		);
	}


	// private async onSubscriptionChanged(e: SubscriptionChangeEvent)
	// {
	// 	await this.container.storage.update("home:status:pinned", true);
	// 	void this.notifyDidChangeData(e.current);
	// }


	private onConfigurationChanged(e: ConfigurationChangeEvent)
	{
		if (e.affectsConfiguration("plusFeatures.enabled")) {
			this.notifyDidChangeConfiguration();
		}
	}


	private onStorageChanged(e: StorageChangeEvent)
	{
		if (e.key === "views:layout") {
			// this.notifyDidChangeLayout();
		}
	}


	protected override onVisibilityChanged(visible: boolean)
	{
		if (!visible) {
			// this._validateSubscriptionDebounced?.cancel();
			return;
		}
		// queueMicrotask(() => void this.validateSubscription());
	}


	protected override onWindowFocusChanged(focused: boolean)
	{
		if (!focused || !this.visible) {
			// this._validateSubscriptionDebounced?.cancel();
			return;
		}
		// queueMicrotask(() => void this.validateSubscription());
	}


	protected override registerCommands(): Disposable[]
	{
		return [
			registerCommand(`${this.id}.refresh`, () => this.refresh(), this),
			registerCommand("taskExplorer.home.toggleWelcome", async () => {
				const welcomeVisible = !this.welcomeVisible;
				await this.container.storage.update("views:welcome:visible", welcomeVisible);
				if (welcomeVisible) {
					await this.container.storage.update("home:actions:completed", []);
					await this.container.storage.update("home:steps:completed", []);
					await this.container.storage.update("home:sections:dismissed", []);
				}

				void this.refresh();
			}),
			registerCommand("taskExplorer.home.restoreWelcome", async () => {
				await this.container.storage.update("home:steps:completed", []);
				await this.container.storage.update("home:sections:dismissed", []);

				void this.refresh();
			}),
		];
	}


	protected override onMessageReceived(e: IpcMessage)
	{
		switch (e.method) {
			case CompleteStepCommandType.method:
				onIpc(CompleteStepCommandType, e, (params: any) => this.completeStep(params));
				break;
			case DismissSectionCommandType.method:
				onIpc(DismissSectionCommandType, e, (params: any) => this.dismissSection(params));
				break;
			case DismissStatusCommandType.method:
				onIpc(DismissStatusCommandType, e, _params => this.dismissPinStatus());
				break;
			case DismissBannerCommandType.method:
				onIpc(DismissBannerCommandType, e, (params: any) => this.dismissBanner(params));
				break;
		}
	}


	private completeStep({ id, completed = false }: CompleteStepParams)
	{
		const steps = this.container.storage.get<string[]>("home:steps:completed", []);

		const hasStep = steps.includes(id);
		if (!hasStep && completed) {
			steps.push(id);
		} else if (hasStep && !completed) {
			steps.splice(steps.indexOf(id), 1);
		}
		void this.container.storage.update("home:steps:completed", steps);
	}


	private dismissSection(params: DismissSectionParams)
	{
		const sections = this.container.storage.get<string[]>("home:sections:dismissed", []);
		if (sections.includes(params.id)) {
			return;
		}
		sections.push(params.id);
		void this.container.storage.update("home:sections:dismissed", sections);
	}


	private dismissBanner(params: DismissBannerParams)
	{
		const banners = this.container.storage.get<string[]>("home:banners:dismissed", []);

		if (!banners.includes(params.id)) {
			banners.push(params.id);
		}

		void this.container.storage.update("home:banners:dismissed", banners);
	}


	private dismissPinStatus()
	{
		void this.container.storage.update("home:status:pinned", false);
	}


	protected override async includeBootstrap(): Promise<State>
	{
		return this.getState();
	}


	private get welcomeVisible()
	{
		return this.container.storage.get("views:welcome:visible", true);
	}


	// private async getSubscription(subscription?: Subscription)
	// {
	// 	// Make sure to make a copy of the array otherwise it will be live to the storage value
	// 	const completedActions = [ ...this.container.storage.get("home:actions:completed", []) ];
	// 	if (!this.welcomeVisible) {
	// 		completedActions.push(CompletedActions.DismissedWelcome);
	// 	}
	// 	const subscriptionState = subscription ?? (await this.container.subscription.getSubscription(true));
	// 	let avatar;
	// 	if (subscriptionState.account?.email) {
	// 		avatar = getAvatarUriFromGravatarEmail(subscriptionState.account.email, 34).toString();
	// 	} else {
	// 		avatar = `${this.getWebRoot() ?? ""}/media/gitlens-logo.webp`;
	// 	}
	// 	return {
	// 		subscription: subscriptionState,
	// 		completedActions,
	// 		avatar,
	// 	};
	// }


	private getPinStatus()
	{
		return this.container.storage.get<boolean>("home:status:pinned", true);
	}


	// private async getState(subscription?: Subscription): Promise<State>
	private async getState(subscription?: any): Promise<State>
	{
		// const subscriptionState = await this.getSubscription(subscription);
		const steps = this.container.storage.get("home:steps:completed", []);
		const sections = this.container.storage.get("home:sections:dismissed", []);
		const dismissedBanners = this.container.storage.get("home:banners:dismissed", []);

		return {
			extensionEnabled: this.getExtensionEnabled(),
			webroot: this.getWebRoot(),
			// subscription: subscriptionState.subscription,
			// completedActions: subscriptionState.completedActions,
			completedSteps: steps,
			dismissedSections: sections,
			// avatar: subscriptionState.avatar,
			// layout: this.getLayout(),
			pinStatus: this.getPinStatus(),
			dismissedBanners
		};
	}


	// private notifyDidChangeData(subscription?: Subscription)
	private notifyDidChangeData(subscription?: any)
	{
		if (!this.isReady) {
			return false;
		}
		const getSub = async () =>
		{
			// const sub = await this.getSubscription(subscription);
			return {
				// ...sub,
				pinStatus: this.getPinStatus(),
			};
		};
		// return window.withProgress({ location: { viewId: this.id } }, async () =>
		// 	this.notify(DidChangeSubscriptionNotificationType, await getSub()),
		// );
	}


	private getExtensionEnabled()
	{
		return !getContext(ContextKeys.Disabled, false);
	}


	private notifyExtensionEnabled()
	{
		if (this.isReady)
		{
			void this.notify(DidChangeExtensionEnabledType, {
				extensionEnabled: this.getExtensionEnabled(),
			});
		}
	}


	// private getPlusEnabled()
	// {
	// 	return configuration.get("plusFeatures.enabled");
	// }


	private notifyDidChangeConfiguration()
	{
		if (this.isReady)
		{
			// void this.notify(DidChangeConfigurationType, { plusEnabled: this.getPlusEnabled() });
		}
	}


	private getLayout()
	{
		const layout = this.container.storage.get("views:layout");
		return layout; // ? (layout as ViewsLayout) : ViewsLayout.SourceControl;
	}


	// private notifyDidChangeLayout()
	// {
	// 	if (!this.isReady) return;
	// 	// void this.notify(DidChangeLayoutType, { layout: this.getLayout() });
	// }



	// private async validateSubscription(): Promise<void>
	// {
	// 	if (!this._validateSubscriptionDebounced) {
	// 		this._validateSubscriptionDebounced = debounce(this.validateSubscriptionCore, 1000);
	// 	}
	// 	await this._validateSubscriptionDebounced();
	// }


	// private async validateSubscriptionCore()
	// {
	// 	if (this._validating == null) {
	// 		this._validating = this.container.subscription.validate();
	// 		try {
	// 			await this._validating;
	// 		} finally {
	// 			this._validating = undefined;
	// 		}
	// 	}
	// }

}
