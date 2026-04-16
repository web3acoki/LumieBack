import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private requests = new Map<string, number[]>();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id || request.ip;
    const now = Date.now();
    const windowMs = 60000; // 1 minute
    const maxRequests = 10;

    if (!this.requests.has(userId)) {
      this.requests.set(userId, []);
    }

    const userRequests = this.requests.get(userId)!;
    const recentRequests = userRequests.filter((time) => now - time < windowMs);

    if (recentRequests.length >= maxRequests) {
      throw new HttpException(
        {
          status: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Rate limit exceeded. Maximum 10 requests per minute.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    recentRequests.push(now);
    this.requests.set(userId, recentRequests);

    return true;
  }
}
