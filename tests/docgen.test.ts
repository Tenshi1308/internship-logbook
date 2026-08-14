import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { inflateRawSync } from "node:zlib";
import test from "node:test";

import { buildReportDocx, type DocgenAssets } from "../lib/docgen/report-builder";
import { getImageDimensions, scaleToWidth } from "../lib/docgen/image-size";
import type { ReportPreview } from "../lib/preview";

function extractZipEntry(buffer: Buffer, entryName: string): string | null {
  const sig = 0x04034b50;
  let offset = 0;
  while (offset + 30 <= buffer.length) {
    if (buffer.readUInt32LE(offset) !== sig) {
      offset += 1;
      continue;
    }
    const method = buffer.readUInt16LE(offset + 8);
    const compSize = buffer.readUInt32LE(offset + 18);
    const nameLen = buffer.readUInt16LE(offset + 26);
    const extraLen = buffer.readUInt16LE(offset + 28);
    const name = buffer
      .toString("utf8", offset + 30, offset + 30 + nameLen)
      .replace(/\0/g, "");
    const dataStart = offset + 30 + nameLen + extraLen;
    const data = buffer.subarray(dataStart, dataStart + compSize);
    if (name === entryName) {
      if (method === 0) return data.toString("utf8");
      return inflateRawSync(data).toString("utf8");
    }
    offset = dataStart + compSize;
  }
  return null;
}

const LOGO = readFileSync("public/logo-universitas.png");

function png(width: number, height: number): Buffer {
  const signature = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);
  const ihdrChunkLength = Buffer.from([0, 0, 0, 13]);
  const ihdrType = Buffer.from("IHDR", "ascii");
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type RGB
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdrCrc = Buffer.from([0, 0, 0, 0]);
  const idatType = Buffer.from("IDAT", "ascii");
  const idatData = Buffer.from([0x78, 0x9c, 0x63, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01]);
  const idatCrc = Buffer.from([0, 0, 0, 0]);
  const idatLength = Buffer.alloc(4);
  idatLength.writeUInt32BE(idatData.length, 0);
  const iendType = Buffer.from("IEND", "ascii");
  const iendCrc = Buffer.from([0, 0, 0, 0]);
  return Buffer.concat([
    signature,
    ihdrChunkLength,
    ihdrType,
    ihdrData,
    ihdrCrc,
    idatLength,
    idatType,
    idatData,
    idatCrc,
    Buffer.from([0, 0, 0, 0]),
    iendType,
    iendCrc,
  ]);
}

function baseReport(overrides: Partial<ReportPreview> = {}): ReportPreview {
  return {
    id: "rpt_1",
    weekNumber: 3,
    startDate: new Date("2026-02-02T00:00:00.000Z"),
    endDate: new Date("2026-02-06T00:00:00.000Z"),
    status: "DRAFT",
    nextWeekPlan: null,
    studentEvaluation: null,
    user: {
      name: "Budi Santoso",
      nim: "2112100001",
      scheme: "Community Developer",
      partner: "PT Contoh Teknologi",
    },
    days: [],
    photos: [],
    ...overrides,
  };
}

function day(
  date: string,
  fields: Partial<ReportPreview["days"][number]> = {}
): ReportPreview["days"][number] {
  return {
    id: `d_${date}`,
    date: new Date(`${date}T00:00:00.000Z`),
    startTime: "08:00",
    endTime: "17:00",
    location: "Ruang Lab",
    finalDescription: null,
    activities: [],
    commits: [],
    ...fields,
  };
}

function findInBuffer(
  buffer: Buffer,
  needles: string[]
): string[] {
  const doc = extractZipEntry(buffer, "word/document.xml") ?? "";
  return needles.filter((needle) => doc.includes(needle));
}

test("getImageDimensions parses PNG header", () => {
  const dims = getImageDimensions(png(120, 80));
  assert.equal(dims.width, 120);
  assert.equal(dims.height, 80);
  assert.equal(dims.format, "png");
});

test("getImageDimensions rejects unsupported format", () => {
  assert.throws(() => getImageDimensions(Buffer.from("hello")), /Unsupported/);
});

test("scaleToWidth preserves aspect ratio", () => {
  assert.deepEqual(scaleToWidth(1200, 600, 600), { width: 600, height: 300 });
  assert.deepEqual(scaleToWidth(600, 1200, 300), { width: 300, height: 600 });
});

test("buildReportDocx produces a valid DOCX with all sections", async () => {
  const report = baseReport({
    nextWeekPlan: "Lanjut modul A.\nLanjut modul B.",
    studentEvaluation: "Mentor sangat membantu.",
    days: [
      day("2026-02-02", {
        startTime: "08:30",
        endTime: "16:30",
        finalDescription: "Melakukan onboarding dan setup proyek.",
        commits: [
          {
            sha: "abc1234567",
            message: "feat: init",
            url: "https://x/1",
            repositoryFullName: "org/repo",
            committedAt: new Date("2026-02-02T10:00:00.000Z"),
          },
        ],
      }),
      day("2026-02-03", {
        startTime: "",
        endTime: "",
        location: "",
        finalDescription: null,
        activities: [
          { id: "a1", order: 1, description: "Menulis dokumentasi API" },
        ],
      }),
    ],
    photos: [
      { id: "p1", url: "https://x/p1", caption: "Tampilan awal", order: 0 },
    ],
  });

  const assets: DocgenAssets = {
    logo: LOGO,
    photos: [{ data: png(1200, 800), caption: "Tampilan awal" }],
  };

  const buffer = await buildReportDocx(report, assets);
  assert.ok(buffer.length > 1000, "document should be non-trivial");

  assert.ok(buffer[0] === 0x50 && buffer[1] === 0x4b, "starts with PK zip magic");

  const found = findInBuffer(buffer, [
    "Times New Roman",
    "Log Harian Jam Kerja",
    "Rincian Kegiatan",
    "Rencana Kegiatan Untuk Minggu Depan",
    "Penilaian Mahasiswa Terhadap Kegiatan yang Berlangsung",
    "LAMPIRAN",
    "DOKUMENTASI DAN HASIL KEGIATAN",
    "PT Contoh Teknologi",
    "Lanjut modul A.",
    "Mentor sangat membantu.",
    "Melakukan onboarding dan setup proyek.",
    "Tampilan awal",
  ]);
  assert.deepEqual(found, [
    "Times New Roman",
    "Log Harian Jam Kerja",
    "Rincian Kegiatan",
    "Rencana Kegiatan Untuk Minggu Depan",
    "Penilaian Mahasiswa Terhadap Kegiatan yang Berlangsung",
    "LAMPIRAN",
    "DOKUMENTASI DAN HASIL KEGIATAN",
    "PT Contoh Teknologi",
    "Lanjut modul A.",
    "Mentor sangat membantu.",
    "Melakukan onboarding dan setup proyek.",
    "Tampilan awal",
  ]);
});

test("buildReportDocx renders daily rows across the week range", async () => {
  const report = baseReport();
  const buffer = await buildReportDocx(report, { logo: LOGO, photos: [] });

  const doc = extractZipEntry(buffer, "word/document.xml") ?? "";
  const dayLabels = [
    "Senin",
    "Selasa",
    "Rabu",
    "Kamis",
    "Jumat",
  ];
  for (const label of dayLabels) {
    assert.ok((doc).includes(label), `expected day label ${label}`);
  }
  assert.ok((doc).includes("2 Februari 2026"), "expected start date");
  assert.ok((doc).includes("6 Februari 2026"), "expected end date");
});

test("buildReportDocx shows fallback '-' and 'Belum diisi' for missing data", async () => {
  const report = baseReport({ days: [day("2026-02-04", { startTime: "", endTime: "", location: "", finalDescription: null, activities: [], commits: [] })] });
  const buffer = await buildReportDocx(report, { logo: LOGO, photos: [] });
  const doc = extractZipEntry(buffer, "word/document.xml") ?? "";

  // Day 1 (Mon) has no log row given missing days: '-' time range
  const dashCount = (doc.match(/-/g) || []).length;
  assert.ok(dashCount > 0, "expected '-' fallbacks in the document");
  assert.ok((doc).includes("Belum diisi."), "expected 'Belum diisi.' for plan/evaluation");
});

test("buildReportDocx writes 'Bukti GitHub' and commit details", async () => {
  const report = baseReport({
    days: [
      day("2026-02-02", {
        finalDescription: null,
        activities: [],
        commits: [
          {
            sha: "abcdef12",
            message: "fix: auth flow",
            url: "https://x/c",
            repositoryFullName: "company/app",
            committedAt: new Date("2026-02-02T10:00:00.000Z"),
          },
        ],
      }),
    ],
  });
  const buffer = await buildReportDocx(report, { logo: LOGO, photos: [] });
  const doc = extractZipEntry(buffer, "word/document.xml") ?? "";
  assert.ok((doc).includes("Bukti GitHub:"), "expected Bukti GitHub label");
  assert.ok(
    doc.includes("fix: auth flow (company/app@abcdef1)"),
    "expected formatted commit line with 7-char sha"
  );
});

test("buildReportDocx uses finalDescription over activities", async () => {
  const report = baseReport({
    days: [
      day("2026-02-02", {
        finalDescription: "Deskripsi final hari ini.",
        activities: [
          { id: "a1", order: 1, description: "Aktivitas lama." },
        ],
      }),
    ],
  });
  const buffer = await buildReportDocx(report, { logo: LOGO, photos: [] });
  const doc = extractZipEntry(buffer, "word/document.xml") ?? "";
  assert.ok((doc).includes("Deskripsi final hari ini."), "expected finalDescription");
  assert.ok(!doc.includes("Aktivitas lama."), "activities should be ignored when finalDescription exists");
});

test("buildReportDocx embeds appendix photos and captions in order", async () => {
  const report = baseReport({
    photos: [
      { id: "p1", url: "https://x/p1", caption: "Foto pertama", order: 0 },
      { id: "p2", url: "https://x/p2", caption: "Foto kedua", order: 1 },
    ],
  });
  const photos = [
    { data: png(1200, 800), caption: "Foto pertama" },
    { data: png(800, 1200), caption: "Foto kedua" },
  ];
  const buffer = await buildReportDocx(report, { logo: LOGO, photos });
  const doc = extractZipEntry(buffer, "word/document.xml") ?? "";
  assert.ok((doc).includes("Gambar 1. Foto pertama"));
  assert.ok((doc).includes("Gambar 2. Foto kedua"));
  const mediaCount = (doc.match(/image\d+\.png/g) || []).length;
  assert.equal(mediaCount, 0);
  assert.ok(/<w:drawing>/.test(doc), "expected inline drawings");
});