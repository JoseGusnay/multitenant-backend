import { Module } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CategoryEntity } from './category.entity';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { TENANT_CONNECTION } from '../../../core/modules/tenant-connection/tenant-connection.provider';

@Module({
  controllers: [CategoriesController],
  providers: [
    {
      provide: 'CATEGORY_REPOSITORY',
      inject: [TENANT_CONNECTION],
      useFactory: (
        dataSource: DataSource,
      ): import('typeorm').Repository<CategoryEntity> => {
        return dataSource.getRepository(CategoryEntity);
      },
    },
    CategoriesService,
  ],
})
export class CategoriesModule {}
