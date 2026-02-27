import { DataSource } from 'typeorm';

export interface CachedConnection {
  dataSource: DataSource;
  lastAccess: number;
}
