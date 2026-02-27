import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Order } from '../constants/order.constant';

export class PageOptionsDto {
  @IsEnum(Order)
  @IsOptional()
  readonly order?: Order = Order.DESC;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  readonly page?: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  readonly take?: number = 10;

  @IsOptional()
  readonly filter?: Record<string, any>;

  get skip(): number {
    // Si la pág es 1 (default) y take 10 => skip = (1-1)*10 = 0
    return ((this.page ?? 1) - 1) * (this.take ?? 10);
  }
}
