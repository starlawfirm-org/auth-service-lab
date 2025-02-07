// src/services/PermissionService.ts
import { AppDataSource } from '../data-source';
import { Permission } from '../entity/Permission';
import { grantPermission, getPermission, deletePermission, resource, actionType } from '../constants/repo.constants';


export class PermissionService {
    private static permissionRepo = AppDataSource.getRepository(Permission);
    private static permissionMap: Map<string, string> = new Map();

    static initPermissionMap() {
        this.permissionMap.set(grantPermission, `${resource}::WRITE`);
        this.permissionMap.set(getPermission, `${resource}::READ`);
        this.permissionMap.set(deletePermission, `${resource}::DELETE`);
    }

    static verifyPermission(resource: string, action: actionType): boolean {
        const actionList: actionType[] = ['ALL', 'READ', 'WRITE', 'DELETE'];
        if (!actionList.includes(action)) {
            return false;
        }

        // DB를 사용하지 않고 권한 검사
        const grantPermission = this.permissionMap.get(`grantPermission`);
        const getPermission = this.permissionMap.get(`getPermission`);
        const deletePermission = this.permissionMap.get(`deletePermission`);
        if (!grantPermission || !getPermission || !deletePermission) {
            return false;
        }
        const [resourceCompare, actionCompare] = grantPermission.split('::');
        if (resource !== resourceCompare) {
            return false;
        }
        if (action === 'ALL') {
            return true;
        }
        if (action === actionCompare) {
            return true;
        }
        return false;
    }

    // 유저가 특정 resource, action 권한을 가지고 있는지 여부 확인
    static async userHasPermission(userId: string, resource: string, action: string): Promise<boolean> {
        const found = await this.permissionRepo.findOne({
            where: { userId, resource, action },
        });
        return !!found;
    }

    // 권한 부여 (중복 체크)
    static async grantPermission(permissionName: string, userId: string, resource: string, action: string) {
        // 중복 조회
        const existing = await this.permissionRepo.findOne({ where: { permissionName, userId, resource, action } });
        if (existing) {
            return existing; // 이미 존재하면 그대로 반환
        }
        const perm = this.permissionRepo.create({ permissionName, userId, resource, action });
        return this.permissionRepo.save(perm);
    }
}
