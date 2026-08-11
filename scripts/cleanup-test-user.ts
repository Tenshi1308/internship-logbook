import "./env";
import { prisma } from "../lib/prisma";

async function main() {
  const deleted = await prisma.user.deleteMany({
    where: { email: { in: ["httpflow@example.com", "ghost@nowhere.com"] } },
  });
  console.log(`deleted ${deleted.count} test users`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
