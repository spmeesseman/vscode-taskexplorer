import {
    provideVSCodeDesignSystem, vsCodeButton, Button
} from "@vscode/webview-ui-toolkit";

// provideVSCodeDesignSystem().register(
//   vsCodeButton(),
//   vsCodeCheckbox()
// );
provideVSCodeDesignSystem().register(vsCodeButton());

interface VsCodeApi {
	postMessage(msg: unknown): void;
	setState(state: unknown): void;
	getState(): unknown;
}

declare function acquireVsCodeApi(): VsCodeApi;

// Get access to the VS Code API from within the webview context
const vscode = acquireVsCodeApi();

const enterLicense = () =>
{
    vscode.postMessage({
        method: "command/execute",
        params: {
            command: "vscode-taskexplorer.enterLicense"
        }
    });
};

const getLicense = () =>
{
    vscode.postMessage({
        method: "command/execute",
        params: {
            command: "vscode-taskexplorer.getLicense"
        }
    });
};

const showLicensePage = () =>
{
    vscode.postMessage({
        method: "command/execute",
        params: {
            command: "vscode-taskexplorer.showLicensePage"
        }
    });
};

const showParsingReport = () =>
{
    vscode.postMessage({
        method: "command/execute",
        params: {
            command: "vscode-taskexplorer.showParsingReportPage"
        }
    });
};

const showReleaseNotes = () =>
{
    vscode.postMessage({
        method: "command/execute",
        params: {
            command: "vscode-taskexplorer.showReleaseNotesPage"
        }
    });
};

const main = ()  =>
{
    let elem = document.getElementById("btnViewReleaseNotes");
    elem?.addEventListener("click", showReleaseNotes);
    elem = document.getElementById("btnEnterlicense") as Button;
    elem?.addEventListener("click", enterLicense); elem.onclick = enterLicense;
    elem = document.getElementById("btnGetLicense") as Button;
    elem?.addEventListener("click", getLicense);
    elem = document.getElementById("btnViewLicense") as Button;
    elem?.addEventListener("click", showLicensePage);
    elem = document.getElementById("btnViewReport") as Button;
    elem?.addEventListener("click", showParsingReport);
};

window.addEventListener("load", main);

window.addEventListener("message", event =>
{
    const message = event.data; // JSON data from tests
    switch (message.command)
    {
        case "enterLicense":
            enterLicense();
            break;
        case "getLicense":
            getLicense();
            break;
        case "showLicensePage":
            showLicensePage();
            break;
        case "showParsingReport":
            showParsingReport();
            break;
        case "showReleaseNotes":
            showReleaseNotes();
            break;
    }
});
