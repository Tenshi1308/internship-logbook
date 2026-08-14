import {
  AlignmentType,
  Document,
  ImageRun,
  LevelFormat,
  PageBreak,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalMergeType,
  WidthType,
} from "docx";
import { daysBetween, toDateOnly, weekdayOf } from "@/lib/dates";
import type { ReportPreview } from "@/lib/preview";
import { getImageDimensions, scaleToWidth } from "@/lib/docgen/image-size";
import {
  AFTER_SPACING,
  BODY_FONT,
  BODY_SIZE_HALF_POINTS,
  CELL_BORDER,
  HEADER_GRID,
  HEADING_SHADING,
  HEADING_SIZE_HALF_POINTS,
  LINE_RULE,
  LINE_SPACING,
  LOGO_HEIGHT_PX,
  LOGO_WIDTH_PX,
  PAGE_HEIGHT_TWIPS,
  PAGE_MARGIN_TWIPS,
  PAGE_WIDTH_TWIPS,
  PHOTO_LANDSCAPE_WIDTH_PX,
  PHOTO_PORTRAIT_WIDTH_PX,
  SECTION1_GRID,
  SECTION2_GRID,
  TABLE_BORDERS,
  TITLE_SIZE_HALF_POINTS,
} from "@/lib/docgen/template-spec";

export type DocgenImage = {
  data: Buffer;
  caption: string | null;
};

export type DocgenAssets = {
  logo: Buffer;
  photos: DocgenImage[];
};

function runOptions(bold = false): {
  font: string;
  size: number;
  bold: boolean;
} {
  return { font: BODY_FONT, size: BODY_SIZE_HALF_POINTS, bold };
}

function bodyRun(text: string, options?: { bold?: boolean }): TextRun {
  return new TextRun({
    text,
    ...runOptions(options?.bold ?? false),
  });
}

function paragraphSpacing() {
  return {
    after: AFTER_SPACING,
    line: LINE_SPACING,
    lineRule: LINE_RULE,
  };
}

function headingParagraph(text: string, numbering: string): Paragraph {
  return new Paragraph({
    shading: HEADING_SHADING,
    spacing: paragraphSpacing(),
    numbering: { reference: numbering, level: 0 },
    children: [
      new TextRun({
        text,
        ...runOptions(true),
        size: HEADING_SIZE_HALF_POINTS,
      }),
    ],
  });
}

function metadataParagraph(label: string, value: string): Paragraph {
  return new Paragraph({
    spacing: paragraphSpacing(),
    children: [
      bodyRun(label, { bold: true }),
      bodyRun(value),
    ],
  });
}

function centeredCell(text: string, width: number): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: {
      top: CELL_BORDER,
      bottom: CELL_BORDER,
      left: CELL_BORDER,
      right: CELL_BORDER,
    },
    children: [
      new Paragraph({
        spacing: paragraphSpacing(),
        alignment: AlignmentType.CENTER,
        children: [bodyRun(text, { bold: true })],
      }),
    ],
  });
}

function dataCell(text: string, width: number, center = false): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: {
      top: CELL_BORDER,
      bottom: CELL_BORDER,
      left: CELL_BORDER,
      right: CELL_BORDER,
    },
    children: [
      new Paragraph({
        spacing: paragraphSpacing(),
        alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT,
        children: [bodyRun(text)],
      }),
    ],
  });
}

function headerTable(logo: Buffer): Table {
  const width = HEADER_GRID[0] + HEADER_GRID[1];
  const logoCellParagraph = new Paragraph({
    spacing: paragraphSpacing(),
    alignment: AlignmentType.CENTER,
    children: [
      new ImageRun({
        data: logo,
        type: "png",
        transformation: { width: LOGO_WIDTH_PX, height: LOGO_HEIGHT_PX },
        altText: { title: "Logo universitas", name: "Logo universitas" },
      }),
    ],
  });

  const university = new Paragraph({
    spacing: paragraphSpacing(),
    alignment: AlignmentType.CENTER,
    children: [
      bodyRun("UNIVERSITAS PIGNATELLI TRIPUTRA", { bold: true }),
    ],
  });
  const faculty = new Paragraph({
    spacing: paragraphSpacing(),
    alignment: AlignmentType.CENTER,
    children: [bodyRun("FAKULTAS SAINS DAN TEKNOLOGI", { bold: true })],
  });
  const studyProgram = new Paragraph({
    spacing: paragraphSpacing(),
    alignment: AlignmentType.CENTER,
    children: [bodyRun("PROGRAM STUDI S1 INFORMATIKA", { bold: true })],
  });

  const title = new Paragraph({
    spacing: paragraphSpacing(),
    alignment: AlignmentType.CENTER,
    children: [
      new TextRun({
        text: "LAPORAN MINGGUAN IMMERSION PROGRAM",
        ...runOptions(true),
        size: TITLE_SIZE_HALF_POINTS,
      }),
    ],
  });

  return new Table({
    width: { size: width, type: WidthType.DXA },
    columnWidths: HEADER_GRID,
    borders: TABLE_BORDERS,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: HEADER_GRID[0], type: WidthType.DXA },
            verticalMerge: VerticalMergeType.RESTART,
            borders: {
              top: CELL_BORDER,
              bottom: CELL_BORDER,
              left: CELL_BORDER,
              right: CELL_BORDER,
            },
            children: [logoCellParagraph],
          }),
          new TableCell({
            width: { size: HEADER_GRID[1], type: WidthType.DXA },
            borders: {
              top: CELL_BORDER,
              bottom: CELL_BORDER,
              left: CELL_BORDER,
              right: CELL_BORDER,
            },
            children: [university, faculty, studyProgram],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            width: { size: HEADER_GRID[0], type: WidthType.DXA },
            verticalMerge: VerticalMergeType.CONTINUE,
            borders: {
              top: CELL_BORDER,
              bottom: CELL_BORDER,
              left: CELL_BORDER,
              right: CELL_BORDER,
            },
            children: [],
          }),
          new TableCell({
            width: { size: HEADER_GRID[1], type: WidthType.DXA },
            borders: {
              top: CELL_BORDER,
              bottom: CELL_BORDER,
              left: CELL_BORDER,
              right: CELL_BORDER,
            },
            children: [title],
          }),
        ],
      }),
    ],
  });
}

function timeRange(startTime: string, endTime: string): string {
  if (startTime && endTime) return `${startTime} - ${endTime}`;
  return "-";
}

function section1Table(report: ReportPreview): Table {
  const grid = SECTION1_GRID;
  const width = grid.reduce((sum, col) => sum + col, 0);
  const rows: TableRow[] = [
    new TableRow({
      children: [
        centeredCell("No", grid[0]),
        centeredCell("Hari", grid[1]),
        centeredCell("Tanggal", grid[2]),
        centeredCell("Jam Kerja", grid[3]),
      ],
    }),
  ];

  const logByDate = new Map(
    report.days.map((log) => [toDateOnly(log.date), log])
  );
  const dayRows = daysBetween(report.startDate, report.endDate);
  dayRows.forEach((date, index) => {
    const log = logByDate.get(toDateOnly(date)) ?? null;
    rows.push(
      new TableRow({
        children: [
          dataCell(String(index + 1), grid[0], true),
          dataCell(weekdayOf(date), grid[1]),
          dataCell(
            new Intl.DateTimeFormat("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
              timeZone: "UTC",
            }).format(date),
            grid[2]
          ),
          dataCell(
            timeRange(log?.startTime ?? "", log?.endTime ?? ""),
            grid[3],
            true
          ),
        ],
      })
    );
  });

  return new Table({
    width: { size: width, type: WidthType.DXA },
    columnWidths: grid,
    borders: TABLE_BORDERS,
    rows,
  });
}

export function shortSha(sha: string): string {
  return sha.length > 7 ? sha.slice(0, 7) : sha;
}

function rincianBlocks(log: ReportPreview["days"][number] | null): string[] {
  if (!log) return ["-"];
  const description = log.finalDescription?.trim();
  if (description) return [description];
  const activities = log.activities
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((activity) => activity.description);
  if (activities.length > 0) return activities;
  if (log.commits.length > 0) return [];
  return ["-"];
}

function section2Table(report: ReportPreview): Table {
  const grid = SECTION2_GRID;
  const width = grid.reduce((sum, col) => sum + col, 0);
  const rows: TableRow[] = [
    new TableRow({
      children: [
        centeredCell("No", grid[0]),
        centeredCell("Hari - Tanggal", grid[1]),
        centeredCell("Lokasi", grid[2]),
        centeredCell("Rincian Kegiatan", grid[3]),
      ],
    }),
  ];

  const logByDate = new Map(
    report.days.map((log) => [toDateOnly(log.date), log])
  );
  const dayRows = daysBetween(report.startDate, report.endDate);
  dayRows.forEach((date, index) => {
    const log = logByDate.get(toDateOnly(date)) ?? null;
    const dayLabel = `${weekdayOf(date)} / ${new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(date)}`;
    const blocks = rincianBlocks(log);
    const paragraphs: Paragraph[] = blocks.map((block) => {
      const children = [bodyRun(block)];
      if (block === blocks[blocks.length - 1] && log?.commits.length) {
        children.push(bodyRun(""));
      }
      return new Paragraph({
        spacing: paragraphSpacing(),
        alignment: AlignmentType.BOTH,
        children,
      });
    });

    if (log?.commits.length) {
      paragraphs.push(
        new Paragraph({
          spacing: paragraphSpacing(),
          alignment: AlignmentType.BOTH,
          children: [bodyRun("Bukti GitHub:", { bold: false })],
        }),
        ...log.commits.map(
          (commit) =>
            new Paragraph({
              spacing: paragraphSpacing(),
              alignment: AlignmentType.BOTH,
              children: [
                bodyRun(
                  `- ${commit.message} (${commit.repositoryFullName}@${shortSha(commit.sha)})`
                ),
              ],
            })
        )
      );
    }

    rows.push(
      new TableRow({
        children: [
          dataCell(String(index + 1), grid[0], true),
          dataCell(dayLabel, grid[1]),
          dataCell(log?.location || "-", grid[2]),
          new TableCell({
            width: { size: grid[3], type: WidthType.DXA },
            borders: {
              top: CELL_BORDER,
              bottom: CELL_BORDER,
              left: CELL_BORDER,
              right: CELL_BORDER,
            },
            children: paragraphs.length > 0 ? paragraphs : [
              new Paragraph({
                spacing: paragraphSpacing(),
                alignment: AlignmentType.BOTH,
                children: [bodyRun("-")],
              }),
            ],
          }),
        ],
      })
    );
  });

  return new Table({
    width: { size: width, type: WidthType.DXA },
    columnWidths: grid,
    borders: TABLE_BORDERS,
    rows,
  });
}

function letterItems(text: string | null): string[] {
  if (!text) return [];
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function listParagraph(text: string, numbering: string): Paragraph {
  return new Paragraph({
    spacing: paragraphSpacing(),
    numbering: { reference: numbering, level: 0 },
    children: [bodyRun(text)],
  });
}

function appendixParagraphs(photos: DocgenImage[]): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  paragraphs.push(
    new Paragraph({
      children: [new PageBreak()],
    })
  );

  paragraphs.push(
    new Paragraph({
      spacing: paragraphSpacing(),
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: "LAMPIRAN", ...runOptions(true) }),
      ],
    })
  );

  paragraphs.push(
    new Paragraph({
      spacing: paragraphSpacing(),
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: "\u201CDOKUMENTASI DAN HASIL KEGIATAN\u201D",
          ...runOptions(true),
        }),
      ],
    })
  );

  if (photos.length === 0) {
    paragraphs.push(
      new Paragraph({
        spacing: paragraphSpacing(),
        children: [bodyRun("Belum ada dokumentasi.")],
      })
    );
    return paragraphs;
  }

  photos.forEach((photo, index) => {
    const dims = getImageDimensions(photo.data);
    const isLandscape = dims.width >= dims.height;
    const targetWidth = isLandscape
      ? PHOTO_LANDSCAPE_WIDTH_PX
      : PHOTO_PORTRAIT_WIDTH_PX;
    const scaled = scaleToWidth(dims.width, dims.height, targetWidth);

    paragraphs.push(
      new Paragraph({
        spacing: paragraphSpacing(),
        alignment: AlignmentType.CENTER,
        children: [
          new ImageRun({
            data: photo.data,
            type: photo.data[0] === 0xff && photo.data[1] === 0xd8 ? "jpg" : "png",
            transformation: { width: scaled.width, height: scaled.height },
            altText: {
              title: photo.caption ?? `Dokumentasi ${index + 1}`,
              name: photo.caption ?? `Dokumentasi ${index + 1}`,
            },
          }),
        ],
      })
    );

    if (photo.caption) {
      paragraphs.push(
        new Paragraph({
          spacing: paragraphSpacing(),
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: `Gambar ${index + 1}. ${photo.caption}`,
              ...runOptions(),
              italics: true,
            }),
          ],
        })
      );
    }
  });

  return paragraphs;
}

export async function buildReportDocx(
  report: ReportPreview,
  assets: DocgenAssets
): Promise<Buffer> {
  const documentChildren: (Paragraph | Table)[] = [
    headerTable(assets.logo),
    new Paragraph({ spacing: paragraphSpacing() }),
    metadataParagraph("Skema : ", report.user.scheme),
    metadataParagraph("Mitra : ", report.user.partner),
    metadataParagraph(
      "Minggu ke : ",
      `${report.weekNumber} (${new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(report.startDate)} - ${new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(report.endDate)})`
    ),
    new Paragraph({ spacing: paragraphSpacing() }),
    headingParagraph("Log Harian Jam Kerja", "sections"),
    section1Table(report),
    new Paragraph({ spacing: paragraphSpacing() }),
    headingParagraph("Rincian Kegiatan", "sections"),
    section2Table(report),
    new Paragraph({ spacing: paragraphSpacing() }),
    headingParagraph("Rencana Kegiatan Untuk Minggu Depan", "sections"),
    ...(letterItems(report.nextWeekPlan).length > 0
      ? letterItems(report.nextWeekPlan).map((item) =>
          listParagraph(item, "letters")
        )
      : [new Paragraph({ spacing: paragraphSpacing(), children: [bodyRun("Belum diisi.")] })]),
    new Paragraph({ spacing: paragraphSpacing() }),
    headingParagraph(
      "Penilaian Mahasiswa Terhadap Kegiatan yang Berlangsung",
      "sections"
    ),
    ...(letterItems(report.studentEvaluation).length > 0
      ? letterItems(report.studentEvaluation).map((item) =>
          listParagraph(item, "letters")
        )
      : [new Paragraph({ spacing: paragraphSpacing(), children: [bodyRun("Belum diisi.")] })]),
    new Paragraph({ spacing: paragraphSpacing() }),
    ...appendixParagraphs(assets.photos),
  ];

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: BODY_FONT,
            size: BODY_SIZE_HALF_POINTS,
          },
          paragraph: {
            spacing: paragraphSpacing(),
          },
        },
      },
    },
    numbering: {
      config: [
        {
          reference: "sections",
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.START,
              start: 1,
            },
          ],
        },
        {
          reference: "letters",
          levels: [
            {
              level: 0,
              format: LevelFormat.LOWER_LETTER,
              text: "%1.",
              alignment: AlignmentType.START,
              start: 1,
              style: {
                paragraph: {
                  indent: { left: 852, hanging: 426 },
                },
              },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: PAGE_WIDTH_TWIPS,
              height: PAGE_HEIGHT_TWIPS,
            },
            margin: {
              top: PAGE_MARGIN_TWIPS,
              bottom: PAGE_MARGIN_TWIPS,
              left: PAGE_MARGIN_TWIPS,
              right: PAGE_MARGIN_TWIPS,
            },
          },
        },
        children: documentChildren,
      },
    ],
  });

  return Packer.toBuffer(doc);
}