import * as path from "path";
import * as Mocha from "mocha";
import * as glob from "glob";

// function _readCoverOptions(testsRoot: string): ITestRunnerOptions | undefined
// {
//     const coverConfigPath = paths.join(testsRoot, testOptions.coverConfig);
//     let coverConfig: ITestRunnerOptions | undefined;
//     if (fs.existsSync(coverConfigPath))
//     {
//         const configContent = fs.readFileSync(coverConfigPath, {
//             encoding: "utf8"
//         });
//         coverConfig = JSON.parse(configContent);
//     }
//     return coverConfig;
// }

export function run(testsRoot: string, cb: (error: any, failures?: number) => void): void
{
    // Create the mocha test
    const mocha = new Mocha({
        ui: "tdd",
        timeout: 30000, // default timeout: 10 seconds
        retries: 1
    });
    mocha.useColors(true);

    glob("**/**.test.js", { cwd: testsRoot }, (err, files) =>
    {
        if (err) {
            return cb(err);
        }

        // Add files to the test suite
        files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

        try {
            // Run the mocha test
            mocha.run(failures => {
                // tslint:disable-next-line: no-null-keyword
                cb(null, failures);
            });
        } catch (err) {
            console.error(err);
            cb(err);
        }
    });
}
