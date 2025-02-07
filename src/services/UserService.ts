// src/services/UserService.ts
import { AppDataSource } from '../data-source';
import { User } from '../entity/User';
import { FpjsData } from '../utils/fingerprintUtils';
import { hashPassword, comparePassword } from '../utils/hashUtil';

export class UserService {
    private static userRepo = AppDataSource.getRepository(User);

    static async createUser(username: string, password: string, ipAddress: string | null, fpjsData: FpjsData | null) {
        const existing = await this.userRepo.findOne({ where: { username } });
        if (existing) {
            throw new Error('Username already exists');
        }
        const passwordHash = await hashPassword(password);

        const createUserData: Partial<User> = {
            username,
            passwordHash,
        };

        if (ipAddress) {
            createUserData.lastLoginIp = ipAddress;
        }   
        if (fpjsData) {
            createUserData.lastLoginLocation = fpjsData.ipLocation?.city?.name;
        }

        const user = this.userRepo.create(createUserData);
        return this.userRepo.save(user);
    }

    static async findByUsername(username: string): Promise<User | null> {
        return this.userRepo.findOne({ where: { username } });
    }
    
    static async updateLastLoginLocation(userId: string, location: string) {
        await this.userRepo.update(userId, { lastLoginLocation: location });
    }

    static async updateLastLoginIp(userId: string, ip: string) {
        await this.userRepo.update(userId, { lastLoginIp: ip });
    }

    static async updateLastLoginAt(userId: string) {
        await this.userRepo.update(userId, { lastLoginAt: new Date() });
    }

    static async updateFailedLoginCount(userId: string, count: number) {
        await this.userRepo.update(userId, { failedLoginCount: count });
    }

    static async updateFailedLoginAt(userId: string) {
        await this.userRepo.update(userId, { failedLoginAt: new Date() });
    }

    static async verifyPassword(user: User, rawPassword: string): Promise<boolean> {
        return comparePassword(rawPassword, user.passwordHash);
    }
}
