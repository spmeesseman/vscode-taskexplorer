
import { TeWrapper } from "src/lib/wrapper";
import { Globs } from "../lib/constants";
import { configuration } from "../lib/utils/configuration";
import { getCombinedGlobPattern } from "../lib/utils/utils";
import { TaskExplorerProvider } from "./provider";
import { ScriptTaskProvider } from "./script";

export class BashTaskProvider extends ScriptTaskProvider implements TaskExplorerProvider
{
    constructor(wrapper: TeWrapper) { super(wrapper, "bash"); }

    public override getGlobPattern()
    {
        return getCombinedGlobPattern(Globs.GLOB_BASH, configuration.get<string[]>("globPatternsBash", []));
    }

}
