import "./env";
import { prisma } from "../lib/prisma";
import { hashPassword } from "../lib/password";
import {
  addPhotoForUser,
  deletePhotoForUser,
  listPhotosForReport,
  PhotoNotFoundError,
  reorderPhotosForUser,
  updatePhotoCaptionForUser,
} from "../lib/photos";
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
      name: "Photos Test User A",
      nim: `111${suffix}`.slice(0, 20),
      email: `photos-a-${suffix}@example.com`,
      passwordHash: hash,
      scheme: "Community Developer",
      partner: "Lavendrie Laundry",
    },
  });

  const userB = await prisma.user.create({
    data: {
      name: "Photos Test User B",
      nim: `222${suffix}`.slice(0, 20),
      email: `photos-b-${suffix}@example.com`,
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
        weekNumber: 40,
        startDate: start,
        endDate: end,
        dailyLogs: {
          create: {
            dayNumber: dayNumber(start),
            date: start,
            startTime: "08:00",
            endTime: "16:00",
            location: "WFH",
          },
        },
      },
      include: { dailyLogs: true },
    });
    const dailyLogA = reportA.dailyLogs[0];
    const reportB = await prisma.weeklyReport.create({
      data: {
        userId: userB.id,
        weekNumber: 41,
        startDate: start,
        endDate: end,
      },
    });

    // ===== 1. Empty report lists no photos =====
    const empty = await listPhotosForUserOrFail(userA.id, reportA.id);
    check("empty report lists no photos", empty.length === 0);

    // ===== 2. Add photos with auto-incrementing order =====
    const photo1 = await addPhotoForUser(userA.id, reportA.id, {
      cloudinaryPublicId: "reports/r40/first",
      url: "https://res.example.test/reports/r40/first.jpg",
      caption: "Kickoff meeting",
    });
    const photo2 = await addPhotoForUser(userA.id, reportA.id, {
      cloudinaryPublicId: "reports/r40/second",
      url: "https://res.example.test/reports/r40/second.jpg",
    });
    check("photo 1 order is 0", photo1.order === 0 && photo1.id.length > 0);
    check(
      "photo 2 order is 1 (auto-increment)",
      photo2.order === 1 && photo2.caption === ""
    );
    check(
      "photo 1 caption saved",
      photo1.caption === "Kickoff meeting" &&
        photo1.cloudinaryPublicId === "reports/r40/first"
    );

    // ===== 3. List returns stable order =====
    let listed = await listPhotosForUserOrFail(userA.id, reportA.id);
    check(
      "list returns ascending order with captions",
      listed.map((photo) => photo.id).join(",") ===
        [photo1.id, photo2.id].join(",")
    );

    // ===== 4. Update caption persists and trims =====
    const updated = await updatePhotoCaptionForUser(
      userA.id,
      reportA.id,
      photo1.id,
      "  Kickoff bersama tim  "
    );
    check(
      "caption update persists trimmed",
      updated.caption === "Kickoff bersama tim"
    );

    // ===== 5. Reorder swaps positions atomically =====
    const reordered = await reorderPhotosForUser(userA.id, reportA.id, [
      photo2.id,
      photo1.id,
    ]);
    check(
      "reorder persists new order",
      reordered.map((photo) => photo.id).join(",") ===
        [photo2.id, photo1.id].join(",") &&
        reordered.map((photo) => photo.order).join(",") === "0,1"
    );

    // ===== 6. Reorder rejects partial or foreign ids =====
    try {
      await reorderPhotosForUser(userA.id, reportA.id, [photo1.id]);
      check("reorder with missing ids rejected", false, "no error thrown");
    } catch (error) {
      check(
        "reorder with missing ids rejected",
        error instanceof PhotoNotFoundError,
        String(error)
      );
    }
    try {
      await reorderPhotosForUser(userA.id, reportA.id, [
        photo2.id,
        photo2.id,
      ]);
      check("reorder with duplicate ids rejected", false, "no error thrown");
    } catch (error) {
      check(
        "reorder with duplicate ids rejected",
        error instanceof PhotoNotFoundError,
        String(error)
      );
    }

    // ===== 7. Delete removes record and renumbers remaining =====
    await prisma.documentationPhoto.create({
      data: {
        weeklyReportId: reportA.id,
        dailyLogId: dailyLogA.id,
        cloudinaryPublicId: "reports/r40/third-temp",
        url: "https://res.example.test/reports/r40/third-temp.jpg",
        order: 2,
      },
    });
    const manualThird = await prisma.documentationPhoto.findFirst({
      where: { weeklyReportId: reportA.id, order: 2 },
    });
    check("photo with dailyLogId association created", Boolean(manualThird?.dailyLogId === dailyLogA.id));

    // order now: photo2(0), photo1(1), third(2) — delete photo1
    const deleted = await deletePhotoForUser(userA.id, reportA.id, photo1.id);
    check("delete returns removed photo metadata", deleted.id === photo1.id);
    listed = await listPhotosForUserOrFail(userA.id, reportA.id);
    check(
      "remaining photos renumbered consistently",
      listed.map((photo) => photo.order).join(",") === "0,1" &&
        listed.find((photo) => photo.id === photo2.id)?.order === 0
    );

    // ===== 8. Ownership isolation: user B cannot touch user A's data =====
    try {
      await addPhotoForUser(userB.id, reportA.id, {
        cloudinaryPublicId: "x",
        url: "https://res.example.test/x.jpg",
      });
      check("user B cannot add to user A's report", false, "no error thrown");
    } catch (error) {
      check(
        "user B cannot add to user A's report",
        error instanceof ReportNotFoundError,
        String(error)
      );
    }
    try {
      await updatePhotoCaptionForUser(userB.id, reportA.id, photo2.id, "curang");
      check("user B cannot edit user A's caption", false, "no error thrown");
    } catch (error) {
      check(
        "user B cannot edit user A's caption",
        error instanceof PhotoNotFoundError ||
          error instanceof ReportNotFoundError,
        String(error)
      );
    }
    try {
      await deletePhotoForUser(userB.id, reportA.id, photo2.id);
      check("user B cannot delete user A's photo", false, "no error thrown");
    } catch (error) {
      check(
        "user B cannot delete user A's photo",
        error instanceof PhotoNotFoundError ||
          error instanceof ReportNotFoundError,
        String(error)
      );
    }
    try {
      await reorderPhotosForUser(userB.id, reportA.id, [photo2.id]);
      check("user B cannot reorder user A's photos", false, "no error thrown");
    } catch (error) {
      check(
        "user B cannot reorder user A's photos",
        error instanceof ReportNotFoundError,
        String(error)
      );
    }
    try {
      await listPhotosForUserOrFail(userB.id, reportA.id);
      check("user B cannot list user A's photos", false, "no error thrown");
    } catch (error) {
      check(
        "user B cannot list user A's photos",
        error instanceof ReportNotFoundError,
        String(error)
      );
    }

    // ===== 9. Invalid dailyLogId rejected =====
    // user B owns reportB but a dailyLog from user A's report must be rejected
    try {
      await addPhotoForUser(userB.id, reportB.id, {
        cloudinaryPublicId: "x",
        url: "https://res.example.test/x.jpg",
        dailyLogId: dailyLogA.id,
      });
      check("cross-report dailyLogId rejected", false, "no error thrown");
    } catch (error) {
      check(
        "cross-report dailyLogId rejected",
        error instanceof PhotoNotFoundError || error instanceof ReportNotFoundError,
        String(error)
      );
    }

    // ===== 10. Order continues from max after cleanup =====
    const existingCount = await prisma.documentationPhoto.count({
      where: { weeklyReportId: reportA.id },
    });
    const next = await addPhotoForUser(userA.id, reportA.id, {
      cloudinaryPublicId: "reports/r40/next",
      url: "https://res.example.test/reports/r40/next.jpg",
    });
    check(
      "new photo order continues from max",
      next.order === existingCount && next.order >= 1
    );
  } finally {
    await prisma.user.deleteMany({
      where: { id: { in: [userA.id, userB.id] } },
    });
    console.log(results.join("\n"));
    await prisma.$disconnect();
  }
}

// Wrapper that re-throws like the ai verifier does with explicit list call
async function listPhotosForUserOrFail(userId: string, reportId: string) {
  return listPhotosForReport(userId, reportId);
}

main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});