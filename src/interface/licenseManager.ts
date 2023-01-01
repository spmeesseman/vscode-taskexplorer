import { Task } from "vscode";

export interface ILicenseManager
{
    enterLicenseKey: () => Promise<void>;
    getLicenseKey: () => string | undefined;
    getMaxNumberOfTasks: () => number;
    getMaxNumberOfTaskFiles: () => number;
    getMaxNumberOfTasksByType: (taskType: string) => number;
    getVersion: () => string;
    checkLicense: (logPad: string) => Promise<void>;
    setLicenseKey: (licenseKey: string | undefined) => Promise<void>;
    setTasks: (tasks: Task[], logPad: string) => Promise<void>;
}
