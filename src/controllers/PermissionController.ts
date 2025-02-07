// src/controllers/PermissionController.ts
import { Request, Response } from "express";
import { AuthService } from "../services/AuthService";
import { PermissionService } from "../services/PermissionService";
import { getIpAddress } from "../utils/ipUtil";
import { TokenService } from "../services/TokenService";
import { DEFAULT_SESSION_COOKIE_NAME } from "../constants/app.constants";
import {
	resource,
	grantPermission,
	getPermission,
	deletePermission,
} from "../constants/repo.constants";

export class PermissionController {
	/**
	 * @openapi
	 * /permissions/grant:
	 *   post:
	 *     summary: 권한 부여
	 *     description: 특정 사용자에게 권한을 부여합니다. 전제 - 현재 로그인된 user가 auth/admin::ALL or auth/admin::WRITE 권한이 있어야 합니다.
	 *     tags: [Permission]
	 *     security:
	 *       - cookieAuth: [sso_session_id | __Secure-(provider)-auth.sso-session-id]
	 *     requestBody:
	 *       required: true
	 *       content:
	 *         application/json:
	 *           schema:
	 *             type: object
	 *             properties:
	 *               userIdToGrant:
	 *                 type: number
	 *                 example: 2
	 *               scope:
	 *                 type: string
	 *                 example: "some-service/admin::WRITE"
	 *               permissionName:
	 *                 type: string
	 *                 example: "grantPermission"
	 *     responses:
	 *       200:
	 *         description: 권한 부여 성공
	 *         content:
	 *           application/json:
	 *             schema:
	 *               type: object
	 *               properties:
	 *                 success:
	 *                   type: boolean
	 *                 permission:
	 *                   type: object
	 *       400:
	 *         description: 필수 필드 누락 또는 요청 형식 오류
	 *       401:
	 *         description: 인증 실패 또는 권한 부족
	 *       500:
	 *         description: 서버 오류
	 */
	static async grantPermission(req: Request, res: Response) {
		try {
			// 1) 세션 체크
			const cookieName = process.env.SESSION_COOKIE_NAME || DEFAULT_SESSION_COOKIE_NAME;
			const sessionId = req.cookies?.[cookieName];
			if (!sessionId) {
				return res.status(401).json({ error: "No session" });
			}
			const authHeader = req.headers["authorization"];
			if (!authHeader) {
				return res.status(401).json({ error: "No authorization header" });
			}
			const [bearer, accessToken] = authHeader.split(" ");
			if (bearer !== "Bearer" || !accessToken) {
				return res.status(401).json({ error: "Invalid authorization header" });
			}

			const payload = TokenService.verifyAccessToken(accessToken);
			if (!payload) {
				return res.status(401).json({ error: "Invalid access token" });
			}
			const { userId: userIdFromToken, resourceName } = payload;

			const ua = req.headers["user-agent"] || undefined;
			const ip = (await getIpAddress(req)) || "unknown";

			// UA/IP 바인딩 등을 쓰고 있다면, AuthService.verifySession(sessionId, ua, ip) 형태
			const userId = await AuthService.verifySession(sessionId, ua, ip);
			if (!userId || userId !== userIdFromToken) {
				return res.status(401).json({ error: "Invalid session" });
			}

			// 2) 권한 검사 → "auth/admin::ALL" or "auth/admin::WRITE"
			const canALL = PermissionService.verifyPermission(resourceName, "ALL");
			const canWRITE = PermissionService.verifyPermission(
				resourceName,
				"WRITE",
			);
			if (!canALL && !canWRITE) {
				return res.status(403).json({ error: "No permission to grant" });
			}

			// 3) body 파싱
			const { userIdToGrant, scope, permissionName } = req.body;
			if (!userIdToGrant || !scope || !permissionName) {
				return res.status(400).json({
					error: "userIdToGrant, scope, and permissionName are required",
				});
			}

			// scope 예: "some-service/admin::WRITE"
			const [resourceString, actionString] = scope.split("::");
			if (!resourceString || !actionString) {
				return res
					.status(400)
					.json({ error: 'scope format invalid, expected "resource::action"' });
			}

			// 4) 실제 권한 부여
			const perm = await PermissionService.grantPermission(
				permissionName,
				userIdToGrant,
				resourceString,
				actionString,
			);

			return res.json({
				success: true,
				permission: perm,
			});
		} catch (err) {
			console.error(err);
			return res.status(500).json({ error: "Server Error" });
		}
	}
}
