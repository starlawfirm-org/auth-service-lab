// src/services/TokenService.ts
import { encryptAES, decryptAES } from '../config/crypto';
import { redisClient } from '../config/redis';
import { refreshToken } from '../constants/repo.constants';
import logger from '../logger';

interface AccessTokenPayload {
    userId: string;
    resourceName: string;
    action: string;
    iat: number;
    exp: number;
    refreshToken?: string;
    // 필요 시 roles, scope 등 추가 가능
}

interface RefreshTokenPayload {
    userId: string;
    iat: number;
    exp: number;
}

export class TokenService {
    static createAccessToken(userId: string, resourceName: string, action: string, expiresInSec = 300, refreshToken?: string): string {
        const now = Math.floor(Date.now() / 1000);
        const payload: AccessTokenPayload = {
            userId,
            resourceName,
            action,
            iat: now,
            exp: now + expiresInSec,
            refreshToken
        };
        return encryptAES(JSON.stringify(payload));
    }

    static createRefreshToken({ userId, expiresInSec = 60 * 60 * 24 * 30, fixedDatetime }: { userId: string, expiresInSec?: number, fixedDatetime?: string }): string {
        const now = Math.floor(Date.now() / 1000);
        const payload: RefreshTokenPayload = {
            userId,
            iat: now,
            exp: fixedDatetime ? new Date(fixedDatetime).getTime() : now + expiresInSec
        };
        return encryptAES(JSON.stringify(payload));
    }

    static async verifyRefreshToken(token: string): Promise<RefreshTokenPayload | null> {
        try {
            const searchResult = await this.verifyRefreshTokenOnRedis(token);
            if (!searchResult) {
                return null;
            }
            const decrypted = decryptAES(token);
            const payload: RefreshTokenPayload = JSON.parse(decrypted);
            const now = Math.floor(Date.now() / 1000);
            if (payload.exp < now) {
                return null; // 만료
            }
            return payload;
        } catch (err) {
            return null; // 복호화 실패
        }
    }

    static async updateRefreshToken(token: string): Promise<string | null> {
        logger.debug('updateRefreshToken 시작, token: %s', token);
        const payload = await this.verifyRefreshToken(token);
        if (!payload) {
            logger.warn('updateRefreshToken: 유효하지 않은 payload');
            return null;
        }
        const now = Math.floor(Date.now() / 1000);
        let remainingSec = payload.exp - now;
        if (remainingSec <= 0) {
            logger.info('updateRefreshToken: 남은 유효 시간이 없으므로 기본 만료 시간 적용');
            remainingSec = 60 * 60 * 24 * 30;
        }
        logger.debug('updateRefreshToken: remainingSec=%d', remainingSec);
        const newToken = this.createRefreshToken({ userId: payload.userId, expiresInSec: remainingSec });
        logger.debug('새로운 refresh token 생성: %s', newToken);
        await this.deleteRefreshTokenOnRedis(token);
        logger.debug('기존 토큰 삭제 완료, token: %s', token);
        await this.commitRefreshTokenOnRedis(newToken, remainingSec);
        logger.info('refresh token을 Redis에 커밋함, 만료 시간: %d초', remainingSec);
        return newToken;
    }

    static verifyAccessToken(token: string): AccessTokenPayload | null {
        try {
            const payload = this.decryptAccessToken(token);
            if (!payload) {
                logger.warn('verifyAccessToken: 복호화된 payload가 없음');
                return null;
            }
            const now = Math.floor(Date.now() / 1000);
            if (payload.exp < now) {
                logger.info('verifyAccessToken: 토큰 만료, 현재시간: %d, 만료시간: %d', now, payload.exp);
                return null;
            }
            logger.debug('verifyAccessToken: 토큰 유효, payload: %j', payload);
            return payload;
        } catch (err) {
            logger.error('verifyAccessToken: 오류 발생, 에러: %s', err);
            return null;
        }
    }

    static decryptAccessToken(token: string): AccessTokenPayload | null {
        try {
            const decrypted = decryptAES(token);
            const payload: AccessTokenPayload = JSON.parse(decrypted);
            logger.debug('decryptAccessToken: 복호화 성공');
            return payload;
        } catch (err) {
            logger.error('decryptAccessToken: 복호화 실패, 에러: %s', err);
            return null;
        }
    }

    static async verifyRefreshTokenOnRedis(token: string): Promise<boolean> {
        const searchKey = `${refreshToken}:${token}`;
        const searchResult = await redisClient.get(searchKey);
        if (!searchResult) {
            return false;
        }
        const payload = this.decryptAccessToken(searchResult);
        if (!payload) {
            return false;
        }
        return true;
    }

    static async deleteRefreshTokenOnRedis(token: string): Promise<boolean> {
        const searchKey = `${refreshToken}:${token}`;
        const searchResult = await redisClient.get(searchKey);
        if (!searchResult) {
            return false;
        }
        await redisClient.del(searchKey);
        return true;
    }

    static async commitRefreshTokenOnRedis(token: string, expiresInSec: number): Promise<boolean> {
        const commitKey = `${refreshToken}:${token}`;
        const commitResult = await redisClient.set(commitKey, token, { EX: expiresInSec });
        if (!commitResult) {
            return false;
        }
        return true;
    }
}
