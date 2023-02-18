import { Event, WebviewPanel, WebviewPanelSerializer, WebviewView } from "vscode";

export interface ITeWebview
{
    description?: string;
    title: string;
    originalTitle?: string;
    notify(type: any, params: any, completionId?: string): Promise<boolean>;
    onReadyReceived: Event<void>;
    onContentLoaded: Event<string>;
    serializer?: WebviewPanelSerializer;
    show(options?: any, ...args: any[]): Promise<any>;
    view: WebviewView | WebviewPanel | undefined;
    readonly visible: boolean;
}
