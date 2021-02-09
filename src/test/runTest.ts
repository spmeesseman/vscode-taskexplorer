import * as path from "path";
// eslint-disable-next-line import/no-extraneous-dependencies
import { runTests } from "vscode-test";

// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
async function main()
{
    const extensionDevelopmentPath = path.resolve(__dirname, "../../");
    const extensionTestsPath = path.resolve(__dirname, "../../out/test");

    try {
        await runTests({
            version: process.env.CODE_VERSION,
            extensionDevelopmentPath,
            extensionTestsPath,
            launchArgs: [extensionTestsPath]
        });
    } catch (err) {
        console.error(`Failed to run tests: ${err}\n${err.stack}`);
        process.exit(1);
    }
}

main();
