import "./env";
import { prisma } from "../lib/prisma";
import { hashPassword } from "../lib/password";
import { encryptSecret } from "../lib/encrypt";

async function main() {
  const email = "ghflow2@example.com";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.delete({ where: { id: existing.id } });
  }

  const hash = await hashPassword("password123");
  const user = await prisma.user.create({
    data: {
      name: "GitHub Flow Two",
      nim: "1112223334",
      email,
      passwordHash: hash,
      scheme: "Community Developer",
      partner: "Lavendrie Laundry",
    },
  });

  const tokenEncrypted = await encryptSecret("gho_mock-token-for-testing-two");

  const connection = await prisma.gitHubConnection.create({
    data: {
      userId: user.id,
      githubUserId: "90211",
      githubUsername: "ghflowtwo",
      accessTokenEncrypted: tokenEncrypted,
      repositories: {
        create: {
          githubId: 201,
          userId: user.id,
          name: "private-tool",
          fullName: "ghflowtwo/private-tool",
          owner: "ghflowtwo",
          defaultBranch: "main",
          isSelected: true,
        },
      },
    },
  });

  const report = await prisma.weeklyReport.create({
    data: {
      userId: user.id,
      weekNumber: 1,
      startDate: new Date("2026-08-10T00:00:00Z"),
      endDate: new Date("2026-08-14T00:00:00Z"),
    },
  });

  console.log(
    `SEEDED ${user.email} user=${user.id} connection=${connection.id} report=${report.id}`
  );
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});