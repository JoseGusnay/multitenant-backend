import { Expose } from 'class-transformer';

export class TenantStatsDto {
  @Expose()
  total: number;

  @Expose()
  active: number;

  @Expose()
  provisioning: number;

  @Expose()
  suspended: number;

  @Expose()
  deleted: number;

  @Expose()
  growthLast30Days: { date: string; count: number }[];
}
