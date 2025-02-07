export function parseResourceString(str: string) {
    // 예: "auth.com/my/path::READ"
    // 1) "::"로 split → [ "auth.com/my/path", "READ" ]
    const [resourceString, actionString] = str.split('::');
    if (!resourceString || !actionString) throw new Error('Invalid format');

    // auth.com = domain | /my/path = path
    const domainIndex = resourceString.indexOf('/');
    const pathBoolean = domainIndex === -1;
    const domain = pathBoolean ? resourceString : resourceString.substring(0, domainIndex);
    const path = pathBoolean ? '' : resourceString.substring(domainIndex + 1);

    return {
        domain,
        path,
        domainPath: `${domain}${pathBoolean ? '' : '/'}${path}`,
        actionString
    };
}
