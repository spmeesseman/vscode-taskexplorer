
import { TaskExplorerProvider } from "./provider";
import { ScriptTaskProvider } from "./script";

export class PowershellTaskProvider extends ScriptTaskProvider implements TaskExplorerProvider
{
    constructor() { super("powershell"); }
}
