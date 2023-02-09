
import { State } from "../common/state";
import { TeWrapper } from "../../lib/wrapper";
import { ContextKeys } from "../../lib/constants";
import { TasksChangeEvent } from "../../interface";
import { registerCommand } from "../../lib/command";
import { StorageChangeEvent } from "../../interface/IStorage";
import { ConfigurationChangeEvent, Disposable } from "vscode";
import { TeWebviewView, WebviewViewIds } from "../webviewView";
import { removeLicenseButtons } from "../common/removeLicenseButtons";

/*
https://github.com/microsoft/vscode-webview-ui-toolkit-samples/blob/main/default/weather-webview/src/webview/main.ts
import {
  provideVSCodeDesignSystem,
  Button,
  Dropdown,
  ProgressRing,
  TextField,
  vsCodeButton,
  vsCodeDropdown,
  vsCodeOption,
  vsCodeTextField,
  vsCodeProgressRing,
} from "@vscode/webview-ui-toolkit";
<vscode-button id="check-weather-button">Check</vscode-button>
          <h2>Current Weather</h2>
          <section id="results-container">
            <vscode-progress-ring id="loading" class="hidden"></vscode-progress-ring>
// In order to use the Webview UI Toolkit web components they
// must be registered with the browser (i.e. webview) using the
// syntax below.
provideVSCodeDesignSystem().register(
  vsCodeButton(),
  vsCodeDropdown(),
  vsCodeOption(),
  vsCodeProgressRing(),
  vsCodeTextField()
);

// Get access to the VS Code API from within the webview context
const vscode = acquireVsCodeApi();

// Just like a regular webpage we need to wait for the webview
// DOM to load before we can reference any of the HTML elements
// or toolkit components
window.addEventListener("load", main);

// Main function that gets executed once the webview DOM loads
function main() {
  // To get improved type annotations/IntelliSense the associated class for
  // a given toolkit component can be imported and used to type cast a reference
  // to the element (i.e. the `as Button` syntax)
  const checkWeatherButton = document.getElementById("check-weather-button") as Button;
  checkWeatherButton.addEventListener("click", checkWeather);

  setVSCodeMessageListener();
}
*/


export class HomeView extends TeWebviewView<State>
{
	static viewTitle = "Home";
	static viewId: WebviewViewIds = "home"; // Must match view id in package.json


	constructor(wrapper: TeWrapper)
	{
		super(
			wrapper,
			HomeView.viewTitle,
			"home.html",
			`taskExplorer.views.${HomeView.viewId}`,
			`${ContextKeys.WebviewViewPrefix}home`,
			`${HomeView.viewId}View`
		);
		this.disposables.push(
			wrapper.configuration.onDidChange(e => { this.onConfigurationChanged(e); }, this),
			wrapper.storage.onDidChange(e => { this.onStorageChanged(e); }, this),
			wrapper.treeManager.onTasksChanged(e => { this.onTasksChanged(e); }, this)
		);
	}


	private onConfigurationChanged(e: ConfigurationChangeEvent)
	{
		this.wrapper.log.methodStart("HomeView Event: onConfigurationChanged", 2, this.wrapper.log.getLogPad());
		this.wrapper.log.methodDone("HomeView Event: onConfigurationChanged", 2, this.wrapper.log.getLogPad());
	}


	private onStorageChanged(e: StorageChangeEvent)
	{
		this.wrapper.log.methodStart("HomeView Event: onStorageChanged", 2, this.wrapper.log.getLogPad());
		this.wrapper.log.methodDone("HomeView Event: onStorageChanged", 2, this.wrapper.log.getLogPad());
	}


	private async onTasksChanged(e: TasksChangeEvent)
	{
		this.wrapper.log.methodStart("HomeView Event: onTasksChanged", 2, this.wrapper.log.getLogPad());
		if (this.isFirstLoadComplete) {
			await this.refresh();
		}
		this.wrapper.log.methodDone("HomeView Event: onTasksChanged", 2, this.wrapper.log.getLogPad());
	}


	protected override finalizeHtml = async (html: string) =>
	{
    	const taskStats = this.wrapper.taskManager.getTaskStats(),
			  taskCount = this.wrapper.treeManager.getTasks().length;
		html = html.replace("#{taskCounts.length}",  taskCount.toString())
				   .replace("#{taskCounts.today}", taskStats.todayCount.toString());
		return removeLicenseButtons(html);
	};


	protected override onVisibilityChanged(visible: boolean)
	{
	}


	protected override onWindowFocusChanged(focused: boolean)
	{
	}


	protected override registerCommands(): Disposable[]
	{
		return [];
	}


	// protected override async includeBootstrap(): Promise<State>
	// {
	// 	return this.getState();
	// }
}
