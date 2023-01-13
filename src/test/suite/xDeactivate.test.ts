
import { activate, cleanup } from "../utils";


suite("Deactivate Extension", () =>
{
	suiteSetup(async function()
    {
		await activate(this);
	});

	test("Cleanup", async () =>
	{
		await cleanup();
	});

});
