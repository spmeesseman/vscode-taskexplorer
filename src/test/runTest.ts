import * as path from "path";
import { runTests } from "vscode-test";
//import { configuration } from "../common/configuration";

async function go() {
  const extensionPath = path.resolve(__dirname, "../../");
  const testRunnerPath = path.resolve(__dirname, "../../out/test");
  const testWorkspace = path.resolve(__dirname, "../../");

  try {

    //configuration.update('enableExplorerView', true);
    //configuration.update('enableSideBar', true);
    //configuration.update('includeAnt', ["**/test.xml", "**/emptytarget.xml", "**/emtyproject.xml"]);
    //configuration.update('debug', true);

    await runTests({
      version: process.env.CODE_VERSION,
      extensionPath,
      testRunnerPath,
      testWorkspace
    });
  } catch (err) {
    console.error(`Failed to run tests: ${err}\n${err.stack}`);
    process.exit(1);
  }
}

go();
