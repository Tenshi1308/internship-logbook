import "./env";
import { prisma } from "../lib/prisma";
import { hashPassword } from "../lib/password";

async function main() {
  const email = "ui-test@example.com";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.delete({ where: { id: existing.id } });
  }

  const hash = await hashPassword("password123");
  const user = await prisma.user.create({
    data: {
      name: "UI Test User",
      nim: "1231231231",
      email,
      passwordHash: hash,
      scheme: "Community Developer",
      partner: "Lavendrie Laundry",
    },
  });

  const start = new Date("2026-08-03T00:00:00Z");
  const end = new Date("2026-08-07T00:00:00Z");
  const report = await prisma.weeklyReport.create({
    data: {
      userId: user.id,
      weekNumber: 1,
      startDate: start,
      endDate: end,
      dailyLogs: {
        create: [
          {
            dayNumber: 1,
            date: start,
            startTime: "08:00",
            endTime: "16:00",
            location: "WFH",
            status: "COMPLETE",
          },
        ],
      },
    },
  });

  console.log(`SEEDED ${user.email} id=${user.id} report=${report.id}`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
