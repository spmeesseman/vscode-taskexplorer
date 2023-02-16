import { TeWrapper } from "../../lib/wrapper";


export const removeLicenseButtons = (wrapper: TeWrapper, html: string) =>
{
    if (wrapper.licenseManager.isLicensed())
    {
        let idx1 = html.indexOf("<button data-action=\"command:taskexplorer.enterLicense\""),
            idx2 = html.lastIndexOf("<div class=\"te-button-container", idx1),
            idx3 = html.indexOf("</div>", idx2);
        html = html.replace(html.slice(idx2, idx3), "");

        idx1 = html.indexOf("<button data-action=\"command:taskexplorer.getLicense\"");
        idx2 = html.lastIndexOf("<div class=\"te-button-container", idx1);
        idx3 = html.indexOf("</div>", idx2);
        html = html.replace(html.slice(idx2, idx3), "");
    }
    else {
        html = removeViewLicenseButton(html);
    }
    return html;
};


export const removeViewLicenseButton = (html: string) =>
{
    const idx1 = html.indexOf("<button data-action=\"command:taskexplorer.view.licensePage.show\""),
          idx2 = html.lastIndexOf("<div class=\"te-button-container", idx1),
          idx3 = html.indexOf("</div>", idx2);
    html = html.replace(html.slice(idx2, idx3), "");
    return html;
};
