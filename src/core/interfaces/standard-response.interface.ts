export interface StandardResponse<T> {
  statusCode: number;
  timestamp: string;
  path: string;
  data: T;
}
