// src/entities/Permission.ts
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    BaseEntity
} from 'typeorm';

@Entity({ name: 'permissions' })
export class Permission extends BaseEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    userId!: string;

    @Column({ length: 50 })
    permissionName!: string;

    /**
     * domain 또는 domain+subpath 등을 통합해서 저장
     * 예: "auth.com/my/path" 
     *     "another-service/admin/v1"
     */
    @Column({ length: 255 })
    resource!: string;

    /**
     * 예: "READ", "CREATE", "DELETE", etc.
     */
    @Column({ length: 50 })
    action!: string;

    @CreateDateColumn()
    createdAt!: Date;
}
