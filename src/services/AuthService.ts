// src/services/AuthService.ts
import { redisClient } from '../config/redis';
import { v4 as uuidv4 } from 'uuid';
import { session } from '../constants/repo.constants';
interface SessionData {
    userId: string;
    ua?: string;
    ip?: string;
}

export class AuthService {
    /**
     * 세션 생성
     * @param userId      사용자 ID
     * @param userAgent   요청 헤더의 UA
     * @param ipAddress   요청 IP (req.ip 등)
     */
    static async createSession(userId: string, userAgent?: string, ipAddress?: string): Promise<string> {
        const sessionId = uuidv4();

        let ua = userAgent ?? '';
        let ip = ipAddress ?? '';

        // UA가 비어 있거나 특수한 경우 → IP 바인딩 모드
        // (실제로는 더 정교한 기준을 잡을 수도 있음)
        if (!ua || ua.trim().length === 0) {
            ua = '';
        }

        const sessionData: SessionData = { userId, ua, ip };

        // Redis에 JSON 저장 (EX: 만료 1시간)
        await redisClient.set(
            `session:${sessionId}`,
            JSON.stringify(sessionData),
            { EX: 3600 }
        );

        return sessionId;
    }

    /**
     * 세션 검증
     * @param sessionId 세션 ID
     * @param userAgent 현재 요청의 UA
     * @param ipAddress 현재 요청의 IP
     * @returns userId or null
     */
    static async verifySession(sessionId: string, userAgent?: string, ipAddress?: string): Promise<string | null> {
        const data = await redisClient.get(`session:${sessionId}`);
        if (!data) return null; // 세션 없음 or 만료

        let stored: SessionData;
        try {
            stored = JSON.parse(data) as SessionData;
        } catch {
            return null;
        }

        // 1) 우선 UA가 저장되어 있다면, UA 일치 여부 확인
        //    (UA가 '' 비어있다면, "IP 바인딩 모드"라고 가정)
        if (stored.ua && stored.ua.trim().length > 0) {
            // UA가 실제로 존재한다면, 현재 요청 UA와 exact match
            // 브라우저마다 미묘하게 다를 수 있으므로
            // 대소문자나 OS 버전 등 일부 normalize해도 좋음
            if (stored.ua !== (userAgent ?? '')) {
                return null;
            }
        } else {
            // 2) UA가 비어있는 경우 (특수) → IP 바인딩으로 체크
            if (stored.ip && stored.ip.trim().length > 0) {
                if (stored.ip !== (ipAddress ?? '')) {
                    return null;
                }
            }
        }

        return stored.userId;
    }

    /**
     * 세션 파기
     */
    static async destroySession(sessionId: string) {
        await redisClient.del(`${session}:${sessionId}`);
    }
}
