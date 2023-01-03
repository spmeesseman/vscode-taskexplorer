import { Task, WebviewPanel } from "vscode";

export interface ILicenseManager
{
    checkLicense: (logPad?: string) => Promise<void>;
    enterLicenseKey: () => Promise<void>;
    getLicenseKey: () => string | undefined;
    getMaxNumberOfTasks: () => number;
    getMaxNumberOfTaskFiles: () => number;
    getMaxNumberOfTasksByType: (taskType: string) => number;
    getVersion: () => string;
    getWebviewPanel: () => WebviewPanel | undefined;
    isLicensed: () => boolean;
    setLicenseKey: (licenseKey: string | undefined) => Promise<void>;
    setTasks: (tasks: Task[], logPad?: string) => Promise<void>;
}
