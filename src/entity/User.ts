// src/entities/User.ts
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    BaseEntity
} from 'typeorm';

@Entity({ name: 'users' })
export class User extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ unique: true, length: 50 })
    username!: string;

    @Column({ name: 'password_hash', length: 255 })
    passwordHash!: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;

    @Column({ name: 'is_active', default: true })
    isActive!: boolean;

    @Column({ name: 'is_deleted', default: false })
    isDeleted!: boolean;

    @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
    lastLoginAt?: Date;

    @Column({ name: 'last_login_ip', length: 50, nullable: true })
    lastLoginIp?: string;

    @Column({ name: 'last_login_location', length: 100, nullable: true })
    lastLoginLocation?: string;

    @Column({ name: 'failed_login_count', default: 0 })
    failedLoginCount!: number;

    @Column({ name: 'failed_login_at', type: 'timestamp', nullable: true })
    failedLoginAt?: Date;
}

