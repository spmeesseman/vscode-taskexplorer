import { TeWrapper } from "../../lib/wrapper";


export const removeLicenseButtons = (html: string) =>
{
    if (TeWrapper.instance.licenseManager.isLicensed())
    {
        let idx1 = html.indexOf("<!-- startEnterLicenseButton -->"),
            idx2 = html.indexOf("<!-- endEnterLicenseButton -->") + 30;
        html = html.replace(html.slice(idx1, idx2), "");
        idx1 = html.indexOf("<!-- startGetLicenseButton -->");
        idx2 = html.indexOf("<!-- endGetLicenseButton -->") + 28;
        html = html.replace(html.slice(idx1, idx2), "");
    }
    else {
        html = removeViewLicenseButton(html);
    }
    return html;
};


export const removeViewLicenseButton = (html: string) =>
{
    const idx1 = html.indexOf("<!-- startViewLicenseButton -->"),
          idx2 = html.indexOf("<!-- endViewLicenseButton -->") + 29;
    html = html.replace(html.slice(idx1, idx2), "");
    return html;
};