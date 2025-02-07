// src/entities/EncryptionKey.ts
import {
    Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
    BaseEntity
} from 'typeorm';

@Entity({ name: 'encryption_keys' })
export class EncryptionKey extends BaseEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ name: 'aes_key', type: 'text' })
    aesKey!: string;

    @Column({ name: 'aes_iv', type: 'text' })
    aesIv!: string;

    @Column({ name: 'is_active', default: true })
    isActive!: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;
}
