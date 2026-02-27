import { PageMetaDto } from './page-meta.dto';

/**
 * Clase genérica <T> que envuelve los datos (data) junto con la
 * metadata (meta) paginadora pre-calculada.
 */
export class PageDto<T> {
  readonly data: T[];
  readonly meta: PageMetaDto;

  constructor(data: T[], meta: PageMetaDto) {
    this.data = data;
    this.meta = meta;
  }
}
