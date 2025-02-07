export const DEFAULT_ADMIN_USERNAME = 'admin';
export const DEFAULT_LAST_LOGIN_IP = '127.0.0.1';
export const DEFAULT_LAST_LOGIN_LOCATION = 'Seoul, Korea';
export const DEFAULT_PERMISSIONS = [
    { permissionName: 'getPermission', resource: 'auth/admin', action: 'READ' },
    { permissionName: 'deletePermission', resource: 'auth/admin', action: 'DELETE' },
    { permissionName: 'grantPermission', resource: 'auth/admin', action: 'WRITE' },
    { permissionName: 'adminPermission', resource: 'auth/admin', action: 'ALL' },
];
