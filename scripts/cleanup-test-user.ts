import "./env";
import { prisma } from "../lib/prisma";

async function main() {
  const deleted = await prisma.user.deleteMany({
    where: {
      email: {
        in: [
          "httpflow@example.com",
          "ghost@nowhere.com",
          "ui-test@example.com",
          "ghflow@example.com",
          "ghflow2@example.com",
        ],
      },
    },
  });
  console.log(`deleted ${deleted.count} test users`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
