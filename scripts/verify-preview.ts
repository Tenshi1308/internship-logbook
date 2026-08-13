import "./env";
import { prisma } from "../lib/prisma";
import { hashPassword } from "../lib/password";
import { dayNumber } from "../lib/dates";
import {
  getReportPreviewForUser,
  computeReportCompleteness,
} from "../lib/preview";
import {
  updatePlanEvaluationForUser,
  ReportNotFoundError,
} from "../lib/reports";

async function main() {
  const results: string[] = [];
  const check = (name: string, ok: boolean, detail = "") => {
    results.push(`${ok ? "PASS" : "FAIL"}: ${name}${detail ? ` - ${detail}` : ""}`);
    if (!ok) process.exitCode = 1;
  };

  const hash = await hashPassword("password123");
  const suffix = Date.now();

  const userA = await prisma.user.create({
    data: {
      name: "Preview Test User A",
      nim: `111${suffix}`.slice(0, 20),
      email: `preview-a-${suffix}@example.com`,
      passwordHash: hash,
      scheme: "Community Developer",
      partner: "Lavendrie Laundry",
    },
  });

  const userB = await prisma.user.create({
    data: {
      name: "Preview Test User B",
      nim: `222${suffix}`.slice(0, 20),
      email: `preview-b-${suffix}@example.com`,
      passwordHash: hash,
      scheme: "Community Developer",
      partner: "Lavendrie Laundry",
    },
  });

  try {
    const start = new Date("2026-08-10T00:00:00Z");
    const end = new Date("2026-08-14T00:00:00Z");

    const reportA = await prisma.weeklyReport.create({
      data: {
        userId: userA.id,
        weekNumber: 14,
        startDate: start,
        endDate: end,
        dailyLogs: {
          create: [
            {
              dayNumber: dayNumber(start),
              date: start,
              startTime: "08:00",
              endTime: "16:00",
              location: "WFH",
              finalDescription:
                "Menyelesaikan modul autentikasi dan meninjau kode bersama mentor.",
              manualActivities: {
                create: [
                  { order: 0, description: "Morning briefing dengan mentor" },
                ],
              },
            },
            {
              dayNumber: dayNumber(new Date("2026-08-11T00:00:00Z")),
              date: new Date("2026-08-11T00:00:00Z"),
              startTime: "08:00",
              endTime: "16:00",
              location: "Kantor",
              manualActivities: {
                create: [
                  { order: 0, description: "Menyusun skema database" },
                  { order: 1, description: "Implementasi endpoint API" },
                ],
              },
            },
          ],
        },
        documentationPhotos: {
          create: [
            { cloudinaryPublicId: "p1", url: "https://img.test/1", caption: "Kegiatan mingguan", order: 0 },
            { cloudinaryPublicId: "p2", url: "https://img.test/2", caption: "Sprint planning", order: 1 },
          ],
        },
      },
      include: { dailyLogs: true },
    });

    const reportB = await prisma.weeklyReport.create({
      data: {
        userId: userB.id,
        weekNumber: 2,
        startDate: start,
        endDate: end,
      },
    });

    // ===== 1. Owner can load preview with all sections =====
    const previewA = await getReportPreviewForUser(userA.id, reportA.id);
    check("owner can load preview", Boolean(previewA));
    check(
      "preview includes user profile",
      Boolean(
        previewA &&
          previewA.user.name === "Preview Test User A" &&
          previewA.user.scheme === "Community Developer" &&
          previewA.user.nim
      )
    );
    check(
      "preview includes report metadata",
      Boolean(
        previewA &&
          previewA.weekNumber === 14 &&
          previewA.startDate.toISOString() === start.toISOString() &&
          previewA.endDate.toISOString() === end.toISOString()
      )
    );
    check(
      "preview includes 2 daily logs",
      Boolean(previewA && previewA.days.length === 2)
    );
    check(
      "preview includes activities for each day",
      Boolean(
        previewA &&
          previewA.days[0].activities.length === 1 &&
          previewA.days[1].activities.length === 2
      )
    );
    check(
      "preview keeps finalDescription as primary text",
      Boolean(
        previewA &&
          previewA.days[0].finalDescription?.includes("modul autentikasi")
      )
    );
    check(
      "preview photos ordered by order asc",
      Boolean(
        previewA &&
          previewA.photos.map((p) => p.url).join(",") ===
            "https://img.test/1,https://img.test/2"
      )
    );
    check(
      "preview includes stored photo captions",
      Boolean(
        previewA &&
          previewA.photos[1].caption === "Sprint planning"
      )
    );

    // ===== 2. Ownership isolation =====
    const previewB = await getReportPreviewForUser(userB.id, reportA.id);
    check("user B cannot load user A's report", !previewB);

    // ===== 3. Plan & evaluation persistence with ownership =====
    await updatePlanEvaluationForUser(userA.id, reportA.id, {
      nextWeekPlan: "Lanjut implementasi API dan persiapan presentasi.",
      studentEvaluation: "Kegiatan berjalan lancar dan mentor sangat membantu.",
    });
    const previewWithPlan = await getReportPreviewForUser(userA.id, reportA.id);
    check(
      "plan saved and visible in preview section 3",
      Boolean(
        previewWithPlan &&
          previewWithPlan.nextWeekPlan?.includes("presentasi")
      )
    );
    check(
      "evaluation saved and visible in preview section 4",
      Boolean(
        previewWithPlan &&
          previewWithPlan.studentEvaluation?.includes("mentor sangat membantu")
      )
    );

    try {
      await updatePlanEvaluationForUser(userB.id, reportA.id, {
        nextWeekPlan: "curang",
        studentEvaluation: "curang",
      });
      check(
        "user B cannot update user A's plan",
        false,
        "no error thrown"
      );
    } catch (error) {
      check(
        "user B cannot update user A's plan",
        error instanceof ReportNotFoundError,
        String(error)
      );
    }

    // ===== 4. Completeness =====
    const completeA = computeReportCompleteness(previewWithPlan!);
    check(
      "full report computes complete",
      completeA.complete
    );

    const emptyPreview = await getReportPreviewForUser(userB.id, reportB.id);
    const completeB = computeReportCompleteness(emptyPreview!);
    check(
      "empty report computes incomplete",
      !completeB.complete
    );
    check(
      "empty report flags days/plan/evaluation/photos",
      Boolean(
        completeB.issues.find((i) => i.key === "days" && !i.present) &&
          completeB.issues.find((i) => i.key === "plan" && !i.present) &&
          completeB.issues.find((i) => i.key === "evaluation" && !i.present) &&
          completeB.issues.find((i) => i.key === "photos" && !i.present)
      )
    );
  } finally {
    await prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } });
    console.log(results.join("\n"));
    await prisma.$disconnect();
  }
}

main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});