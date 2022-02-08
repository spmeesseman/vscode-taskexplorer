/* eslint-disable prefer-arrow/prefer-arrow-functions */

// import * as log from "./log";
// import { storage } from "./storage";
// import { InputBoxOptions, ViewColumn, WebviewPanel, window } from "vscode";
//
//
// let panel: WebviewPanel | undefined;
//
//
// export async function displayInfoPage(version: string)
// {
//     let displayInfo = false, displayPopup = false;
//     const storedVersion = storage.get<string>("version");
//
//     log.methodStart("display info startup page", 1, "", false, [["stored version", storedVersion]]);
//
//     let content = getHeaderContent();
//
//     if (version !== storedVersion)
//     {
//         content += getInfoContent();
//         displayInfo = true;
//     }
//
//     const hasLicense = checkLicense();
//     if (!hasLicense)
//     {
//         content += getLicenseContent();
//         displayPopup = !displayInfo;
//         // displayInfo = true; // temp
//     }
//
//     content += getFooterContent();
//
//     if (displayInfo)
//     {
//         panel = window.createWebviewPanel(
//             "taskExplorer",    // Identifies the type of the webview. Used internally
//             "Task Explorer",   // Title of the panel displayed to the users
//             ViewColumn.One,    // Editor column to show the new webview panel in.
//             {}                 // Webview options.
//         );
//         panel.webview.html = content;
//         panel.reveal();
//         await storage.update("version", version);
//     }
//     else if (displayPopup)
//     {
//         const msg = "Purchase a license to unlock unlimited tasks.",
//               action = await window.showInformationMessage(msg, "Purchase", "Not Now");
//
//         if (action === "Purchase")
//         {
//             const opts: InputBoxOptions = { prompt: "Enter license key" };
//             await window.showInputBox(opts).then(async (str) =>
//             {
//                 if (str !== undefined)
//                 {
//                     await storage.update("license_key", str);
//                 }
//             });
//         }
//     }
//
//     log.methodDone("display info startup page", 1, "", false, [["has license", hasLicense]]);
//
//     return panel;
// }
//
//
// function checkLicense()
// {
//     let validLicense = false;
//     const storedLicenseKey = getLicenseKey();
//
//     log.methodStart("check license", 1, "   ", false, [["stored license key", storedLicenseKey]]);
//
//     if (storedLicenseKey)
//     {
//         validLicense = validateLicense(storedLicenseKey);
//     }
//
//     log.methodDone("check license", 1, "   ", false, [["valid license", validLicense]]);
//     return validLicense;
// }
//
//
// // function closeWebView()
// // {
// //     panel?.dispose();
// // }
//
//
// export function getLicenseKey()
// {
//     return storage.get<string>("license_key");
// }
//
//
// function getFooterContent()
// {
//     return "</body></html>";
// }
//
//
// function getHeaderContent()
// {
//     return `<!DOCTYPE html>
// <html lang="en">
//   <head>
//     <meta charset="UTF-8">
//     <meta name="viewport" content="width=device-width, initial-scale=1.0">
//     <title>Task Explorer</title>
//   </head>
//   <body style="padding:20px">
//     <table>
//         <tr>
//             <td>
//                 <img src="https://raw.githubusercontent.com/spmeesseman/vscode-taskexplorer/master/res/gears-r-colors.png" height="50" />
//             </td>
//             <td valign="middle" style="font-size:40px;font-weight:bold"> &nbsp;Task Explorer</td>
//         </tr>
//         </table>
//         <table style="margin-top:15px">
//         <tr>
//             <td>
//                 <img src="https://raw.githubusercontent.com/spmeesseman/vscode-taskexplorer/master/res/sources/npm.png" />
//             </td>
//             <td>
//                 <img src="https://raw.githubusercontent.com/spmeesseman/vscode-taskexplorer/master/res/sources/ant.png" />
//             </td>
//             <td>
//                 <img src="https://raw.githubusercontent.com/spmeesseman/vscode-taskexplorer/master/res/sources/yarn.png" />
//             </td>
//             <td>
//                 <img src="https://raw.githubusercontent.com/spmeesseman/vscode-taskexplorer/master/res/sources/grunt.png" />
//             </td>
//             <td>
//                 <img src="https://raw.githubusercontent.com/spmeesseman/vscode-taskexplorer/master/res/sources/gulp.png" />
//             </td>
//             <td>
//                 <img src="https://raw.githubusercontent.com/spmeesseman/vscode-taskexplorer/master/res/sources/php.png" />
//             </td>
//             <td>
//                 <img src="https://raw.githubusercontent.com/spmeesseman/vscode-taskexplorer/master/res/sources/workspace.png" />
//             </td>
//             <td>
//                 <img src="https://raw.githubusercontent.com/spmeesseman/vscode-taskexplorer/master/res/sources/make.png" />
//             </td>
//             <td>
//                 <img src="https://raw.githubusercontent.com/spmeesseman/vscode-taskexplorer/master/res/sources/ts.png" />
//             </td>
//             <td>
//                 <img src="https://raw.githubusercontent.com/spmeesseman/vscode-taskexplorer/master/res/sources/bat.png" />
//             </td>
//             <td>
//                 <img src="https://raw.githubusercontent.com/spmeesseman/vscode-taskexplorer/master/res/sources/ruby.png" />
//             </td>
//             <td>
//                 <img src="https://raw.githubusercontent.com/spmeesseman/vscode-taskexplorer/master/res/sources/powershell.png" />
//             </td>
//             <td>
//                 <img src="https://raw.githubusercontent.com/spmeesseman/vscode-taskexplorer/master/res/sources/bash.png" />
//             </td>
//             <td>
//                 <img src="https://raw.githubusercontent.com/spmeesseman/vscode-taskexplorer/master/res/sources/python.png" />
//             </td>
//             <td>
//                 <img src="https://raw.githubusercontent.com/spmeesseman/vscode-taskexplorer/master/res/sources/nsis.png" />
//             </td>
//             <td>
//                 <img src="https://raw.githubusercontent.com/spmeesseman/vscode-taskexplorer/master/res/sources/perl.png" />
//             </td>
//             <td>
//                 <img src="https://raw.githubusercontent.com/spmeesseman/vscode-taskexplorer/master/res/sources/maven.png" />
//             </td>
//         </tr>
//     </table>`;
// }
//
//
// function getLicenseContent()
// {
//     return '<table style="margin-top:15px"><tr><td>Purchase a license!!</td></tr></table>';
// }
//
//
// function getInfoContent()
// {
//     return `<table style="margin-top:15px">
//         <tr>
//             <td style="font-size:16px;font-weight:bold">
//                 What's new in v3.0
//             </td>
//         </tr>
//         <tr>
//             <td>
//                 <ul>
//                     <li></li>
//                     <li></li>
//                     <li></li>
//                 </ul>
//             </td>
//         </tr>
//         </tr>
//     </table>`;
// }
//
//
// export async function setLicenseKey(licenseKey: string | undefined)
// {
//     await storage.update("license_key", licenseKey);
// }
//
//
// function validateLicense(licenseKey: string)
// {
//     return !!licenseKey;
// }
//