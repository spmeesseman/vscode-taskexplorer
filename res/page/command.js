let vscode;

function enterLicense()
{
    vscode = vscode || acquireVsCodeApi();
    vscode.postMessage({
        command: 'enterLicense',
        text: ''
    });
}

function getLicense()
{
    vscode = vscode || acquireVsCodeApi();
    vscode.postMessage({
        command: 'getLicense',
        text: ''
    });
}

function viewLicense()
{
    vscode = vscode || acquireVsCodeApi();
    vscode.postMessage({
        command: 'viewLicense',
        text: ''
    });
}

function viewReport()
{
    vscode = vscode || acquireVsCodeApi();
    vscode.postMessage({
        command: 'viewReport',
        text: ''
    });
}

//
// Handle message inside the webview
//
window.addEventListener('message', event =>
{
    const message = event.data; // JSON data from tests
    switch (message.command)
    {
        case 'enterLicense':
            enterLicense();
            break;
        case 'getLicense':
            getLicense();
            break;
        case 'viewLicense':
            viewLicense();
            break;
        case 'viewReport':
            viewReport();
            break;
    }
});
