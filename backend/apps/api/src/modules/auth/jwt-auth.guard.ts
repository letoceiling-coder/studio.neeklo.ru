import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { AuthUser, UserRole } from "../../common/current-user.decorator.js";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
      user?: AuthUser;
    }>();
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing Bearer token");
    }
    try {
      const payload = await this.jwt.verifyAsync<{
        sub: string;
        email: string;
        planId: string;
        role?: UserRole;
      }>(header.slice(7), {
        secret: process.env.JWT_SECRET,
      });
      req.user = {
        userId: payload.sub,
        email: payload.email,
        planId: payload.planId,
        role: payload.role ?? "user",
      };
      return true;
    } catch {
      throw new UnauthorizedException("Invalid token");
    }
  }
}
