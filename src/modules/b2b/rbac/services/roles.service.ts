import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { CreateRoleDto } from '../dto/create-role.dto';
import { TenantConnectionManager } from '../../../../core/modules/tenant-connection/tenant-connection.manager';
import { Tenant } from '../../../tenants/domain/tenant.entity';
import { Role } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';
import { In } from 'typeorm';

import { PageOptionsDto } from '../../../../core/pagination/dto/page-options.dto';
import { FilterCondition } from '../../../../core/filters/interfaces/filter-condition.interface';
import { PageDto } from '../../../../core/pagination/dto/page.dto';
import { PageMetaDto } from '../../../../core/pagination/dto/page-meta.dto';
import { TypeOrmFilterBuilder } from '../../../../core/filters/builder/typeorm-filter.builder';

@Injectable()
export class RolesService {
  constructor(private readonly connectionManager: TenantConnectionManager) {}

  async createRole(tenant: Tenant, dto: CreateRoleDto) {
    const connection = await this.connectionManager.getTenantConnection(tenant);
    const roleRepo = connection.getRepository(Role);
    const permissionRepo = connection.getRepository(Permission);

    // Buscar los permisos físicos reales que matcheen con los UUIDs que mandó el gerente
    const permissions = await permissionRepo.findBy({
      id: In(dto.permissionIds),
    });

    if (permissions.length !== dto.permissionIds.length) {
      throw new NotFoundException(
        'Algunos de los IDs de permisos enviados no son válidos o no existen',
      );
    }

    const role = roleRepo.create({
      name: dto.name,
      permissions: permissions,
    });

    return await roleRepo.save(role);
  }

  async getAllRoles(
    tenant: Tenant,
    pageOptionsDto: PageOptionsDto,
    filters: FilterCondition[],
  ): Promise<PageDto<Role>> {
    const connection = await this.connectionManager.getTenantConnection(tenant);
    const roleRepo = connection.getRepository(Role);

    const queryBuilder = roleRepo.createQueryBuilder('role');
    queryBuilder.leftJoinAndSelect('role.permissions', 'permissions');

    const filterBuilder = new TypeOrmFilterBuilder(queryBuilder, 'role');
    filterBuilder.applyFilters(filters);

    queryBuilder
      .orderBy('role.createdAt', pageOptionsDto.order)
      .skip(pageOptionsDto.skip)
      .take(pageOptionsDto.take);

    const itemCount = await queryBuilder.getCount();
    const { entities } = await queryBuilder.getRawAndEntities();

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });
    return new PageDto(entities, pageMetaDto);
  }

  async getAllPermissions(tenant: Tenant) {
    const connection = await this.connectionManager.getTenantConnection(tenant);
    return await connection.getRepository(Permission).find();
  }

  async deleteRole(tenant: Tenant, roleId: string) {
    const connection = await this.connectionManager.getTenantConnection(tenant);
    const roleRepo = connection.getRepository(Role);

    const role = await roleRepo.findOne({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException('El rol no existe');
    }

    if (role.name === 'SUPER_ADMIN') {
      throw new ConflictException(
        'El rol de administrador principal no puede ser eliminado',
      );
    }

    return await roleRepo.softRemove(role);
  }
}
