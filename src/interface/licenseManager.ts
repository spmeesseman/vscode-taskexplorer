import { Task } from "vscode";

export interface ILicenseManager
{
    enterLicenseKey: () => Promise<boolean>;
    getLicenseKey: () => string | undefined;
    getVersion: () => string;
    initialize: (tasks: Task[]) => Promise<void>;
    setLicenseKey: (licenseKey: string | undefined) => Promise<void>;
}
