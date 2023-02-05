
import WebviewManager from "./webViewManager";
import { commands, Disposable, ExtensionContext, Uri, ViewColumn, WebviewPanel } from "vscode";


export default class TeWebviewPanel
{
    public title: string;
    public viewType: string;
    private panel: WebviewPanel;
    private disposables: Disposable[] = [];


    constructor(panel: WebviewPanel, title: string, viewType: string, html: string, context: ExtensionContext)
    {
        this.panel = panel;
        this.title = title;
        this.viewType = viewType;

        const resourceDir = Uri.joinPath(context.extensionUri, "res"),
              cssDir = Uri.joinPath(resourceDir, "css"),
              jsDir = Uri.joinPath(resourceDir, "js"),
              pageDir = Uri.joinPath(resourceDir, "page"),
              sourceImgDir = Uri.joinPath(resourceDir, "sources"),
              pageUri = panel.webview.asWebviewUri(pageDir),
              cssUri = panel.webview.asWebviewUri(cssDir),
              jsUri = panel.webview.asWebviewUri(jsDir),
              resourceDirUri = panel.webview.asWebviewUri(resourceDir),
              sourceImgDirUri = panel.webview.asWebviewUri(sourceImgDir);

        panel.webview.html = html.replace(/\[webview\.cspSource\]/g, panel.webview.cspSource)
                                 .replace(/\[webview\.cssDir\]/g, cssUri.toString())
                                 .replace(/\[webview\.jsDir\]/g, jsUri.toString())
                                 .replace(/\[webview\.pageDir\]/g, pageUri.toString())
                                 .replace(/\[webview\.resourceDir\]/g, resourceDirUri.toString())
                                 .replace(/\[webview\.sourceImgDir\]/g, sourceImgDirUri.toString())
                                 .replace(/\[webview\.nonce\]/g, WebviewManager.getNonce());
        //
        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programmatically
        //
        panel.onDidDispose(() => this.dispose.call(panel), panel, this.disposables);

        panel.onDidChangeViewState(
            e => {
                // if (panel.visible) {
                    // update();
                // }
            },
            null, this.disposables
        );

        panel.webview.onDidReceiveMessage
        (
            message => {
                // i think don't await, the caller can't get the final result anyway
                commands.executeCommand("vscode-taskexplorer." + message.command);
            },
            undefined, this.disposables
        );

        panel.reveal();
    }


    dispose()
    {
        this.panel.dispose();
        while (this.disposables.length)
        {
            (this.disposables.pop() as Disposable).dispose();
        }
    }


    getWebviewPanel = () => this.panel;


    reveal(viewColumn?: ViewColumn | undefined, preserveFocus?: boolean | undefined): void
    {
        throw new Error("Method not implemented.");
    }

}