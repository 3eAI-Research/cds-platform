import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiResponse, ApiFieldError } from '../types/api-response';
import { ErrorCode } from '../types/error-codes';
import { BusinessException } from '../exceptions/business.exception';

/**
 * Global exception filter — catches ALL exceptions and returns ApiResponse format.
 *
 * Maps:
 * - ValidationPipe errors → VAL_* codes + field details
 * - BusinessException → BIZ_* codes
 * - HttpException → appropriate error code
 * - Unknown errors → SYS_INTERNAL_ERROR
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let errorCode: string;
    let message: string;
    let details: ApiFieldError[] | undefined;

    if (exception instanceof BusinessException) {
      status = exception.getStatus();
      errorCode = exception.errorCode;
      message = (exception.getResponse() as { message: string }).message;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (status === HttpStatus.BAD_REQUEST && this.isValidationError(exceptionResponse)) {
        errorCode = ErrorCode.VAL_REQUIRED_FIELD;
        message = 'Validation failed';
        details = this.extractValidationDetails(exceptionResponse);
      } else {
        errorCode = this.mapHttpStatusToErrorCode(status);
        message =
          typeof exceptionResponse === 'string'
            ? exceptionResponse
            : (exceptionResponse as { message?: string }).message ?? 'Request failed';
      }
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      errorCode = ErrorCode.SYS_INTERNAL_ERROR;
      message = 'Internal server error';

      // Log full error for debugging — don't expose to client
      this.logger.error(
        `Unhandled exception on ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ApiResponse<never> = {
      success: false,
      error: {
        code: errorCode,
        message,
        ...(details && { details }),
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };

    response.status(status).json(body);
  }

  private isValidationError(response: unknown): boolean {
    if (typeof response !== 'object' || response === null) return false;
    const r = response as { message?: unknown };
    return Array.isArray(r.message);
  }

  private extractValidationDetails(response: unknown): ApiFieldError[] {
    const r = response as { message?: string[] };
    if (!Array.isArray(r.message)) return [];

    return r.message.map((msg) => ({
      field: this.extractFieldFromMessage(msg),
      message: msg,
      constraint: 'validation',
    }));
  }

  private extractFieldFromMessage(message: string): string {
    // class-validator messages typically start with the field name
    const match = message.match(/^(\w+)/);
    return match?.[1] ?? 'unknown';
  }

  private mapHttpStatusToErrorCode(status: number): string {
    switch (status) {
      case HttpStatus.UNAUTHORIZED:
        return ErrorCode.AUTH_TOKEN_MISSING;
      case HttpStatus.FORBIDDEN:
        return ErrorCode.AUTH_INSUFFICIENT_ROLE;
      case HttpStatus.NOT_FOUND:
        return ErrorCode.NOT_FOUND;
      case HttpStatus.CONFLICT:
        return 'BIZ_CONFLICT';
      case HttpStatus.TOO_MANY_REQUESTS:
        return ErrorCode.SYS_RATE_LIMIT;
      case HttpStatus.SERVICE_UNAVAILABLE:
        return ErrorCode.SYS_SERVICE_UNAVAILABLE;
      default:
        return status >= 500 ? ErrorCode.SYS_INTERNAL_ERROR : ErrorCode.VAL_INVALID_FORMAT;
    }
  }
}
