import { TeContainer } from "../../lib/container";


export const removeLicenseButtons = (html: string) =>
{
    if (TeContainer.instance.licenseManager.isLicensed())
    {
        let idx1 = html.indexOf("<!-- startEnterLicenseButton -->"),
            idx2 = html.indexOf("<!-- endEnterLicenseButton -->") + 30;
        html = html.replace(html.slice(idx1, idx2), "");
        idx1 = html.indexOf("<!-- startGetLicenseButton -->");
        idx2 = html.indexOf("<!-- endGetLicenseButton -->") + 28;
        html = html.replace(html.slice(idx1, idx2), "");
    }
    return html;
};
