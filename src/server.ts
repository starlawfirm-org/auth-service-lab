// src/server.ts
import dotenv from "dotenv";
const envFile =
	process.env.NODE_ENV === "production"
		? ".env.production"
		: ".env.development";
dotenv.config({ path: envFile });
console.log("Environment: ", process.env.NODE_ENV);
import app from "./app";
import { AppDataSource } from "./data-source";
import { redisClient } from "./config/redis";
import { EncryptionKeyRotationService } from "./services/EncryptionKeyRotationService";
import { initEncryptionKeys } from "./config/crypto";

(async () => {
	try {
		// 1) 먼저 DB 연결
		await AppDataSource.initialize()
			.then(() => console.log("Data Source initialized"))
			.catch((err) =>
				console.error("Error during Data Source initialization", err),
			);

		// 2) 키 초기화
		await initEncryptionKeys();

		// 3) 서버 실행
		const server = app.listen(process.env.PORT || 3000, () =>
			console.log(`Server listening on port ${process.env.PORT || 3000}`),
		);

		const gracefulShutdown = async () => {
			console.log("Received shutdown signal, closing server...");
			server.close(async () => {
				try {
					if (redisClient.isOpen) {
						await redisClient.quit();
					}
					if (AppDataSource.isInitialized) {
						await AppDataSource.destroy();
					}
					console.log("Shutdown complete.");
					process.exit(0);
				} catch (err) {
					console.error("Error during shutdown:", err);
					process.exit(1);
				}
			});
		};

		process.on("SIGTERM", gracefulShutdown);
		process.on("SIGINT", gracefulShutdown);

		EncryptionKeyRotationService.scheduleKeyRotation();
	} catch (error) {
		console.error("서버 실행 중 오류 발생:", error);
		process.exit(1);
	}
})();
