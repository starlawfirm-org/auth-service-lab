import crypto from 'crypto';
import { redisClient } from '../config/redis';
import { EncryptionKeyService } from './EncryptionKeyService';
import { EncryptionKey } from '../entity/EncryptionKey';
import { REDIS_ACTIVE_KEY, ONE_WEEK_IN_SECONDS } from '../constants/app.constants';
import { updateEncryptionKeys } from '../config/crypto';

export class EncryptionKeyRotationService {
  /**
   * Redis에서 활성화된 AES key와 IV를 우선 조회.
   * 캐싱된 값이 없거나 파싱 오류가 발생하면 DB에서 조회 후 Redis에 저장.
   */
  static async getActiveEncryptionKey(): Promise<EncryptionKey | null> {
    try {
      const cached = await redisClient.get(REDIS_ACTIVE_KEY);
      if (cached) {
        // Redis에 저장된 JSON 데이터를 파싱하여 반환
        const keyData: EncryptionKey = JSON.parse(cached);
        return keyData;
      }
    } catch (err) {
      console.error('Redis 캐싱값 파싱 오류:', err);
    }
    
    // 캐시가 없거나 오류가 있는 경우 DB에서 활성화된 키 조회
    const dbKey = await EncryptionKeyService.getActiveKey();
    if (dbKey) {
      // Redis에 캐싱 (TTL 적용)
      await redisClient.set(REDIS_ACTIVE_KEY, JSON.stringify(dbKey), { EX: ONE_WEEK_IN_SECONDS });
    }
    return dbKey;
  }

  /**
   * 새로운 AES key와 IV를 생성하고 DB에 입력 후 Redis 캐시를 업데이트.
   */
  static async rotateEncryptionKey(): Promise<void> {
    // 새로운 AES key와 IV 생성 (예시로 hex값을 사용하며 32, 16 자리를 맞춤)
    const newKey = crypto.randomBytes(32).toString('hex').slice(0, 32);
    const newIV = crypto.randomBytes(16).toString('hex').slice(0, 16);
    
    // DB에 새로운 키 등록 & 기존 키들 비활성화
    const rotatedKey = await EncryptionKeyService.rotateKey(newKey, newIV);
    if (rotatedKey) {
      // Redis 캐시 업데이트 (TTL 적용)
      await redisClient.set(REDIS_ACTIVE_KEY, JSON.stringify(rotatedKey), { EX: ONE_WEEK_IN_SECONDS });
      updateEncryptionKeys(rotatedKey.aesKey, rotatedKey.aesIv);
      console.log('AES key와 IV가 성공적으로 회전되었습니다.');
    } else {
      console.error('AES key 회전 실패');
    }
  }

  /**
   * 키 회전 스케줄러: 애플리케이션 실행 시 한 번 즉시 회전을 실행하고,
   * 이후 주기적으로 (여기서는 일주일) 회전시키도록 설정.
   *
   * 실제 운영에서는 node-cron이나 다른 스케줄러 라이브러리를 사용하는 것이 바람직합니다.
   */
  static scheduleKeyRotation(): void {
    const oneWeekInMs = ONE_WEEK_IN_SECONDS * 1000;
    // 애플리케이션 시작과 동시에 회전 함수 호출 (옵션으로 현재 캐시된 값의 TTL이 끝나기 전에 미리 회전할 수 있음)
    this.rotateEncryptionKey();

    // 이후 주기적 회전 (예시: setInterval 사용)
    setInterval(() => {
      this.rotateEncryptionKey();
    }, oneWeekInMs);
  }
}