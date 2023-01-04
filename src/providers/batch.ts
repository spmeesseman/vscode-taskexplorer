
import { TaskExplorerProvider } from "./provider";
import { ScriptTaskProvider } from "./script";

export class BatchTaskProvider extends ScriptTaskProvider implements TaskExplorerProvider
{
    constructor() { super("batch"); }
}
