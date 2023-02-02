import * as fs from "../../lib/utils/fs";
import { testControl as tc, waitForTeIdle } from "./utils";


const createFile = async(fsPath: string, content: string, waitTime?: number) =>
{
    await fs.writeFile(fsPath, content);
    await waitForTeIdle(waitTime || tc.waitTime.fs.createEvent);
};


const writeFile = async(fsPath: string, content: string, waitTime?: number) =>
{
    await fs.writeFile(fsPath, content);
    await waitForTeIdle(waitTime || tc.waitTime.fs.modifyEvent);
};


const deleteFile = async(fsPath: string, waitTime?: number) =>
{
    if (await fs.pathExists(fsPath)) {
        await fs.deleteFile(fsPath);
        await waitForTeIdle(waitTime || tc.waitTime.fs.deleteEvent);
    }
};


const createDir = async(fsPath: string, waitTime?: number) =>
{
    if (!(await fs.pathExists(fsPath))) {
        await fs.createDir(fsPath);
        await waitForTeIdle(waitTime || tc.waitTime.fs.createFolderEvent);
    }
};


const deleteDir = async(fsPath: string, waitTime?: number) =>
{
    if (await fs.pathExists(fsPath)) {
        await fs.deleteDir(fsPath);
        await waitForTeIdle(waitTime || tc.waitTime.fs.createFolderEvent);
    }
};

export default {
    createDir,
    createFile,
    deleteDir,
    deleteFile,
    writeFile
};
