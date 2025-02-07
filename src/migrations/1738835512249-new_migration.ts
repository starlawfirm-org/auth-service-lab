import { MigrationInterface, QueryRunner } from "typeorm";

export class NewMigration1738835512249 implements MigrationInterface {
    name = 'NewMigration1738835512249'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "username" character varying(50) NOT NULL, "password_hash" character varying(255) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "is_active" boolean NOT NULL DEFAULT true, "is_deleted" boolean NOT NULL DEFAULT false, "last_login_at" TIMESTAMP, "last_login_ip" character varying(50), "last_login_location" character varying(100), "failed_login_count" integer NOT NULL DEFAULT '0', "failed_login_at" TIMESTAMP, CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE ("username"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "encryption_keys" ("id" SERIAL NOT NULL, "aes_key" text NOT NULL, "aes_iv" text NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_9b11c521c72b15e00ea39f32b6c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "permissions" ("id" SERIAL NOT NULL, "userId" character varying NOT NULL, "permissionName" character varying(50) NOT NULL, "resource" character varying(255) NOT NULL, "action" character varying(50) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_920331560282b8bd21bb02290df" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "permissions"`);
        await queryRunner.query(`DROP TABLE "encryption_keys"`);
        await queryRunner.query(`DROP TABLE "users"`);
    }

}
