
import { TaskExplorerProvider } from "./provider";
import { ScriptTaskProvider } from "./script";

export class PerlTaskProvider extends ScriptTaskProvider implements TaskExplorerProvider
{
    constructor() { super("perl"); }
}
