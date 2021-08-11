import { execSync } from "child_process";
import * as path from "path";
// eslint-disable-next-line import/no-extraneous-dependencies
import { runTests } from "vscode-test";

// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
async function main()
{
    try {
        const extensionDevelopmentPath = path.resolve(__dirname, "../../");
        const extensionTestsPath = path.resolve(__dirname, "../../dist/test");
        // const extensionTestsWsPath = path.resolve(__dirname, "../../testFixture");
        const extensionTestsWsPath = extensionTestsPath;

        console.log("clear package.json activation event");
        execSync("enable-full-coverage.sh", { cwd: "tools" });

        await runTests({
            version: process.env.CODE_VERSION,
            extensionDevelopmentPath,
            extensionTestsPath,
            launchArgs: [ extensionTestsWsPath, "--disable-extensions", "--disable-workspace-trust" ]
        });

        console.log("restore package.json activation event");
        execSync("enable-full-coverage.sh --off", { cwd: "tools" });
    } catch (err) {
        console.error(`Failed to run tests: ${err}\n${err.stack ?? "No call stack details found"}`);
        console.log("restore package.json activation event");
        execSync("enable-full-coverage.sh --off", { cwd: "tools" });
        process.exit(1);
    }
}

main();
