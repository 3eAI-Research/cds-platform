import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../types/error-codes';

/**
 * Business rule violation exception.
 * Maps BIZ_* error codes to HTTP 409/422.
 *
 * Usage:
 *   throw new BusinessException(ErrorCode.BIZ_DEMAND_NOT_BIDDABLE, 'Demand is not in biddable status');
 */
export class BusinessException extends HttpException {
  public readonly errorCode: ErrorCode;

  constructor(
    errorCode: ErrorCode,
    message: string,
    statusCode: number = HttpStatus.UNPROCESSABLE_ENTITY,
  ) {
    super({ errorCode, message }, statusCode);
    this.errorCode = errorCode;
  }
}

/**
 * Not found exception with error code.
 */
export class NotFoundException extends HttpException {
  public readonly errorCode: ErrorCode;

  constructor(resource: string, id: string) {
    const message = `${resource} with id ${id} not found`;
    super({ errorCode: ErrorCode.NOT_FOUND, message }, HttpStatus.NOT_FOUND);
    this.errorCode = ErrorCode.NOT_FOUND;
  }
}
