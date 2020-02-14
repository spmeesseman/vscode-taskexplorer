import * as path from "path";
import { runTests } from "vscode-test";

async function main()
{
    const extensionDevelopmentPath = path.resolve(__dirname, "../../");
    const extensionTestsPath = path.resolve(__dirname, "../../out/test");
    const testWorkspace = extensionTestsPath; //path.resolve(__dirname, '../../../test-fixtures/fixture1');

    try {
        await runTests({
            version: process.env.CODE_VERSION,
            extensionDevelopmentPath,
            extensionTestsPath,
            launchArgs: [testWorkspace]
        });
    } catch (err) {
        console.error(`Failed to run tests: ${err}\n${err.stack}`);
        process.exit(1);
    }
}

main();
