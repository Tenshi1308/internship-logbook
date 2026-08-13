import "./env";
import { prisma } from "../lib/prisma";
import { hashPassword } from "../lib/password";
import { encryptSecret } from "../lib/encrypt";
import { dayNumber } from "../lib/dates";

async function main() {
  const email = "preview-test@example.com";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.delete({ where: { id: existing.id } });
  }

  const hash = await hashPassword("password123");
  const user = await prisma.user.create({
    data: {
      name: "Preview Test User",
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
      nextWeekPlan:
        "Lanjut implementasi API dan persiapan presentasi minggu depan.",
      studentEvaluation:
        "Kegiatan berjalan lancar dan mentor sangat membantu.",
      dailyLogs: {
        create: [
          {
            dayNumber: dayNumber(start),
            date: start,
            startTime: "08:00",
            endTime: "16:00",
            location: "WFH",
            status: "COMPLETE",
            finalDescription:
              "Menyelesaikan modul autentikasi dan meninjau kode bersama mentor.",
            manualActivities: {
              create: [
                { order: 0, description: "Morning briefing dengan mentor" },
              ],
            },
          },
          {
            dayNumber: dayNumber(new Date("2026-08-04T00:00:00Z")),
            date: new Date("2026-08-04T00:00:00Z"),
            startTime: "08:00",
            endTime: "17:00",
            location: "Kantor",
            status: "COMPLETE",
            finalDescription:
              "Merancang skema database dan mengimplementasikan endpoint API CRUD.",
            manualActivities: {
              create: [
                { order: 0, description: "Menyusun skema database" },
                { order: 1, description: "Implementasi endpoint API" },
              ],
            },
          },
          {
            dayNumber: dayNumber(new Date("2026-08-05T00:00:00Z")),
            date: new Date("2026-08-05T00:00:00Z"),
            startTime: "",
            endTime: "",
            location: "",
            status: "DRAFT",
          },
        ],
      },
      documentationPhotos: {
        create: [
          {
            cloudinaryPublicId: "preview-p1",
            url: "http://localhost:3000/logo-universitas.png",
            caption: "Kegiatan mingguan",
            order: 0,
          },
          {
            cloudinaryPublicId: "preview-p2",
            url: "http://localhost:3000/logo-universitas.png",
            caption: "Sprint planning",
            order: 1,
          },
        ],
      },
    },
    include: { dailyLogs: true },
  });

  // attach GitHub commit evidence to the second day
  const tokenEncrypted = await encryptSecret("gho_preview-test-token");
  const connection = await prisma.gitHubConnection.create({
    data: {
      userId: user.id,
      githubUserId: "91001",
      githubUsername: "previewtest",
      accessTokenEncrypted: tokenEncrypted,
      repositories: {
        create: {
          githubId: 91002,
          userId: user.id,
          name: "internship-logbook",
          fullName: "previewtest/internship-logbook",
          owner: "previewtest",
          defaultBranch: "main",
          commits: {
            create: {
              sha: "e".repeat(40),
              message: "feat: implement API CRUD",
              authorName: "Preview Test User",
              authorEmail: email,
              committedAt: new Date("2026-08-04T03:00:00Z"),
              url: "https://github.com/previewtest/internship-logbook/commit/eee",
            },
          },
        },
      },
    },
    include: { repositories: { include: { commits: true } } },
  });
  await prisma.logbookCommit.create({
    data: {
      dailyLogId: report.dailyLogs[1].id,
      commitId: connection.repositories[0].commits[0].id,
    },
  });

  // incomplete draft report (no plan/eval/photos) for completeness indicator check
  await prisma.weeklyReport.create({
    data: {
      userId: user.id,
      weekNumber: 2,
      startDate: start,
      endDate: end,
      dailyLogs: {
        create: {
          dayNumber: dayNumber(start),
          date: start,
          startTime: "",
          endTime: "",
          location: "",
        },
      },
    },
  });

  const userB = await prisma.user.findUnique({ where: { email: "preview-test-b@example.com" } });
  if (userB) {
    await prisma.user.delete({ where: { id: userB.id } });
  }
  await prisma.user.create({
    data: {
      name: "Preview Test User B",
      nim: "9876543210",
      email: "preview-test-b@example.com",
      passwordHash: hash,
      scheme: "Community Developer",
      partner: "Lavendrie Laundry",
    },
  });

  console.log(`SEEDED ${user.email} id=${user.id} report=${report.id}`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});