
import * as fs from "fs";
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
		const dirNameCode = getWsPath(".vscode");
		if (fs.existsSync(dirNameCode)) {
			fs.rmdirSync(dirNameCode, {
				recursive: true
			});
		}
	});

});
