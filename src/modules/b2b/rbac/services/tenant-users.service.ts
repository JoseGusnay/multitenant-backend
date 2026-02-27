import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { CreateTenantUserDto } from '../dto/create-tenant-user.dto';
import { TenantConnectionManager } from '../../../../core/modules/tenant-connection/tenant-connection.manager';
import { Tenant } from '../../../tenants/domain/tenant.entity';
import { TenantUser } from '../entities/tenant-user.entity';
import { Role } from '../entities/role.entity';
import { In } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { PageOptionsDto } from '../../../../core/pagination/dto/page-options.dto';
import { FilterCondition } from '../../../../core/filters/interfaces/filter-condition.interface';
import { PageDto } from '../../../../core/pagination/dto/page.dto';
import { PageMetaDto } from '../../../../core/pagination/dto/page-meta.dto';
import { TypeOrmFilterBuilder } from '../../../../core/filters/builder/typeorm-filter.builder';
@Injectable()
export class TenantUsersService {
  constructor(private readonly connectionManager: TenantConnectionManager) {}

  async createUser(tenant: Tenant, dto: CreateTenantUserDto) {
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
    pageOptionsDto: PageOptionsDto,
    filters: FilterCondition[],
  ): Promise<PageDto<TenantUser>> {
    const connection = await this.connectionManager.getTenantConnection(tenant);
    const userRepo = connection.getRepository(TenantUser);

    const queryBuilder = userRepo.createQueryBuilder('user');
    queryBuilder.leftJoinAndSelect('user.roles', 'roles');

    const filterBuilder = new TypeOrmFilterBuilder(queryBuilder, 'user');
    filterBuilder.applyFilters(filters);

    queryBuilder
      .orderBy('user.createdAt', pageOptionsDto.order)
      .skip(pageOptionsDto.skip)
      .take(pageOptionsDto.take);

    const itemCount = await queryBuilder.getCount();
    const { entities } = await queryBuilder.getRawAndEntities();

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });
    return new PageDto(entities, pageMetaDto);
  }
}
