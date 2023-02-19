
import { TeWrapper } from "../lib/wrapper";
import { ScriptTaskProvider } from "./script";
import { TaskExplorerProvider } from "./provider";

export class RubyTaskProvider extends ScriptTaskProvider implements TaskExplorerProvider
{
    constructor(wrapper: TeWrapper) { super(wrapper, "ruby"); }
}
