// src/services/EncryptionKeyService.ts
import { AppDataSource } from '../data-source';
import { EncryptionKey } from '../entity/EncryptionKey';

export class EncryptionKeyService {
    private static repo = AppDataSource.getRepository(EncryptionKey);

    // 새 키/IV 발행 & 이전 키 비활성화, etc.
    static async rotateKey(newKey: string, newIV: string) {
        // 모든 기존 키를 isActive=false
        await this.repo.update({}, { isActive: false });

        const ek = this.repo.create({
            aesKey: newKey,
            aesIv: newIV,
            isActive: true
        });
        return this.repo.save(ek);
    }

    static async getActiveKey(): Promise<EncryptionKey | null> {
        return this.repo.findOne({ where: { isActive: true } });
    }
}
