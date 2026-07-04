import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import type { AuthUser, UserRole } from "./current-user.decorator.js";

function makeRoleGuard(allowed: UserRole[]) {
  @Injectable()
  class RoleGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
      const req = context.switchToHttp().getRequest<{ user?: AuthUser }>();
      const role = req.user?.role;
      if (!role || !allowed.includes(role)) {
        throw new ForbiddenException("Insufficient role");
      }
      return true;
    }
  }
  return RoleGuard;
}

export const SuperAdminGuard = makeRoleGuard(["superadmin"]);
export const AdminGuard = makeRoleGuard(["admin", "superadmin"]);
