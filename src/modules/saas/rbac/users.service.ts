import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { SaasUser } from './entities/saas-user.entity';
import { SaasRole } from './entities/saas-role.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PageOptionsDto } from '../../../core/pagination/dto/page-options.dto';
import { PageDto } from '../../../core/pagination/dto/page.dto';
import { PageMetaDto } from '../../../core/pagination/dto/page-meta.dto';
import { FilterCondition } from '../../../core/filters/interfaces/filter-condition.interface';
import { TypeOrmFilterBuilder } from '../../../core/filters/builder/typeorm-filter.builder';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(SaasUser)
    private readonly userRepo: Repository<SaasUser>,
    @InjectRepository(SaasRole)
    private readonly roleRepo: Repository<SaasRole>,
  ) { }

  async create(createUserDto: CreateUserDto) {
    const { email, password, roleIds, countryCode, phone, isActive } =
      createUserDto;

    const existingUser = await this.userRepo.findOne({ where: { email } });
    if (existingUser) {
      throw new BadRequestException(`El usuario con email ${email} ya existe.`);
    }

    let roles: SaasRole[] = [];
    if (roleIds && roleIds.length > 0) {
      roles = await this.roleRepo.find({
        where: { id: In(roleIds) },
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = this.userRepo.create({
      email,
      passwordHash: hashedPassword,
      roles,
      countryCode,
      phone,
      isActive: isActive !== undefined ? isActive : true,
    });

    const savedUser = await this.userRepo.save(user);
    const { passwordHash, ...result } = savedUser;
    return result;
  }

  async findAll(
    pageOptions: PageOptionsDto,
    filters: FilterCondition[],
  ): Promise<PageDto<Partial<SaasUser>>> {
    const queryBuilder = this.userRepo.createQueryBuilder('user');

    // Aplicar filtros avanzados
    const filterBuilder = new TypeOrmFilterBuilder(queryBuilder, 'user');
    filterBuilder.applyFilters(filters);

    // Relaciones
    queryBuilder.leftJoinAndSelect('user.roles', 'roles');

    // Ordenamiento y Paginación
    queryBuilder
      .orderBy('user.email', pageOptions.order)
      .skip(pageOptions.skip)
      .take(pageOptions.take);

    const itemCount = await queryBuilder.getCount();
    const { entities } = await queryBuilder.getRawAndEntities();

    const safeEntities = entities.map((user) => {
      const { passwordHash, resetPasswordOtp, ...safeUser } = user;
      return safeUser;
    });

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto: pageOptions });

    return new PageDto(safeEntities, pageMetaDto);
  }

  async findOne(id: string) {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    const { passwordHash, resetPasswordOtp, ...safeUser } = user;
    return safeUser;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.userRepo.findOne({
        where: { email: updateUserDto.email },
      });
      if (existingUser) {
        throw new BadRequestException(
          `El usuario con email ${updateUserDto.email} ya existe.`,
        );
      }
      user.email = updateUserDto.email;
    }

    if (updateUserDto.password) {
      user.passwordHash = await bcrypt.hash(updateUserDto.password, 10);
    }

    if (updateUserDto.roleIds) {
      // Evitar que el GLOBAL ADMIN se quite todos los roles si es el unico (precaucion adicional)
      const roles = await this.roleRepo.find({
        where: { id: In(updateUserDto.roleIds) },
      });
      user.roles = roles;
    }

    if (updateUserDto.countryCode !== undefined)
      user.countryCode = updateUserDto.countryCode;
    if (updateUserDto.phone !== undefined) user.phone = updateUserDto.phone;
    if (updateUserDto.isActive !== undefined)
      user.isActive = updateUserDto.isActive;

    const savedUser = await this.userRepo.save(user);
    const { passwordHash, resetPasswordOtp, ...result } = savedUser;
    return result;
  }

  async remove(id: string) {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    const isGlobalAdmin = user.roles?.some(
      (role) => role.name === 'GLOBAL_ADMIN',
    );
    if (isGlobalAdmin) {
      // Contar cuantos GLOBAL_ADMIN existen
      const globalAdminsCount = await this.userRepo
        .createQueryBuilder('user')
        .innerJoin('user.roles', 'role', 'role.name = :roleName', {
          roleName: 'GLOBAL_ADMIN',
        })
        .getCount();

      if (globalAdminsCount <= 1) {
        throw new BadRequestException(
          'No puedes eliminar al único superadministrador maestro (GLOBAL_ADMIN).',
        );
      }
    }

    await this.userRepo.softRemove(user);
    return { success: true, message: 'Usuario eliminado correctamente' };
  }
}
