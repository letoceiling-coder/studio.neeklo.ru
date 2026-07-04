import { Controller, Get } from "@nestjs/common";

@Controller("health")
export class HealthController {
  @Get()
  check() {
    return {
      status: "ok",
      service: "studio-neeklo-api",
      timestamp: new Date().toISOString(),
    };
  }
}
