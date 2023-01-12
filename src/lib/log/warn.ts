
import figures from "../figures";
import { _error } from "./error";
import { logControl } from "./log";


const warn = (msg: any, params?: (string|any)[][], queueId?: string) =>
    _error(msg, params, queueId, [ !logControl.isTests || !logControl.isTestsBlockScaryColors ? figures.color.warning : figures.color.warningTests, figures.warning ]);

export default warn;
