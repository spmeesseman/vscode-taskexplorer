
import { TaskExplorerProvider } from "./provider";
import { ScriptTaskProvider } from "./script";

export class PythonTaskProvider extends ScriptTaskProvider implements TaskExplorerProvider
{
    constructor() { super("python"); }
}
