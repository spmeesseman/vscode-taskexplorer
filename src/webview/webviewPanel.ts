
import WebviewManager from "./webViewManager";
import { commands, Disposable, ExtensionContext, Uri, ViewColumn, WebviewPanel, window } from "vscode";


export default class TeWebviewPanel // implements WebviewPanel
{
    public title: string;
    public viewType: string;
    private panel: WebviewPanel;
    private disposables: Disposable[] = [];
    private disposed = false;
    isDisposed = () => this.disposed;


    constructor(title: string, viewType: string, html: string, context: ExtensionContext, panel?: WebviewPanel)
    {
        const resourceDir = Uri.joinPath(context.extensionUri, "res"),
              column = window.activeTextEditor ? window.activeTextEditor.viewColumn : undefined;

        this.title = title;
        this.viewType = viewType;

        this.panel = panel || window.createWebviewPanel(
            viewType,                 // Identifies the type of the webview. Used internally
            title,                    // Title of the panel displayed to the users
            column || ViewColumn.One, // Editor column to show the new webview panel in.
            {
                enableScripts: true,
                enableCommandUris: true,
                localResourceRoots: [ resourceDir ]
            }
        );

        const cssDir = Uri.joinPath(resourceDir, "css"),
              jsDir = Uri.joinPath(resourceDir, "js"),
              pageDir = Uri.joinPath(resourceDir, "page"),
              sourceImgDir = Uri.joinPath(resourceDir, "sources"),
              pageUri = this.panel.webview.asWebviewUri(pageDir),
              cssUri = this.panel.webview.asWebviewUri(cssDir),
              jsUri = this.panel.webview.asWebviewUri(jsDir),
              resourceDirUri = this.panel.webview.asWebviewUri(resourceDir),
              sourceImgDirUri = this.panel.webview.asWebviewUri(sourceImgDir);

        this.panel.webview.html = html.replace(/\[webview\.cspSource\]/g, this.panel.webview.cspSource)
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
        this.panel.onDidDispose(() => this.dispose(), this, this.disposables);

        this.panel.onDidChangeViewState(
            e => {
                // if (panel.visible) {
                    // update();
                // }
            },
            null, this.disposables
        );

        this.panel.webview.onDidReceiveMessage
        (
            message => {
                // i think don't await, the caller can't get the final result anyway
                commands.executeCommand("vscode-taskexplorer." + message.command);
            },
            undefined, this.disposables
        );

        this.panel.reveal();
    }


    dispose()
    {
        this.panel.dispose();
        while (this.disposables.length)
        {
            (this.disposables.pop() as Disposable).dispose();
        }
        this.disposed = true;
    }


    getWebviewPanel = () => this.panel;


    reveal(viewColumn?: ViewColumn | undefined, preserveFocus?: boolean | undefined): void
    {
        this.panel.reveal(viewColumn, preserveFocus);
    }

}
