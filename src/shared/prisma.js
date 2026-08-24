const { PrismaClient } = require("@prisma/client");

const prisma = global.__meridianPrisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__meridianPrisma = prisma;
}

module.exports = prisma;
