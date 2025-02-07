// src/controllers/AuthController.ts
import { Request, Response } from "express";
import { UserService } from "../services/UserService";
import { AuthService } from "../services/AuthService";
import { TokenService } from "../services/TokenService";
import { getIpAddress } from "../utils/ipUtil";
import { getFpjsData } from "../utils/fingerprintUtils";
import { PermissionService } from "../services/PermissionService";
import { DEFAULT_SESSION_COOKIE_NAME } from "../constants/app.constants";
export class AuthController {
	static inValidLoginMessage = "Invalid credentials";
	static serverErrorMessage = "Server error";

	/**
	 * @openapi
	 * /auth/register:
	 *   post:
	 *     summary: 사용자 등록
	 *     tags: [Auth]
	 *     requestBody:
	 *       required: true
	 *       content:
	 *         application/json:
	 *           schema:
	 *             type: object
	 *             properties:
	 *               username:
	 *                 type: string
	 *                 example: testuser
	 *               password:
	 *                 type: string
	 *                 example: testpass
	 *               fpRequestId:
	 *                 type: string
	 *                 nullable: true
	 *                 example: "1234567890 - 옵션(null 가능)"
	 *     responses:
	 *       200:
	 *         description: 사용자 등록 성공
	 *         content:
	 *           application/json:
	 *             schema:
	 *               type: object
	 *               properties:
	 *                 success:
	 *                   type: boolean
	 *                 user:
	 *                   type: object
	 *       400:
	 *         description: 사용자 등록 실패
	 */
	static async register(req: Request, res: Response) {
		try {
			const { username, password, fpRequestId } = req.body;
			const fpjsData = fpRequestId ? await getFpjsData(fpRequestId) : null;
			const ipAddress = await getIpAddress(req);
			const user = await UserService.createUser(
				username,
				password,
				ipAddress ?? null,
				fpjsData,
			);
			return res.json({ success: true, user });
		} catch (err: any) {
			console.error(err);
			return res.status(400).json({ success: false, message: err.message });
		}
	}

	/**
	 * @openapi
	 * /auth/login:
	 *   post:
	 *     summary: 사용자 로그인
	 *     tags: [Auth]
	 *     requestBody:
	 *       required: true
	 *       content:
	 *         application/json:
	 *           schema:
	 *             type: object
	 *             properties:
	 *               username:
	 *                 type: string
	 *                 example: testuser
	 *               password:
	 *                 type: string
	 *                 example: testpass
	 *               fpRequestId:
	 *                 type: string
	 *                 nullable: true
	 *                 example: "1234567890 - 옵션(null 가능)"
	 *     responses:
	 *       200:
	 *         description: 로그인 성공
	 *         headers:
	 *           Set-Cookie:
	 *             schema:
	 *               type: string
	 *               description: 세션 쿠키. 키이름 참고 - development 환경에서는 sso_session_id, production 환경에서는 __Secure-sso-auth.sso-session-id
	 *               example: sso_session_id=sessionId; HttpOnly; Secure; SameSite=Lax
	 *         content:
	 *           application/json:
	 *             schema:
	 *               type: object
	 *               properties:
	 *                 success:
	 *                   type: boolean
	 *                 userId:
	 *                   type: string
	 *       401:
	 *         description: 인증 실패 (잘못된 자격증명 혹은 계정 상태 문제)
	 */
	static async login(req: Request, res: Response) {
		try {
			const { username, password, fpRequestId } = req.body;
			const user = await UserService.findByUsername(username);
			const ipAddress = await getIpAddress(req);
			if (!user) {
				return res
					.status(401)
					.json({ success: false, error: AuthController.inValidLoginMessage });
			}
			if (user.failedLoginCount >= 5) {
				// return res.status(401).json({ success: false, error: 'Too many failed login attempts' });
			}
			if (!user.isActive) {
				await UserService.updateFailedLoginCount(
					user.id,
					user.failedLoginCount + 1,
				);
				await UserService.updateFailedLoginAt(user.id);
				await UserService.updateLastLoginIp(user.id, ipAddress ?? "unknown");
				return res
					.status(401)
					.json({ success: false, error: AuthController.inValidLoginMessage });
			}
			if (user.isDeleted) {
				await UserService.updateFailedLoginCount(
					user.id,
					user.failedLoginCount + 1,
				);
				await UserService.updateFailedLoginAt(user.id);
				await UserService.updateLastLoginIp(user.id, ipAddress ?? "unknown");
				return res
					.status(401)
					.json({ success: false, error: AuthController.inValidLoginMessage });
			}
			const isValid = await UserService.verifyPassword(user, password);
			if (!isValid) {
				await UserService.updateFailedLoginCount(
					user.id,
					user.failedLoginCount + 1,
				);
				await UserService.updateFailedLoginAt(user.id);
				return res
					.status(401)
					.json({ success: false, error: AuthController.inValidLoginMessage });
			}

			const fpjsData = fpRequestId ? await getFpjsData(fpRequestId) : null;
			if (fpjsData) {
				await UserService.updateLastLoginLocation(
					user.id,
					fpjsData.ipLocation?.city?.name ?? "",
				);
			}
			await UserService.updateLastLoginIp(user.id, ipAddress ?? "unknown");
			await UserService.updateLastLoginAt(user.id);
			await UserService.updateFailedLoginCount(user.id, 0);

			// 세션 생성 with UA/IP
			const ua = req.headers["user-agent"] || undefined;
			const sessionId = await AuthService.createSession(
				user.id,
				ua,
				ipAddress ?? "",
			);
			const cookieName = process.env.SESSION_COOKIE_NAME || DEFAULT_SESSION_COOKIE_NAME;
			res.cookie(cookieName, sessionId, {
				httpOnly: true,
				secure: false, // dev only
				sameSite: "lax",
			});

			return res.json({ success: true, userId: user.id });
		} catch (err) {
			console.error(err);
			return res
				.status(500)
				.json({ success: false, error: AuthController.serverErrorMessage });
		}
	}

	/**
	 * @openapi
	 * /auth/logout:
	 *   post:
	 *     summary: 로그아웃
	 *     tags: [Auth]
	 *     security:
	 *       - cookieAuth: []
	 *     responses:
	 *       200:
	 *         description: 로그아웃 성공
	 *         content:
	 *           application/json:
	 *             schema:
	 *               type: object
	 *               properties:
	 *                 success:
	 *                   type: boolean
	 *       500:
	 *         description: 서버 오류
	 */
	static async logout(req: Request, res: Response) {
		try {
			const cookieName = process.env.SESSION_COOKIE_NAME || DEFAULT_SESSION_COOKIE_NAME;
			const sessionId = req.cookies?.[cookieName];
			if (sessionId) {
				await AuthService.destroySession(sessionId);
				res.clearCookie(cookieName);
			}
			return res.json({ success: true });
		} catch (err) {
			console.error(err);
			return res.status(500).json({ success: false });
		}
	}

	/**
	 * @openapi
	 * /auth/session-check:
	 *   get:
	 *     summary: 세션 유효성 체크
	 *     tags: [Auth]
	 *     security:
	 *       - cookieAuth: []
	 *     responses:
	 *       200:
	 *         description: 세션이 유효함
	 *         content:
	 *           application/json:
	 *             schema:
	 *               type: object
	 *               properties:
	 *                 loggedIn:
	 *                   type: boolean
	 *                   example: true
	 *                 userId:
	 *                   type: string
	 *                   example: "123456"
	 *       401:
	 *         description: 세션이 없거나 만료됨
	 */
	static async sessionCheck(req: Request, res: Response) {
		const cookieName = process.env.SESSION_COOKIE_NAME || DEFAULT_SESSION_COOKIE_NAME;
		const sessionId = req.cookies[cookieName];
		if (!sessionId) {
			return res.status(401).json({ loggedIn: false });
		}
		const ua = req.headers["user-agent"] || undefined;
		const ip = (await getIpAddress(req)) || "unknown";

		const userId = await AuthService.verifySession(sessionId, ua, ip);
		if (!userId) {
			return res.status(401).json({ loggedIn: false });
		}
		return res.json({ loggedIn: true, userId });
	}

	/**
	 * @openapi
	 * /auth/authorize:
	 *   post:
	 *     summary: 인가 토큰 발급
	 *     tags: [Auth]
	 *     security:
	 *       - cookieAuth: []
	 *     requestBody:
	 *       required: true
	 *       content:
	 *         application/json:
	 *           schema:
	 *             type: object
	 *             properties:
	 *               scope:
	 *                 type: string
	 *                 example: "auth.com/my/path::READ"
	 *     responses:
	 *       200:
	 *         description: 인가 토큰 발행 성공
	 *         content:
	 *           application/json:
	 *             schema:
	 *               type: object
	 *               properties:
	 *                 accessToken:
	 *                   type: string
	 *                 refreshToken:
	 *                   type: string
	 *       400:
	 *         description: scope 파라미터 누락 또는 형식 오류
	 *       401:
	 *         description: 세션 또는 자격 부여 실패
	 *       403:
	 *         description: 권한 없음
	 *       500:
	 *         description: 서버 오류
	 */
	static async authorize(req: Request, res: Response) {
		try {
			const sessionCookieName =
				process.env.SESSION_COOKIE_NAME || DEFAULT_SESSION_COOKIE_NAME;
			const sessionId = req.cookies?.[sessionCookieName];
			if (!sessionId) {
				return res.status(401).json({ error: "No session" });
			}
			const ua = req.headers["user-agent"] || undefined;
			const ip = (await getIpAddress(req)) || "unknown";

			const userId = await AuthService.verifySession(sessionId, ua, ip);
			if (!userId) {
				return res.status(401).json({ error: "Invalid session" });
			}

			// 2) scope 파싱
			const { scope } = req.body; // e.g. "auth.com/my/path::READ"
			if (!scope) {
				return res.status(400).json({ error: "scope is required" });
			}

			// "::" 로 나눈 뒤, 마지막 파트를 action으로 뽑기
			const actionIndex = scope.lastIndexOf("::");
			if (actionIndex < 0) {
				return res
					.status(400)
					.json({ error: 'scope format invalid, expected "resource::action"' });
			}
			const resource = scope.substring(0, actionIndex); // "auth.com/my/path"
			const action = scope.substring(actionIndex + 2); // "READ"

			// 3) 권한(permissions) 테이블에서 조회
			const hasPermission = await PermissionService.userHasPermission(
				userId,
				resource,
				action,
			);
			if (!hasPermission) {
				return res.status(403).json({ error: "No permission" });
			}

			// 4) 인가 토큰 발행 (AES 등)
			// ex) TokenService.createAccessToken(userId, resource, 300);
			const refreshToken = TokenService.createRefreshToken({
				userId,
				expiresInSec: 60 * 60 * 24 * 30,
			});
			await TokenService.commitRefreshTokenOnRedis(
				refreshToken,
				60 * 60 * 24 * 30,
			);
			const token = TokenService.createAccessToken(
				userId,
				resource,
				action,
				300,
				refreshToken,
			); // 유효기간 5분 예시
			return res.json({ accessToken: token, refreshToken });
		} catch (err) {
			console.error(err);
			return res.status(500).json({ error: "Server error" });
		}
	}

	/**
	 * @openapi
	 * /auth/verify-token:
	 *   post:
	 *     summary: 토큰 검증
	 *     tags: [Auth]
	 *     requestBody:
	 *       required: true
	 *       content:
	 *         application/json:
	 *           schema:
	 *             type: object
	 *             properties:
	 *               token:
	 *                 type: string
	 *                 example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
	 *     responses:
	 *       200:
	 *         description: 토큰 검증 성공
	 *         content:
	 *           application/json:
	 *             schema:
	 *               type: object
	 *               properties:
	 *                 valid:
	 *                   type: boolean
	 *                   example: true
	 *                 payload:
	 *                   type: object
	 *       400:
	 *         description: 토큰 미제공
	 *       401:
	 *         description: 토큰 검증 실패 또는 만료됨
	 *       500:
	 *         description: 서버 오류
	 */
	static async verifyToken(req: Request, res: Response) {
		try {
			const { token } = req.body;
			if (!token) {
				return res.status(400).json({ valid: false, error: "No token" });
			}
			const payload = TokenService.verifyAccessToken(token);
			if (!payload) {
				return res
					.status(401)
					.json({ valid: false, error: "Invalid or expired token" });
			}
			return res.json({ valid: true, payload });
		} catch (err) {
			console.error(err);
			return res.status(500).json({ valid: false, error: "Server error" });
		}
	}

	/**
	 * @openapi
	 * /auth/refresh-token:
	 *   post:
	 *     summary: 토큰 갱신
	 *     tags: [Auth]
	 *     security:
	 *       - cookieAuth: []
	 *     requestBody:
	 *       required: true
	 *       content:
	 *         application/json:
	 *           schema:
	 *             type: object
	 *             properties:
	 *               accessToken:
	 *                 type: string
	 *                 example: "현재 access token"
	 *               refreshToken:
	 *                 type: string
	 *                 example: "현재 refresh token"
	 *     responses:
	 *       200:
	 *         description: 토큰 갱신 성공
	 *         content:
	 *           application/json:
	 *             schema:
	 *               type: object
	 *               properties:
	 *                 accessToken:
	 *                   type: string
	 *                 refreshToken:
	 *                   type: string
	 *       400:
	 *         description: access token 또는 refresh token 미제공
	 *       401:
	 *         description: 토큰 검증 실패 혹은 만료됨
	 *       500:
	 *         description: 서버 오류
	 */
	static async refreshToken(req: Request, res: Response) {
		try {
			const sessionCookieName =
				process.env.SESSION_COOKIE_NAME || DEFAULT_SESSION_COOKIE_NAME;
			const sessionId = req.cookies?.[sessionCookieName];
			if (!sessionId) {
				return res.status(401).json({ error: "No session" });
			}
			const ua = req.headers["user-agent"] || undefined;
			const ip = (await getIpAddress(req)) || "unknown";

			const userId = await AuthService.verifySession(sessionId, ua, ip);
			if (!userId) {
				return res.status(401).json({ error: "Invalid session" });
			}
			const { accessToken, refreshToken } = req.body;
			if (!accessToken || !refreshToken) {
				return res.status(400).json({
					valid: false,
					error: "No access token or refresh token",
				});
			}
			const payload = TokenService.decryptAccessToken(accessToken);
			if (!payload) {
				return res
					.status(401)
					.json({ valid: false, error: "Invalid access token" });
			}
			if (payload.userId !== userId) {
				return res.status(401).json({ error: "Invalid session" });
			}
			const refreshPayload = await TokenService.verifyRefreshToken(
				refreshToken,
			);
			if (!refreshPayload) {
				return res
					.status(401)
					.json({ valid: false, error: "Invalid or expired refresh token" });
			}
			const newRefreshToken = await TokenService.updateRefreshToken(
				refreshToken,
			);
			if (!newRefreshToken) {
				return res
					.status(401)
					.json({ valid: false, error: "Invalid or expired refresh token" });
			}
			const token = TokenService.createAccessToken(
				payload.userId,
				payload.resourceName,
				payload.action,
				300,
				newRefreshToken,
			);
			return res.json({ accessToken: token, refreshToken: newRefreshToken });
		} catch (err) {
			console.error(err);
			return res.status(500).json({ valid: false, error: "Server error" });
		}
	}
}
