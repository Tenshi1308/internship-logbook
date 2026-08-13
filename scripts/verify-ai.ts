import "./env";
import { prisma } from "../lib/prisma";
import { hashPassword } from "../lib/password";
import { encryptSecret } from "../lib/encrypt";
import {
  collectDailyLogEvidence,
  InsufficientEvidenceError,
  saveAiDraftForUser,
  saveFinalDescriptionForUser,
} from "../lib/ai-data";
import { dayNumber } from "../lib/dates";
import { ReportNotFoundError } from "../lib/reports";

async function main() {
  const results: string[] = [];
  const check = (name: string, ok: boolean, detail = "") => {
    results.push(`${ok ? "PASS" : "FAIL"}: ${name}${detail ? ` — ${detail}` : ""}`);
    if (!ok) process.exitCode = 1;
  };

  const hash = await hashPassword("password123");
  const suffix = Date.now();

  const userA = await prisma.user.create({
    data: {
      name: "AI Test User A",
      nim: `111${suffix}`.slice(0, 20),
      email: `ai-a-${suffix}@example.com`,
      passwordHash: hash,
      scheme: "Community Developer",
      partner: "Lavendrie Laundry",
    },
  });

  const userB = await prisma.user.create({
    data: {
      name: "AI Test User B",
      nim: `222${suffix}`.slice(0, 20),
      email: `ai-b-${suffix}@example.com`,
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
        weekNumber: 30,
        startDate: start,
        endDate: end,
        dailyLogs: {
          create: {
            dayNumber: dayNumber(start),
            date: start,
            startTime: "08:00",
            endTime: "16:00",
            location: "WFH",
            manualActivities: {
              create: [
                { order: 0, description: "Morning briefing dengan mentor" },
                { order: 1, description: "Menyusun skema database" },
              ],
            },
          },
        },
      },
      include: { dailyLogs: true },
    });
    const dailyLogA = reportA.dailyLogs[0];

    // Mock GitHub connection + repo + commit attached to user A's day
    const tokenEncrypted = await encryptSecret("gho_mock-ai-verify-token");
    const connectionA = await prisma.gitHubConnection.create({
      data: {
        userId: userA.id,
        githubUserId: "70001",
        githubUsername: "aitesta",
        accessTokenEncrypted: tokenEncrypted,
        repositories: {
          create: {
            githubId: 70002,
            userId: userA.id,
            name: "internship-logbook",
            fullName: "aitesta/internship-logbook",
            owner: "aitesta",
            defaultBranch: "main",
            commits: {
              create: {
                sha: "d".repeat(40),
                message: "feat: add AI draft feature",
                authorName: "AI Test User A",
                authorEmail: userA.email,
                committedAt: new Date("2026-08-10T03:00:00Z"),
                url: "https://github.com/aitesta/internship-logbook/commit/ddd",
              },
            },
          },
        },
      },
      include: { repositories: { include: { commits: true } } },
    });

    await prisma.logbookCommit.create({
      data: {
        dailyLogId: dailyLogA.id,
        commitId: connectionA.repositories[0].commits[0].id,
      },
    });

    // ===== 1. Evidence collection for owner =====
    const evidenceA = await collectDailyLogEvidence(
      userA.id,
      reportA.id,
      start
    );
    check(
      "collector includes manual activities",
      evidenceA.manualActivities.length === 2 &&
        evidenceA.manualActivities[0] === "Morning briefing dengan mentor"
    );
    check(
      "collector includes attached commits",
      evidenceA.commits.length === 1 &&
        evidenceA.commits[0].message === "feat: add AI draft feature"
    );
    check(
      "collector includes day context",
      evidenceA.date === "2026-08-10" &&
        evidenceA.location === "WFH" &&
        evidenceA.startTime === "08:00"
    );

    // ===== 2. Ownership isolation: user B cannot read user A's evidence =====
    try {
      await collectDailyLogEvidence(userB.id, reportA.id, start);
      check("user B blocked from user A's evidence", false, "no error thrown");
    } catch (error) {
      check(
        "user B blocked from user A's evidence",
        error instanceof ReportNotFoundError,
        String(error)
      );
    }

    // ===== 3. Save AI draft only for owner =====
    const savedDraft = await saveAiDraftForUser(
      userA.id,
      reportA.id,
      start,
      "Draf otomatis hasil AI."
    );
    check("AI draft persists to daily log", savedDraft.aiDraft === "Draf otomatis hasil AI.");

    try {
      await saveAiDraftForUser(userB.id, reportA.id, start, "curang");
      check("user B cannot save draft to user A's log", false, "no error thrown");
    } catch (error) {
      check(
        "user B cannot save draft to user A's log",
        error instanceof ReportNotFoundError,
        String(error)
      );
    }

    // ===== 4. Save final description only for owner =====
    const savedFinal = await saveFinalDescriptionForUser(
      userA.id,
      reportA.id,
      start,
      "Deskripsi final hasil suntingan pengguna."
    );
    check(
      "final description persists",
      savedFinal.finalDescription === "Deskripsi final hasil suntingan pengguna."
    );

    // existing final description must not be silently replaced by generation
    const before = await prisma.dailyLog.findUnique({
      where: { id: dailyLogA.id },
      select: { finalDescription: true },
    });
    await saveAiDraftForUser(userA.id, reportA.id, start, "Draf baru setelah final");
    const after = await prisma.dailyLog.findUnique({
      where: { id: dailyLogA.id },
      select: { finalDescription: true, aiDraft: true },
    });
    check(
      "generation overwrites aiDraft only, never finalDescription",
      before?.finalDescription === after?.finalDescription &&
        after?.aiDraft === "Draf baru setelah final" &&
        after?.finalDescription === "Deskripsi final hasil suntingan pengguna."
    );

    try {
      await saveFinalDescriptionForUser(userB.id, reportA.id, start, "curang2");
      check("user B cannot save final to user A's log", false, "no error thrown");
    } catch (error) {
      check(
        "user B cannot save final to user A's log",
        error instanceof ReportNotFoundError,
        String(error)
      );
    }

    // ===== 5. Insufficient evidence =====
    const emptyReport = await prisma.weeklyReport.create({
      data: {
        userId: userA.id,
        weekNumber: 31,
        startDate: start,
        endDate: end,
      },
    });
    const emptyDay = await saveFinalDescriptionForUser(
      userA.id,
      emptyReport.id,
      start,
      "Catatan manual hari itu."
    );
    check("day with no activities/commits created by saver", Boolean(emptyDay.id));

    try {
      await collectDailyLogEvidence(userA.id, emptyReport.id, start);
      check("insufficient evidence rejected", false, "no error thrown");
    } catch (error) {
      check(
        "insufficient evidence rejected",
        error instanceof InsufficientEvidenceError,
        String(error)
      );
    }

    // owner can still write manual description on a day with no activities
    const manual = await saveFinalDescriptionForUser(
      userA.id,
      emptyReport.id,
      start,
      "Menulis deskripsi sebelum ada bukti."
    );
    check(
      "manual description still saveable with no evidence",
      Boolean(manual.finalDescription?.includes("Menulis deskripsi"))
    );
  } finally {
    // Cleanup: cascade deletes all owned resources for both users
    await prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } });
    console.log(results.join("\n"));
    await prisma.$disconnect();
  }
}

main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});