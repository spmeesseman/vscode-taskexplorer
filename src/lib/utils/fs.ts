
import * as fs from "fs";
import * as path from "path";
//import { isString } from "../../common/utils";

let cwd = process.cwd();

/*
export function appendFile(file: string, data: string): Promise<void>
{
    return new Promise<void>((resolve, reject) =>
    {
        // file deepcode ignore WrongNumberOfArgs: invalid warning????
        fs.appendFile(path.resolve(cwd, file), data, (err) =>
        {
            if (err) {
                reject(err);
            }
            resolve();
        });
    });
}


export function copyFile(src: string, dst: string)
{
    return new Promise<void>(async (resolve, reject) =>
    {
        const srcFile = path.resolve(cwd, src);
        if (!await pathExists(srcFile)) {
            reject(new Error("Invalid source file path"));
        }
        //
        // If dst is a directory, a new file with the same name will be created
        //
        let fullPath = path.resolve(cwd, dst);
        if (await pathExists(fullPath))
        {
            if (fs.lstatSync(fullPath).isDirectory()) {
                fullPath = path.join(fullPath, path.basename(src));
            }
        }
        fs.copyFile(srcFile, fullPath, (err) =>
        {
            if (err) {
                reject(err);
            }
            resolve();
        });
    });
}


export function copyDir(src: string, dst: string, filter?: RegExp, copyWithBaseFolder = false)
{
    return new Promise<boolean>(async (resolve, reject) =>
    {
        const srcDir = path.resolve(cwd, src);
        if (!await pathExists(srcDir)) {
            reject(new Error("Invalid source directory path"));
            return;
        }

        if (!fs.lstatSync(srcDir).isDirectory()) {
            resolve(false);
            return;
        }
        //
        // Check if folder needs to be created or merged
        //
        let tgtDir;
        if (!copyWithBaseFolder) {
            tgtDir = path.resolve(cwd, dst);
        }
        else {
            tgtDir = path.join(path.resolve(cwd, dst), path.basename(src));
        }
        if (!await pathExists(tgtDir))
        {
            try { await createDir(tgtDir); } catch (e){ reject(e); return; };
        }
        //
        // Copy
        //
        const files = fs.readdirSync(srcDir);
        for (const file of files)
        {
            const newSrc = path.join(srcDir, file);
            if (fs.existsSync(newSrc) && fs.lstatSync(newSrc).isDirectory())
            {
                await copyDir(newSrc, tgtDir, filter, true);
            }
            else {
                if (filter)
                {
                    if (filter.test(newSrc)) {
                        await copyFile(newSrc, tgtDir);
                    }
                }
                else {
                    await copyFile(newSrc, tgtDir);
                }
            }
        }

        resolve(true);
    });
}
*/


export function createDir(dir: string)
{
    return new Promise<void>(async (resolve, reject) =>
    {
        const newDir = path.resolve(cwd, dir);
        if (!await pathExists(newDir))
        {
            const baseDir = path.dirname(dir);
            if (!(await pathExists(baseDir)))
            {
                try { await createDir(baseDir); } catch (e){ reject(e); return; };
            }
            fs.mkdir(path.resolve(cwd, dir), { mode: 0o777 }, (err) =>
            {
                // istanbul ignore if //
                if (err) {
                    reject(err);
                }
                resolve();
            });
        }
        else {
            resolve();
        }
    });
}

/*
export function deleteDir(dir: string): Promise<void>
{
    return new Promise<void>(async (resolve, reject) =>
    {
        if (await pathExists(dir))
        {
            fs.rmdir(path.resolve(cwd, dir), { recursive: true }, (e) =>
            {
                if (e) {
                    reject(e);
                }
                resolve();
            });
        }
        else {
            resolve();
        }
    });
}
*/
/*
export function deleteFile(file: string): Promise<void>
{
    return new Promise<void>(async (resolve, reject) =>
    {
        if (await pathExists(file))
        {
            fs.unlink(path.resolve(cwd, file), (e) =>
            {
                if (e) {
                    reject(e);
                }
                resolve();
            });
        }
        else {
            resolve();
        }
    });
}


export function getDateModified(file: string)
{
    return new Promise<Date|undefined>(async (resolve, reject) =>
    {
        if (!await pathExists(file)) {
            reject(new Error("Invalid file path"));
            return;
        }
        fs.stat(file, { bigint: true }, (e, stats) =>
        {
            if (e) {
                reject(e);
            }
            resolve(stats.mtime);
        });
    });
}
*/


export function isDirectory(dirPath: string)
{
    return fs.existsSync(dirPath) && fs.lstatSync(dirPath).isDirectory();
}


export function numFilesInDirectory(dirPath: string): Promise<number>
{
    return new Promise((resolve, reject) =>
    {
        if (fs.existsSync(dirPath))
        {
            fs.readdir(dirPath, (err, files) =>
            {
                /* istanbul ignore else */
                if (!err) {
                    resolve(files.length);
                }
                else reject(err); 
            });
        }
        else { reject(new Error("Invalid directory does not exist")); }
    });
}


export function pathExists(file: string): Promise<boolean>
{
    return new Promise<boolean>((resolve, reject) =>
    {
        fs.access(path.resolve(cwd, file), (e) =>
        {
            if (e) {
                resolve(false);
            }
            resolve(true);
        });
    });
}


export function readFileAsync(file: string): Promise<string>
{
    return new Promise<string>(async (resolve, reject) =>
    {
        try {
            const buf = await readFileBufAsync(file);
            /* istanbul ignore else */
            if (buf) {
                resolve(buf.toString("utf8"));
            }
            else {
                resolve("");
            }
        }
        catch (e) { /* istanbul ignore next */ reject(e); }
    });
}


export function readJsonAsync<T>(file: string): Promise<T>
{
    return new Promise<T>(async (resolve, reject) =>
    {
        try {
            const json = await readFileAsync(file),
                  jso = JSON.parse(json) as T;
            resolve(jso);
        }
        catch (e) { reject(e); }
    });
}


function readFileBufAsync(file: string): Promise<Buffer>
{
    return new Promise<Buffer>(async (resolve, reject) =>
    {
        fs.readFile(path.resolve(cwd, file), (e, data) =>
        {
            /* istanbul ignore else */
            if (!e) {
                resolve(data);
            }
            else {
                reject(e);
            }
        });
    });
}

/*
export function renameFile(fileCurrent: string, fileNew: string): Promise<void>
{
    return new Promise<void>(async (resolve, reject) =>
    {
        if (await pathExists(fileCurrent))
        {
            fs.rename(path.resolve(cwd, fileCurrent), path.resolve(cwd, fileNew), (e) =>
            {
                if (e) {
                    reject(e);
                }
                resolve();
            });
        }
        else {
            reject(new Error("Invalid source file path"));
        }
    });
}
*/

// /**
//  * Replace text in a file, for use with version # replacement
//  *
//  * @param file The file
//  * @param old Text or regex pattern to replace
//  * @param nu Text to insert in place of 'old'
//  * @param caseSensitive `true` to make the replacement case sensitive
//  */
// export async function replaceInFile(file: string, old: string, nu: string | ((m: RegExpExecArray) => string), caseSensitive = true)
// {
//     if (await pathExists(file))
//     {
//         let contentNew: string | undefined;
//         const content = await readFile(file),
//               regex = new RegExp(old, caseSensitive ? "gm" : "gmi");
// 
//         if (isString(nu))
//         {
//             if (caseSensitive) {
//                 contentNew = content.replace(regex, nu);
//             }
//             else {
//                 contentNew = content.replace(new RegExp(regex, "i"), nu);
//             }
//         }
//         else
//         {
//             let match: RegExpExecArray | null;
//             while ((match = regex.exec(content)) !== null) {
//                 contentNew = content.replace(new RegExp(old, caseSensitive ? "gm" : "gmi"), nu(match));
//             }
//         }
// 
//         if (contentNew && content !== contentNew)
//         {
//             await writeFile(file, contentNew);
//             return true;
//         }
//     }
// 
//     return false;
// }
// 
// 
// export function setCwd(dir: string)
// {
//     cwd = dir;
// }
// 
// 
// /**
//  * Overwrites file if it exists
//  *
//  * @param file The file path to write to
//  * @param data The data to write
//  */
// export function writeFile(file: string, data: string): Promise<void>
// {
//     return new Promise<void>((resolve, reject) =>
//     {
//         if (!isDirectory(file))
//         {
//             fs.writeFile(path.resolve(cwd, file), data, (err) =>
//             {
//                 if (err) {
//                     reject(err);
//                 }
//                 resolve();
//             });
//         }
//         else {
//             reject(new Error("Specified path is a directory"));
//         }
//     });
// }
// 