// Used only by `npm run db:generate`, which turns changes in the schema file
// into SQL migrations. A plain object, so the build does not need drizzle-kit.
const config = {
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
};

export default config;
