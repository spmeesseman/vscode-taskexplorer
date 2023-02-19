
import { TeWrapper } from "../lib/wrapper";
import { ScriptTaskProvider } from "./script";
import { TaskExplorerProvider } from "./provider";

export class PythonTaskProvider extends ScriptTaskProvider implements TaskExplorerProvider
{
    constructor(wrapper: TeWrapper) { super(wrapper, "python"); }
}
