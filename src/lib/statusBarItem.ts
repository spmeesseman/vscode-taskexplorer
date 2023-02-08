import { ExtensionContext, StatusBarAlignment, StatusBarItem, window } from "vscode";

class TeStatusBarItem
{
    private statusBarNumChars = 65;
    private statusBarItem: StatusBarItem;
    constructor()
    {
        this.statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left, -10000);
        this.statusBarItem.tooltip = "Task Explorer Status";
    }
    get = () => this.statusBarItem.text;
    hide = () => this.statusBarItem.hide();
    init = (context: ExtensionContext) => context.subscriptions.push(this.statusBarItem);
    show = () => this.statusBarItem.show();
    // tooltip = (msg: string) => this.statusBarItem.tooltip = msg;
    update = (msg: string) => this.statusBarItem.text = this.getStatusString(msg);
    private getStatusString = (msg: string) =>
    {
        if (msg.length < this.statusBarNumChars)
        {
            for (let i = msg.length; i < this.statusBarNumChars; i++) {
                msg += " ";
            }
        }
        else {
            msg = msg.substring(0, this.statusBarNumChars - 3) + "...";
        }
        return "$(loading~spin) " + msg;
    };
}

export const registerStatusBarItem = (context: ExtensionContext) =>
{
    statusBarItem.init(context);
};

export const statusBarItem: TeStatusBarItem = new TeStatusBarItem();
