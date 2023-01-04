
import { TaskExplorerProvider } from "./provider";
import { ScriptTaskProvider } from "./script";

export class RubyTaskProvider extends ScriptTaskProvider implements TaskExplorerProvider
{
    constructor() { super("ruby"); }
}
