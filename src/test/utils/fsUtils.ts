import * as fs from "../../lib/utils/fs";
import { testControl as tc, waitForTeIdle } from "./utils";


const writeFile = async(fsPath: string, content: string) =>
{
    await fs.writeFile(fsPath, content);
    await waitForTeIdle(tc.waitTime.fs.createEvent);
};

const deleteFile = async(fsPath: string) =>
{
    await fs.deleteFile(fsPath);
    await waitForTeIdle(tc.waitTime.fs.deleteEvent);
};


const createDir = async(fsPath: string) =>
{
    await fs.createDir(fsPath);
    await waitForTeIdle(tc.waitTime.fs.createFolderEvent);
};


const deleteDir = async(fsPath: string) =>
{
    await fs.deleteDir(fsPath);
    await waitForTeIdle(tc.waitTime.fs.createFolderEvent);
};

export default {
    createDir,
    deleteDir,
    deleteFile,
    writeFile
};
