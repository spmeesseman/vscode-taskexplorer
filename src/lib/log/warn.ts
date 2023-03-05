
import { error } from "./error";
import { logControl } from "./log";
import { figures } from "../utils/figures";

export const warn = (msg: any, params?: (string|any)[][], queueId?: string) =>
    error(msg, params, queueId, [ !logControl.isTests || !logControl.isTestsBlockScaryColors ? figures.color.warning : figures.color.warningTests, figures.warning ]);
