
import { TeWrapper } from "../lib/wrapper";
import { TaskExplorerProvider } from "./provider";
import { ScriptTaskProvider } from "./script";

export class NsisTaskProvider extends ScriptTaskProvider implements TaskExplorerProvider
{
    constructor(wrapper: TeWrapper) { super(wrapper, "nsis"); }
}
