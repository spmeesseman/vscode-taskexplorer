
(function () {
    const vscode = acquireVsCodeApi();


    const enterLicense = () =>
    {
        vscode.postMessage({
            method: 'command/execute',
            params: {
                command: 'vscode-taskexplorer.enterLicense'
            }
        });
    };
    
    const getLicense = () =>
    {
        vscode.postMessage({
            method: 'command/execute',
            params: {
                command: 'vscode-taskexplorer.getLicense'
            }
        });
    };
    
    const showLicensePage = () =>
    {
        vscode.postMessage({
            method: 'command/execute',
            params: {
                command: 'vscode-taskexplorer.showLicensePage'
            }
        });
    };
    
    const showParsingReport = () =>
    {
        vscode.postMessage({
            method: 'command/execute',
            params: {
                command: 'vscode-taskexplorer.showParsingReportPage'
            }
        });
    };
    
    const showReleaseNotes = () =>
    {
        vscode.postMessage({
            method: 'command/execute',
            params: {
                command: 'vscode-taskexplorer.showReleaseNotesPage'
            }
        });
    };

    let elem = document.getElementById("btnEnterlicense");
    if (elem)
    {
        elem.onclick = enterLicense;
    }
    elem = document.getElementById("btnGetLicense");
    if (elem)
    {
        elem.onclick = getLicense;
    }
    elem = document.getElementById("btnViewLicense");
    if (elem)
    {
        elem.onclick = showLicensePage;
    }
    elem = document.getElementById("btnViewReport");
    if (elem)
    {
        elem.onclick = showParsingReport;
    }
    elem = document.getElementById("btnViewReleaseNotes");
    if (elem)
    {
        elem.onclick = showReleaseNotes;
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
            case 'showLicensePage':
                showLicensePage();
                break;
            case 'showParsingReport':
                showParsingReport();
                break;
            case 'showReleaseNotes':
                showReleaseNotes();
                break;
        }
    });

}());
