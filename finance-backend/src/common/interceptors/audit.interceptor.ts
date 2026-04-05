import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditAction } from '@prisma/client';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      tap(async (responseData) => {
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        // Only log for authenticated, mutation requests
        if (!user) return;
        const method = request.method;
        if (method === 'GET') return;

        const auditAction = this.resolveAction(request);
        if (!auditAction) return;

        try {
          await this.prisma.auditLog.create({
            data: {
              actorId: user.sub,
              action: auditAction,
              resourceType: this.resolveResourceType(request.route?.path || request.url),
              resourceId: request.params?.id || responseData?.id || null,
              metadata: {
                method,
                path: request.url,
                requestId: request.requestId,
                ip: request.ip,
                body: this.sanitizeBody(request.body),
              },
              createdAt: new Date(),
            },
          });
        } catch {
          // Audit logging should never break the main request
          console.error('Audit log write failed');
        }
      }),
    );
  }

  private resolveAction(request: any): AuditAction | null {
    const { method, url } = request;
    const path = url.toLowerCase();

    if (path.includes('/auth/register')) return AuditAction.REGISTER;
    if (path.includes('/auth/login')) return AuditAction.LOGIN;
    if (path.includes('/auth/logout')) return AuditAction.LOGOUT;

    if (path.includes('/records') && path.includes('/restore')) return AuditAction.RESTORE_RECORD;
    if (path.includes('/records') && method === 'POST') return AuditAction.CREATE_RECORD;
    if (path.includes('/records') && (method === 'PUT' || method === 'PATCH')) return AuditAction.UPDATE_RECORD;
    if (path.includes('/records') && method === 'DELETE') return AuditAction.DELETE_RECORD;

    if (path.includes('/users') && path.includes('/role')) return AuditAction.CHANGE_ROLE;
    if (path.includes('/users') && path.includes('/deactivate')) return AuditAction.DEACTIVATE_USER;
    if (path.includes('/users') && method === 'POST') return AuditAction.CREATE_USER;
    if (path.includes('/users') && (method === 'PUT' || method === 'PATCH')) return AuditAction.UPDATE_USER;

    return null;
  }

  private resolveResourceType(path: string): string {
    if (path.includes('record')) return 'FinancialRecord';
    if (path.includes('user')) return 'User';
    if (path.includes('auth')) return 'Auth';
    return 'Unknown';
  }

  private sanitizeBody(body: any): any {
    if (!body) return null;
    const sanitized = { ...body };
    // Never log passwords
    delete sanitized.password;
    delete sanitized.refreshToken;
    return sanitized;
  }
}
