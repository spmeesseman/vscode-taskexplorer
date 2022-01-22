
import { deactivate } from "../../extension";
import { activate, cleanup } from "../helper";


suite("Deactivate extension", () =>
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
	});

});
