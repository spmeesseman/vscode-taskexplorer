
import * as fs from "fs";
import * as path from "path";
import { deactivate } from "../../extension";
import { activate, getWsPath } from "../helper";


suite("Deactivate Extension", () =>
{
	suiteSetup(async () =>
    {
		await activate();
	});

	test("Deactivate extension", async () =>
	{
		await deactivate();
	});

	test("Cleanup", async () =>
	{
		const dirNameCode = getWsPath(".vscode"),
			  settingsFile = path.join(dirNameCode, "settings.json"),
			  tasksFile = path.join(dirNameCode, "tasks.json");

		if (fs.existsSync(settingsFile)) {
			fs.unlinkSync(settingsFile);
		}
		if (fs.existsSync(tasksFile)) {
			fs.unlinkSync(tasksFile);
		}
		if (fs.existsSync(dirNameCode)) {
			fs.rmdirSync(dirNameCode, {
				recursive: true
			});
		}
	});

});
