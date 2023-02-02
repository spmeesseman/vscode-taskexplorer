
import constants from "../lib/constants";
import { configuration } from "../lib/utils/configuration";
import { getCombinedGlobPattern } from "../lib/utils/utils";
import { TaskExplorerProvider } from "./provider";
import { ScriptTaskProvider } from "./script";

export class BashTaskProvider extends ScriptTaskProvider implements TaskExplorerProvider
{
    constructor() { super("bash"); }

    public override getGlobPattern()
    {
        return getCombinedGlobPattern(constants.GLOB_BASH, configuration.get<string[]>("globPatternsBash", []));
    }

}
