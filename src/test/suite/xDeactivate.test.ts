
import * as path from "path";
import * as fs from "fs";
import { deactivate } from "../../extension";
import { activate, cleanup, getWsPath } from "../helper";


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
		await cleanup();

		const dirNameCode = getWsPath(".vscode");
		if (fs.existsSync(path.join(dirNameCode))) {
			fs.rmdirSync(dirNameCode, {
				recursive: true
			});
		}
	});

});
