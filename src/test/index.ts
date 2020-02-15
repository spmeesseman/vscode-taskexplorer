// import * as path from "path";
// import * as Mocha from "mocha";
// import * as glob from "glob";
// import * as NYC from "nyc";
// 
// export async function run(): Promise<void> {
//   const nyc = new NYC();
//   await nyc.createTempDirectory();
//   // Create the mocha test
//   const mocha = new Mocha({
//     ui: "tdd",
//   });
//   mocha.useColors(true);
// 
//   const testsRoot = path.resolve(__dirname, "..");
// 
//   const files: string[] = await new Promise((resolve, reject) =>
//     glob(
//       "**/**.test.js",
//       {
//         cwd: testsRoot,
//       },
//       (err, files) => {
//         if (err) reject(err);
//         else resolve(files);
//       }
//     )
//   )
// 
//   // Add files to the test suite
//   files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));
// 
//   const failures: number = await new Promise(resolve => mocha.run(resolve));
//   await nyc.writeCoverageFile();
// 
//   if (failures > 0) {
//     throw new Error(`${failures} tests failed.`)
//   }
// }

import * as path from "path";
import * as Mocha from "mocha";
import * as glob from "glob";


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
