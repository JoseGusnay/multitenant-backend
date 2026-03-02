import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { SaasRole } from './entities/saas-role.entity';
import { SaasPermission } from './entities/saas-permission.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { PageOptionsDto } from '../../../core/pagination/dto/page-options.dto';
import { FilterCondition } from '../../../core/filters/interfaces/filter-condition.interface';
import { PageDto } from '../../../core/pagination/dto/page.dto';
import { PageMetaDto } from '../../../core/pagination/dto/page-meta.dto';
import { TypeOrmFilterBuilder } from '../../../core/filters/builder/typeorm-filter.builder';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(SaasRole)
    private readonly roleRepo: Repository<SaasRole>,
    @InjectRepository(SaasPermission)
    private readonly permissionRepo: Repository<SaasPermission>,
  ) { }

  async create(createRoleDto: CreateRoleDto) {
    const { name, description, permissionIds } = createRoleDto;

    const existing = await this.roleRepo.findOne({ where: { name } });
    if (existing) {
      throw new BadRequestException(`El rol '${name}' ya existe.`);
    }

    let permissions: SaasPermission[] = [];
    if (permissionIds && permissionIds.length > 0) {
      permissions = await this.permissionRepo.find({
        where: { id: In(permissionIds) },
      });
    }

    const role = this.roleRepo.create({
      name,
      description,
      permissions,
    });

    return this.roleRepo.save(role);
  }

  async findAll(
    pageOptions: PageOptionsDto,
    filters: FilterCondition[],
  ): Promise<PageDto<SaasRole>> {
    const queryBuilder = this.roleRepo.createQueryBuilder('role');

    // Aplicar filtros avanzados
    const filterBuilder = new TypeOrmFilterBuilder(queryBuilder, 'role');
    filterBuilder.applyFilters(filters);

    // Relaciones
    queryBuilder.leftJoinAndSelect('role.permissions', 'permissions');

    // Ordenamiento y Paginación
    queryBuilder
      .orderBy('role.name', pageOptions.order)
      .skip(pageOptions.skip)
      .take(pageOptions.take);

    const itemCount = await queryBuilder.getCount();
    const { entities } = await queryBuilder.getRawAndEntities();

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto: pageOptions });

    return new PageDto(entities, pageMetaDto);
  }

  async findOne(id: string) {
    const role = await this.roleRepo.findOne({
      where: { id },
      relations: ['permissions'],
    });

    if (!role) {
      throw new NotFoundException(`Rol con ID ${id} no encontrado`);
    }

    return role;
  }

  async update(id: string, updateRoleDto: UpdateRoleDto) {
    const role = await this.findOne(id);

    if (role.name === 'GLOBAL_ADMIN') {
      throw new BadRequestException(
        'El rol GLOBAL_ADMIN está protegido y no puede ser editado.',
      );
    }

    if (updateRoleDto.name && updateRoleDto.name !== role.name) {
      const existing = await this.roleRepo.findOne({
        where: { name: updateRoleDto.name },
      });
      if (existing) {
        throw new BadRequestException(
          `El rol '${updateRoleDto.name}' ya existe.`,
        );
      }
      role.name = updateRoleDto.name;
    }

    if (updateRoleDto.description !== undefined) {
      role.description = updateRoleDto.description;
    }

    if (updateRoleDto.permissionIds) {
      const permissions = await this.permissionRepo.find({
        where: { id: In(updateRoleDto.permissionIds) },
      });
      role.permissions = permissions;
    }

    return this.roleRepo.save(role);
  }

  async remove(id: string) {
    const role = await this.roleRepo.findOne({
      where: { id },
      relations: ['users'],
    });

    if (!role) {
      throw new NotFoundException(`Rol con ID ${id} no encontrado`);
    }

    if (role.name === 'GLOBAL_ADMIN') {
      throw new BadRequestException(
        'No se puede eliminar el rol GLOBAL_ADMIN maestro.',
      );
    }

    if (role.users && role.users.length > 0) {
      throw new BadRequestException(
        'No se puede eliminar un rol que tiene usuarios asignados.',
      );
    }

    return this.roleRepo.softRemove(role);
  }

  async findAllPermissions() {
    return this.permissionRepo.find({
      order: { name: 'ASC' },
    });
  }
}
