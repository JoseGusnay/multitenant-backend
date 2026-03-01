import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Branch } from './branch.entity';

@Injectable()
export class BranchesService {
  constructor(
    @Inject('TENANT_CONNECTION')
    private readonly tenantDataSource: DataSource,
  ) {}

  async findAll(): Promise<Branch[]> {
    const repo = this.tenantDataSource.getRepository(Branch);
    return repo.find({ where: { isActive: true }, order: { name: 'ASC' } });
  }

  async findOne(id: string): Promise<Branch> {
    const repo = this.tenantDataSource.getRepository(Branch);
    const branch = await repo.findOne({ where: { id } });
    if (!branch) {
      throw new NotFoundException(`Sucursal con ID ${id} no encontrada.`);
    }
    return branch;
  }

  async create(data: Partial<Branch>): Promise<Branch> {
    const repo = this.tenantDataSource.getRepository(Branch);
    const branch = repo.create(data);
    return repo.save(branch);
  }

  async update(id: string, data: Partial<Branch>): Promise<Branch> {
    const branch = await this.findOne(id);
    Object.assign(branch, data);
    const repo = this.tenantDataSource.getRepository(Branch);
    return repo.save(branch);
  }

  async remove(id: string): Promise<{ success: boolean; message: string }> {
    const branch = await this.findOne(id);
    const repo = this.tenantDataSource.getRepository(Branch);
    await repo.softRemove(branch);
    return { success: true, message: 'Sucursal eliminada correctamente.' };
  }
}
