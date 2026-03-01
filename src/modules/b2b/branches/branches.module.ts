import { Module } from '@nestjs/common';
import { BranchesService } from './branches.service';
import { BranchesController } from './branches.controller';
import { TenantConnectionModule } from '../../../core/modules/tenant-connection/tenant-connection.module';

@Module({
  imports: [TenantConnectionModule],
  providers: [BranchesService],
  controllers: [BranchesController],
  exports: [BranchesService],
})
export class BranchesModule {}
