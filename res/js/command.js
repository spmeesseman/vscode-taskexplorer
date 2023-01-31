
(function () {
    const vscode = acquireVsCodeApi();


    const enterLicense = () =>
    {
        vscode.postMessage({
            command: 'enterLicense',
            text: ''
        });
    };
    
    const getLicense = () =>
    {
        vscode.postMessage({
            command: 'getLicense',
            text: ''
        });
    };
    
    const viewLicense = () =>
    {
        vscode.postMessage({
            command: 'viewLicense',
            text: ''
        });
    };
    
    const viewReport = () =>
    {
        vscode.postMessage({
            command: 'viewReport',
            text: ''
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
        elem.onclick = viewLicense;
    }
    elem = document.getElementById("btnViewReport");
    if (elem)
    {
        elem.onclick = viewReport;
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

}());
