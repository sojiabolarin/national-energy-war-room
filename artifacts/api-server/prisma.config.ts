import { defineConfig } from "prisma/config";
import { PrismaPg } from "@prisma/adapter-pg";

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    url: process.env["DATABASE_URL"] ?? "",
  },
  migrate: {
    adapter: (env) => {
      const url = env["DATABASE_URL"];
      if (!url) throw new Error("DATABASE_URL is not set");
      return new PrismaPg({ connectionString: url });
    },
  },
});
