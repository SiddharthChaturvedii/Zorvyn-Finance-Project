import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    const message = exceptionResponse
      ? typeof exceptionResponse === 'object' && 'message' in exceptionResponse
        ? (exceptionResponse as any).message
        : exceptionResponse
      : 'Internal server error';

    const errorCode = exceptionResponse
      ? typeof exceptionResponse === 'object' && 'error' in exceptionResponse
        ? (exceptionResponse as any).error
        : HttpStatus[status]
      : 'INTERNAL_SERVER_ERROR';

    response.status(status).json({
      statusCode: status,
      error: errorCode,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
