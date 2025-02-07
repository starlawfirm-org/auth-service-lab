// src/config/crypto.ts
import crypto from 'crypto';
import { ALGO } from '../constants/crypto.constants';
import { EncryptionKey } from '../entity/EncryptionKey';
import { EncryptionKeyRotationService } from '../services/EncryptionKeyRotationService';

// 현재 활성화된 암호화 키와 IV를 저장할 변수 (초기화되지 않은 상태)
let currentAESKey: string | null = null;
let currentAESIV: string | null = null;

/**
 * 애플리케이션 시작 시 DB/Redis에 저장된 활성화 키 정보를 불러오고,
 * 전역 변수(currentAESKey, currentAESIV)를 업데이트하는 함수.
 *
 * 예: 서버 시작 시 server.ts에서 await initEncryptionKeys() 호출
 */
export async function initEncryptionKeys(): Promise<void> {
  const activeKey: EncryptionKey | null = await EncryptionKeyRotationService.getActiveEncryptionKey();
  if (activeKey) {
    currentAESKey = activeKey.aesKey;
    currentAESIV = activeKey.aesIv;
    console.log('DB/Redis로부터 암호화 키 정보 로드 완료');
  } else {
    throw new Error('활성화된 암호화 키를 불러오지 못했습니다.');
  }
}

/**
 * 암호화 키가 회전할 때(새로운 키가 발급될 때) 해당 정보를 반영하기 위한 함수
 */
export function updateEncryptionKeys(newKey: string, newIV: string): void {
  currentAESKey = newKey;
  currentAESIV = newIV;
  console.log('암호화 키 정보 업데이트 완료');
}

/**
 * 동적으로 불러온 AES 키와 IV를 사용하여 평문을 암호화하는 함수
 */
export function encryptAES(plainText: string): string {
  if (!currentAESKey || !currentAESIV) {
    throw new Error('암호화 키가 초기화되지 않았습니다.');
  }
  const cipher = crypto.createCipheriv(ALGO, currentAESKey, currentAESIV);
  let encrypted = cipher.update(plainText, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return encrypted;
}

/**
 * 동적으로 불러온 AES 키와 IV를 사용하여 암호화된 텍스트를 복호화하는 함수
 */
export function decryptAES(encryptedBase64: string): string {
  if (!currentAESKey || !currentAESIV) {
    throw new Error('암호화 키가 초기화되지 않았습니다.');
  }
  const decipher = crypto.createDecipheriv(ALGO, currentAESKey, currentAESIV);
  let decrypted = decipher.update(encryptedBase64, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
