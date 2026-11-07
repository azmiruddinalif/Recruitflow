import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { ApiErrorDetail, ApiErrorResponse } from '@recruitflow/types';
import { ZodError } from 'zod';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: ApiErrorDetail[] = [];

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
        errors = [{ message: res }];
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, unknown>;
        if (typeof resObj.message === 'string') {
          message = resObj.message;
        } else if (Array.isArray(resObj.message)) {
          message = resObj.message[0] ?? 'Validation failed';
          errors = resObj.message.map((msg) => ({ message: String(msg) }));
        }

        if (Array.isArray(resObj.errors)) {
          errors = resObj.errors as ApiErrorDetail[];
        }
      }
    } else if (exception instanceof ZodError) {
      statusCode = HttpStatus.BAD_REQUEST;
      message = 'Validation failed';
      errors = exception.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      }));
    } else if (
      typeof exception === 'object' &&
      exception !== null &&
      'code' in exception &&
      typeof (exception as { code: unknown }).code === 'string'
    ) {
      // Handle Prisma known request errors cleanly
      const prismaCode = (exception as { code: string }).code;
      if (prismaCode === 'P2002') {
        statusCode = HttpStatus.CONFLICT;
        message = 'A record with this unique value already exists';
        errors = [{ message, code: 'UNIQUE_CONSTRAINT_VIOLATION' }];
      } else if (prismaCode === 'P2025') {
        statusCode = HttpStatus.NOT_FOUND;
        message = 'Requested record was not found';
        errors = [{ message, code: 'RECORD_NOT_FOUND' }];
      }
    }

    if (errors.length === 0) {
      errors = [{ message }];
    }

    if (statusCode >= 500) {
      this.logger.error(
        `[${request?.method}] ${request?.url} -> ${statusCode}: ${
          exception instanceof Error ? exception.message : String(exception)
        }`,
        process.env.NODE_ENV !== 'production' && exception instanceof Error
          ? exception.stack
          : undefined,
      );
    }

    const errorPayload: ApiErrorResponse = {
      success: false,
      message,
      errors,
      statusCode,
      timestamp: new Date().toISOString(),
    };

    response.status(statusCode).json(errorPayload);
  }
}
