import { DataSourceOptions } from "typeorm";
import path from "path";
import dotenv from "dotenv";
import { EncryptionKey } from "./entity/EncryptionKey";
import { Permission } from "./entity/Permission";
import { User } from "./entity/User";

const isProduction = process.env.NODE_ENV === "production";

// 현재 NODE_ENV에 따라 서로 다른 .env 파일 로딩
dotenv.config({
	path: isProduction ? ".env.production" : ".env.development",
});

const { DB_HOST, DB_PORT, DB_USER, DB_PASS, DB_NAME } = process.env;

export const typeormConfig: DataSourceOptions = {
	type: "postgres",
	host: DB_HOST,
	port: Number(DB_PORT),
	username: DB_USER,
	password: DB_PASS,
	database: DB_NAME,
	synchronize: false,
	logging: false,
	entities: [User, Permission, EncryptionKey],
	migrations: [path.join(__dirname, "migrations", "*.{js,ts}")],
};
