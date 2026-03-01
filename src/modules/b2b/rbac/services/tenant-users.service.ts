import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { CreateTenantUserDto } from '../dto/create-tenant-user.dto';
import { UpdateTenantUserDto } from '../dto/update-tenant-user.dto';
import { TenantConnectionManager } from '../../../../core/modules/tenant-connection/tenant-connection.manager';
import { Tenant } from '../../../tenants/domain/tenant.entity';
import { TenantUser } from '../entities/tenant-user.entity';
import { Role } from '../entities/role.entity';
import { Branch } from '../../branches/branch.entity';
import { In, Brackets } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AdvancedQueryDto } from '../../common/dtos/advanced-query.dto';
import { QueryBuilderUtils } from '../../common/utils/query-builder.util';

@Injectable()
export class TenantUsersService {
  constructor(private readonly connectionManager: TenantConnectionManager) {}

  async createUser(
    tenant: Tenant,
    dto: CreateTenantUserDto,
  ): Promise<TenantUser> {
    const connection = await this.connectionManager.getTenantConnection(tenant);
    const userRepo = connection.getRepository(TenantUser);
    const roleRepo = connection.getRepository(Role);

    const exists = await userRepo.findOne({ where: { email: dto.email } });
    if (exists) {
      throw new ConflictException(
        `El correo ${dto.email} ya está registrado en la empresa`,
      );
    }

    const roles = await roleRepo.findBy({
      id: In(dto.roleIds),
    });

    if (roles.length !== dto.roleIds.length) {
      throw new NotFoundException('Algunos Roles asigandos no existen');
    }

    const hashedPassword = await bcrypt.hash(dto.passwordRaw, 10);

    const user = userRepo.create({
      email: dto.email,
      passwordHash: hashedPassword,
      roles: roles,
      isActive: true,
    });

    return await userRepo.save(user);
  }

  async getAllUsers(
    tenant: Tenant,
    queryDto: AdvancedQueryDto,
  ): Promise<{ data: TenantUser[]; total: number }> {
    const connection = await this.connectionManager.getTenantConnection(tenant);
    const userRepo = connection.getRepository(TenantUser);
    const { page, limit, sortField, sortOrder, search, filterModel } = queryDto;

    const qb = userRepo.createQueryBuilder('user');
    qb.leftJoinAndSelect('user.roles', 'roles');
    qb.leftJoinAndSelect('user.branches', 'branches');

    // 1. Filtros Ag-Grid
    QueryBuilderUtils.applyAgGridFilters(qb, 'user', filterModel);

    // 2. Búsqueda Global
    if (search) {
      qb.andWhere(
        new Brackets((innerQb) => {
          innerQb.where('user.email ILIKE :search', { search: `%${search}%` });
        }),
      );
    }

    // 3. Ordenamiento
    QueryBuilderUtils.applySorting(qb, 'user', sortField, sortOrder);

    // 4. Paginación
    QueryBuilderUtils.applyPagination(qb, page, limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async getUserById(tenant: Tenant, id: string): Promise<TenantUser> {
    const connection = await this.connectionManager.getTenantConnection(tenant);
    const userRepo = connection.getRepository(TenantUser);
    const user = await userRepo.findOne({
      where: { id },
      relations: ['roles', 'branches'],
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado.`);
    }

    return user;
  }

  async updateUser(
    tenant: Tenant,
    id: string,
    dto: UpdateTenantUserDto,
  ): Promise<TenantUser> {
    const connection = await this.connectionManager.getTenantConnection(tenant);
    const userRepo = connection.getRepository(TenantUser);
    const user = await this.getUserById(tenant, id);

    if (dto.email && dto.email !== user.email) {
      const exists = await userRepo.findOne({ where: { email: dto.email } });
      if (exists) {
        throw new ConflictException(`El correo ${dto.email} ya está en uso.`);
      }
      user.email = dto.email;
    }

    if (dto.passwordRaw) {
      user.passwordHash = await bcrypt.hash(dto.passwordRaw, 10);
    }

    if (dto.isActive !== undefined) {
      user.isActive = dto.isActive;
    }

    if (dto.roleIds) {
      const roleIds = dto.roleIds;
      const roleRepo = connection.getRepository(Role);
      const roles = await roleRepo.findBy({ id: In(roleIds) });
      if (roles.length !== roleIds.length) {
        throw new NotFoundException('Algunos Roles asignados no existen');
      }
      user.roles = roles;
    }

    if (dto.branchIds) {
      const branchIds = dto.branchIds;
      const branchRepo = connection.getRepository(Branch);
      const branches = await branchRepo.findBy({ id: In(branchIds) });
      if (branches.length !== branchIds.length) {
        throw new NotFoundException('Algunas Sucursales asignadas no existen');
      }
      user.branches = branches;
    }

    return await userRepo.save(user);
  }

  async deleteUser(
    tenant: Tenant,
    id: string,
  ): Promise<{ success: boolean; message: string }> {
    const connection = await this.connectionManager.getTenantConnection(tenant);
    const userRepo = connection.getRepository(TenantUser);
    const user = await this.getUserById(tenant, id);

    // Eliminación física para este caso, o podrías usar isActive = false
    await userRepo.remove(user);

    return { success: true, message: 'Usuario eliminado correctamente.' };
  }
}
