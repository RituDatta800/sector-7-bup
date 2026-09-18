/**
 * Single responsibility: Catches all unhandled exceptions, sanitizes response, and returns controlled JSON errors without leaking stack traces.
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { LlmFailureError, ValidationFailureError } from '../shared/errors';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  /**
   * Catches and formats any exception into a safe, structured JSON response.
   */
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'An unexpected internal error occurred';
    let code = 'INTERNAL_SERVER_ERROR';
    let details: unknown = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        message = (res as { message?: string }).message || message;
        details = res;
      }
      code = 'HTTP_EXCEPTION';
    } else if (exception instanceof ValidationFailureError) {
      status = HttpStatus.BAD_REQUEST;
      message = exception.message;
      code = 'VALIDATION_FAILURE';
      details = { ruleName: exception.ruleName, details: exception.details };
    } else if (exception instanceof LlmFailureError) {
      status = HttpStatus.BAD_GATEWAY;
      message = exception.message;
      code = 'LLM_PROVIDER_FAILURE';
      details = { provider: exception.provider };
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    // Explicitly send sanitized response - never leak internal stack traces
    response.status(status).send({
      success: false,
      error: {
        code,
        message,
        details: details ?? null,
      },
      timestamp: new Date().toISOString(),
    });
  }
}
