import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  computeReportCompleteness,
  mapReportPreview,
  type PrismaReportPreview,
} from "../lib/preview";

function basePrismaReport(
  overrides: Partial<PrismaReportPreview> = {}
): PrismaReportPreview {
  return {
    id: "rpt_1",
    weekNumber: 1,
    startDate: new Date("2026-02-02T00:00:00.000Z"),
    endDate: new Date("2026-02-06T00:00:00.000Z"),
    status: "DRAFT",
    nextWeekPlan: null,
    studentEvaluation: null,
    user: {
      name: "Budi Santoso",
      nim: "2112100001",
      scheme: "Non Reguler",
      partner: "PT Contoh Teknologi",
    },
    dailyLogs: [],
    documentationPhotos: [],
    ...overrides,
  };
}

function day(
  id: string,
  date: string,
  fields: Partial<{
    startTime: string;
    endTime: string;
    location: string;
    finalDescription: string;
    activities: PrismaReportPreview["dailyLogs"][number]["manualActivities"];
    commits: PrismaReportPreview["dailyLogs"][number]["logbookCommits"];
  }> = {}
): PrismaReportPreview["dailyLogs"][number] {
  return {
    id,
    date: new Date(`${date}T00:00:00.000Z`),
    startTime: fields.startTime ?? "08:00",
    endTime: fields.endTime ?? "17:00",
    location: fields.location ?? "Ruang Lab",
    finalDescription: fields.finalDescription ?? null,
    manualActivities: fields.activities ?? [],
    logbookCommits: fields.commits ?? [],
  };
}

describe("mapReportPreview", () => {
  it("maps user, report fields and preserves day order", () => {
    const report = basePrismaReport({
      nextWeekPlan: "Menyelesaikan modul frontend.",
      studentEvaluation: "Kegiatan berjalan lancar.",
      dailyLogs: [day("d1", "2026-02-02"), day("d2", "2026-02-03")], documentationPhotos: [{ id: "p1", url: "https://x/1", caption: "Foto A", order: 0 }, { id: "p2", url: "https://x/2", caption: "Foto B", order: 1 }],
    });

    const preview = mapReportPreview(report);

    assert.equal(preview.user.name, "Budi Santoso");
    assert.equal(preview.user.scheme, "Non Reguler");
    assert.equal(preview.weekNumber, 1);
    assert.equal(preview.nextWeekPlan, "Menyelesaikan modul frontend.");
    assert.equal(preview.studentEvaluation, "Kegiatan berjalan lancar.");
assert.deepEqual(
      preview.days.map((d) => d.date.toISOString()),
      ["2026-02-02T00:00:00.000Z", "2026-02-03T00:00:00.000Z"]
    );
    assert.deepEqual(
      preview.photos.map((p) => p.url),
      ["https://x/1", "https://x/2"]
    );
  });

  it("maps activities by given order and commits with repo name", () => {
    const report = basePrismaReport({
      dailyLogs: [
        day("d1", "2026-02-02", {
          activities: [
            { id: "a1", order: 0, description: "Pertama" },
            { id: "a2", order: 1, description: "Kedua" },
          ],
          commits: [
            {
              commit: {
                sha: "abcdef1234567890",
                message: "feat: add auth",
                url: "https://gh/c/1",
                committedAt: new Date("2026-02-02T10:00:00.000Z"),
                repository: { fullName: "org/repo-a" },
              },
            },
          ],
        }),
      ],
    });

    const preview = mapReportPreview(report);
    assert.deepEqual(
      preview.days[0].activities.map((a) => a.description),
      ["Pertama", "Kedua"]
    );
    assert.equal(preview.days[0].commits[0].repositoryFullName, "org/repo-a");
    assert.equal(preview.days[0].commits[0].sha, "abcdef1234567890");
  });
});

describe("computeReportCompleteness", () => {
  it("returns complete for a full report", () => {
    const preview = mapReportPreview(
      basePrismaReport({
        nextWeekPlan: "Rencana minggu depan",
        studentEvaluation: "Penilaian",
        dailyLogs: [
          day("d1", "2026-02-02", {
            activities: [{ id: "a1", order: 0, description: "Kerja" }],
          }),
        ],
        documentationPhotos: [
          { id: "p1", url: "https://x/1", caption: "Foto", order: 0 },
        ],
      })
    );

    const result = computeReportCompleteness(preview);
    assert.equal(result.complete, true);
    assert.ok(result.issues.every((issue) => issue.present));
  });

  it("flags missing profile, days, hours, activities, plan, evaluation and photos", () => {
    const preview = mapReportPreview(
      basePrismaReport({
        user: { name: "", nim: "", scheme: "", partner: "" },
        dailyLogs: [
          day("d1", "2026-02-02", { startTime: "", endTime: "" }),
        ],
      })
    );

    const result = computeReportCompleteness(preview);
    assert.equal(result.complete, false);

    const byKey = new Map(result.issues.map((i) => [i.key, i.present]));
    assert.equal(byKey.get("profile"), false);
    assert.equal(byKey.get("days"), true);
    assert.equal(byKey.get("hours"), false);
    assert.equal(byKey.get("activities"), false);
    assert.equal(byKey.get("plan"), false);
    assert.equal(byKey.get("evaluation"), false);
    assert.equal(byKey.get("photos"), false);
  });

  it("counts hours present when any day has both times", () => {
    const preview = mapReportPreview(
      basePrismaReport({
        dailyLogs: [
          day("d1", "2026-02-02", { startTime: "", endTime: "" }),
          day("d2", "2026-02-03"),
        ],
      })
    );
    const result = computeReportCompleteness(preview);
    assert.equal(
      new Map(result.issues.map((i) => [i.key, i.present])).get("hours"),
      true
    );
  });

  it("counts activities present when commits exist even without text", () => {
    const preview = mapReportPreview(
      basePrismaReport({
        dailyLogs: [
          day("d1", "2026-02-02", {
            activities: [],
            commits: [
              {
                commit: {
                  sha: "ab12",
                  message: "fix bug",
                  url: "https://gh/c/1",
                  committedAt: new Date("2026-02-02T10:00:00.000Z"),
                  repository: { fullName: "org/r"},
                },
              },
            ],
          }),
        ],
      })
    );
    const result = computeReportCompleteness(preview);
    assert.equal(
      new Map(result.issues.map((i) => [i.key, i.present])).get("activities"),
      true
    );
  });

  it("flags an inverted week range as incomplete", () => {
    const preview = mapReportPreview(
      basePrismaReport({
        startDate: new Date("2026-02-06T00:00:00.000Z"),
        endDate: new Date("2026-02-02T00:00:00.000Z"),
      })
    );
    const result = computeReportCompleteness(preview);
    assert.equal(
      new Map(result.issues.map((i) => [i.key, i.present])).get("weekRange"),
      false
    );
  });
});
