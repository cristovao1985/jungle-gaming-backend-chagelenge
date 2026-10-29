import { EntityManager } from "@mikro-orm/postgresql";
import { Controller, Get, Inject, ServiceUnavailableException } from "@nestjs/common";

@Controller("health")
export class AppController {
  constructor(
    @Inject(EntityManager)
    private readonly em: EntityManager,
  ) {}

  @Get()
  helth() {
    return { status: "ok", service: "jungle-gaming-api" };
  }

  @Get("database")
  async databaseHealth() {
    try {
      await this.em.getConnection().execute("select 1");

      return {
        status: "ok",
        database: "connected",
      };
    } catch (error) {
      throw new ServiceUnavailableException({
        status: "error",
        database: "database unavailable",
      });
    }
  }
}
