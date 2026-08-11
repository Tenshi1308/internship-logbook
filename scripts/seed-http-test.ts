import "./env";
import { prisma } from "../lib/prisma";
import { hashPassword } from "../lib/password";

async function main() {
  const email = "httpflow@example.com";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.delete({ where: { id: existing.id } });
  }

  const hash = await hashPassword("password123");
  const user = await prisma.user.create({
    data: {
      name: "HTTP Flow User",
      nim: "9998887776",
      email,
      passwordHash: hash,
      scheme: "Community Developer",
      partner: "Lavendrie Laundry",
    },
  });
  console.log(`SEEDED ${user.email} id=${user.id}`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
