import { AppDataSource } from './data-source';
import { User } from './entity/User';
import { EncryptionKey } from './entity/EncryptionKey';
import dotenv from 'dotenv';
import { DEFAULT_ADMIN_USERNAME, DEFAULT_LAST_LOGIN_IP, DEFAULT_LAST_LOGIN_LOCATION, DEFAULT_PERMISSIONS } from './constants/seed.constants';
import { Permission } from './entity/Permission';
import { hashPassword } from './utils/hashUtil';
dotenv.config({ path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development' });

async function seed() {
    try {
        // 데이터베이스 연결
        await AppDataSource.initialize();
        console.log('데이터베이스 연결 완료. 시딩을 시작합니다.');

        // 시드 프로세스 1: 관리자 계정이 없으면 생성
        const userRepo = AppDataSource.getRepository(User);
        const adminUser = await userRepo.findOne({ where: { username: DEFAULT_ADMIN_USERNAME } });
        if (!adminUser) {
            const newAdmin = new User();
            newAdmin.username = DEFAULT_ADMIN_USERNAME;
            newAdmin.passwordHash = await hashPassword(process.env.SUPER_USER_PASSWORD as string);
            newAdmin.isActive = true;
            newAdmin.isDeleted = false;
            newAdmin.lastLoginAt = new Date();
            newAdmin.lastLoginIp = DEFAULT_LAST_LOGIN_IP;
            newAdmin.lastLoginLocation = DEFAULT_LAST_LOGIN_LOCATION;
            newAdmin.failedLoginCount = 0;
            newAdmin.failedLoginAt = undefined;
            await userRepo.save(newAdmin);
            console.log('관리자 계정을 시딩했습니다.');
        } else {
            console.log('관리자 계정이 이미 존재합니다.');
        }

        // 시드 프로세스 2: 기본 암호화 키가 없으면 생성
        const encryptionKeyRepo = AppDataSource.getRepository(EncryptionKey);
        const activeKey = await encryptionKeyRepo.findOne({ where: { isActive: true } });
        if (!activeKey) {
            const newKey = encryptionKeyRepo.create({
                aesKey: process.env.AES_KEY as string,
                aesIv: process.env.AES_IV as string,
                isActive: true,
            });
            await encryptionKeyRepo.save(newKey);
            console.log('기본 암호화 키를 시딩했습니다.');
        } else {
            console.log('기본 암호화 키가 이미 존재합니다.');
        }

        /**
         * 시드 프로세스 3: 기본 권한 생성
         * 기본 권한은 admin에게 부여되는 모든 권한을 포함하는 권한입니다. 해당 권한은 권한을 관리하는 서비스를 관리할 수 있습니다.
         * permissionName | resource | action
         * getPermission | auth/admin | READ
         * deletePermission | auth/admin | DELETE
         * grantPermission | auth/admin | WRITE
         * adminPermission | auth/admin | ALL
         */
        const permissionRepo = AppDataSource.getRepository(Permission);

        // 관리자 userId
        const reSearchAdminUser = await userRepo.findOne({ where: { username: DEFAULT_ADMIN_USERNAME } });
        if (!reSearchAdminUser) {
            throw new Error('관리자 계정이 존재하지 않습니다.');
        }

        const adminUserId = reSearchAdminUser.id;

        for (const permission of DEFAULT_PERMISSIONS) {
            const existingPermission = await permissionRepo.findOne({ where: { permissionName: permission.permissionName, resource: permission.resource, action: permission.action } });
            if (!existingPermission) {
                const newPermission = new Permission();
                newPermission.permissionName = permission.permissionName;
                newPermission.resource = permission.resource;
                newPermission.action = permission.action;
                newPermission.userId = adminUserId;
                await permissionRepo.save(newPermission);
                console.log(`기본 권한 ${permission.permissionName}을 시딩했습니다.`);
            } else {
                console.log(`기본 권한 ${permission.permissionName}이 이미 존재합니다.`);
            }
        }

        // 추가적으로 시딩할 데이터가 있으면 여기에 작성하세요.

        console.log('시딩 완료.');
        await AppDataSource.destroy();
        process.exit(0);
    } catch (error) {
        console.error('시딩 도중 오류 발생:', error);
        process.exit(1);
    }
}

seed();