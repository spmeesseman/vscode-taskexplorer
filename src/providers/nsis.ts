
import { TaskExplorerProvider } from "./provider";
import { ScriptTaskProvider } from "./script";

export class NsisTaskProvider extends ScriptTaskProvider implements TaskExplorerProvider
{
    constructor() { super("nsis"); }
}
