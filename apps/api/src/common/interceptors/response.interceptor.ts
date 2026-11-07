import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { ApiSuccessResponse, PaginationMeta } from '@recruitflow/types';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ResponseTransformInterceptor<T>
  implements NestInterceptor<T, ApiSuccessResponse<T>>
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiSuccessResponse<T>> {
    return next.handle().pipe(
      map((payload: unknown) => {
        if (
          payload !== null &&
          typeof payload === 'object' &&
          'success' in payload &&
          typeof (payload as { success: unknown }).success === 'boolean' &&
          'data' in payload
        ) {
          return payload as ApiSuccessResponse<T>;
        }

        if (
          payload !== null &&
          typeof payload === 'object' &&
          'data' in payload &&
          'meta' in payload
        ) {
          const paged = payload as {
            data: T;
            meta: PaginationMeta;
            message?: string;
          };
          return {
            success: true,
            message: paged.message ?? 'Request completed successfully',
            data: paged.data,
            meta: paged.meta,
          };
        }

        return {
          success: true,
          message: 'Request completed successfully',
          data: payload as T,
        };
      }),
    );
  }
}

export { ResponseTransformInterceptor as ResponseInterceptor };
