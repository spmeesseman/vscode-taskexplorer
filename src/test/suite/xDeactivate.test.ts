
import { activate, cleanup } from "../helper";

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
