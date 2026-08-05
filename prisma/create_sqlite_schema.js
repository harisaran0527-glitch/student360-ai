const fs = require("fs");

let content = fs.readFileSync("prisma/schema.prisma", "utf8");
content = content.replace('provider = "postgresql"', 'provider = "sqlite"');
content = content.replace('url      = env("DATABASE_URL")', 'url      = "file:./dev.db.backup"');
content = content.replace('generator client {', 'generator client {\n  output   = "../node_modules/@prisma/client-sqlite"');

fs.writeFileSync("prisma/schema.sqlite.prisma", content);
console.log("prisma/schema.sqlite.prisma created successfully.");
