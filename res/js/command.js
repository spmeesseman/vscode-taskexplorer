
(function () {
    const vscode = acquireVsCodeApi();


    const enterLicense = () =>
    {
        vscode.postMessage({
            params: 'enterLicense',
            method: 'command/execute'
        });
    };
    
    const getLicense = () =>
    {
        vscode.postMessage({
            params: 'getLicense',
            method: 'command/execute'
        });
    };
    
    const showLicensePage = () =>
    {
        vscode.postMessage({
            params: 'showLicensePage',
            method: 'command/execute'
        });
    };
    
    const showParsingReport = () =>
    {
        vscode.postMessage({
            params: 'showParsingReport',
            method: 'command/execute'
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
        }
    });

}());
