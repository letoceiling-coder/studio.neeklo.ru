import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export type UserRole = "user" | "admin" | "superadmin";

export type AuthUser = {
  userId: string;
  email: string;
  planId: string;
  role: UserRole;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser | undefined => {
    const req = ctx.switchToHttp().getRequest<{ user?: AuthUser }>();
    return req.user;
  },
);
