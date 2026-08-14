import { daysBetween, formatDayShort, toDateOnly, weekdayOf } from "@/lib/dates";
import {
  computeReportCompleteness,
  type PreviewDay,
  type ReportPreview,
} from "@/lib/preview";

type PreviewDayRow = {
  date: Date;
  log: PreviewDay | null;
};

function letters(): string[] {
  return Array.from({ length: 26 }, (_, index) =>
    String.fromCharCode(97 + index)
  ).concat(
    Array.from({ length: 100 }, (_, index) => {
      const a = String.fromCharCode(97 + Math.floor(index / 26));
      const b = String.fromCharCode(97 + (index % 26));
      return a + b;
    })
  );
}

function letterItems(text: string | null): string[] {
  if (!text) return [];
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function timeRange(log: PreviewDay | null): string {
  if (log && log.startTime && log.endTime) {
    return `${log.startTime} - ${log.endTime}`;
  }
  return "-";
}

function rincianLines(log: PreviewDay | null): {
  paragraphs: string[];
  commits: { message: string; repositoryFullName: string; sha: string }[];
} {
  if (!log) {
    return { paragraphs: [], commits: [] };
  }
  if (log.finalDescription && log.finalDescription.trim().length > 0) {
    return {
      paragraphs: [log.finalDescription.trim()],
      commits: log.commits,
    };
  }
  const activities = log.activities
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((activity) => activity.description);
  return { paragraphs: activities, commits: log.commits };
}

function shortSha(sha: string): string {
  return sha.length > 7 ? sha.slice(0, 7) : sha;
}

function buildDayRows(report: ReportPreview): PreviewDayRow[] {
  const logByDate = new Map(
    report.days.map((log) => [toDateOnly(log.date), log])
  );
  return daysBetween(report.startDate, report.endDate).map((date) => ({
    date,
    log: logByDate.get(toDateOnly(date)) ?? null,
  }));
}

function HeaderTable() {
  return (
    <table className="w-full table-fixed border-collapse">
      <tbody>
        <tr>
          <td
            className="w-[17%] border border-black px-2 py-1 align-middle"
            rowSpan={2}
          >
            <div className="flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element -- static bundled logo */}
              <img
                src="/logo-universitas.png"
                alt="Logo universitas"
                width={86}
                height={85}
                className="h-[85px] w-[86px]"
              />
            </div>
          </td>
          <td className="border border-black px-2 py-1 text-center align-middle">
            <p className="text-[12pt] font-bold leading-[1.5]">
              <span>UNIVERSITAS PIGNATELLI TRIPUTRA</span>
              <br />
              <span>FAKULTAS SAINS DAN TEKNOLOGI</span>
              <br />
              <span>PROGRAM STUDI S1 INFORMATIKA</span>
            </p>
          </td>
        </tr>
        <tr>
          <td className="border border-black px-2 py-1 text-center align-middle">
            <p className="text-[14pt] font-bold leading-[1.5]">
              LAPORAN MINGGUAN IMMERSION PROGRAM
            </p>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function SheetSectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#CAEDFB] px-2 py-1 text-[12pt] font-bold leading-[1.5] print:[-webkit-print-color-adjust:exact] print:[print-color-adjust:exact]">
      <div className="flex gap-2">
        {children}
      </div>
    </div>
  );
}

function SheetCell({ className, children }: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <td
      className={`border border-black px-2 py-1 align-top text-[12pt] leading-[1.5] ${className ?? ""}`}
    >
      {children}
    </td>
  );
}

function Section1({ report }: { report: ReportPreview }) {
  return (
    <>
      <SheetSectionHeading>
        <span>1.</span>
        <span>Log Harian Jam Kerja</span>
      </SheetSectionHeading>
      <table className="w-full table-fixed border-collapse">
        <thead>
          <tr>
            <th className="w-[8%] border border-black px-2 py-1 text-center text-[12pt] font-bold">
              No
            </th>
            <th className="w-[22%] border border-black px-2 py-1 text-center text-[12pt] font-bold">
              Hari
            </th>
            <th className="w-[32%] border border-black px-2 py-1 text-center text-[12pt] font-bold">
              Tanggal
            </th>
            <th className="w-[38%] border border-black px-2 py-1 text-center text-[12pt] font-bold">
              Jam Kerja
            </th>
          </tr>
        </thead>
        <tbody>
          {buildDayRows(report).map((row, index) => (
            <tr key={toDateOnly(row.date)}>
              <SheetCell className="text-center">{index + 1}</SheetCell>
              <SheetCell className="text-center">{weekdayOf(row.date)}</SheetCell>
              <SheetCell className="text-center">
                {formatDayShort(row.date)}
              </SheetCell>
              <SheetCell className="text-center">
                {timeRange(row.log)}
              </SheetCell>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function Section2({ report }: { report: ReportPreview }) {
  return (
    <>
      <SheetSectionHeading>
        <span>2.</span>
        <span>Rincian Kegiatan</span>
      </SheetSectionHeading>
      <table className="w-full table-fixed border-collapse">
        <thead>
          <tr>
            <th className="w-[8%] border border-black px-2 py-1 text-center text-[12pt] font-bold">
              No
            </th>
            <th className="w-[20%] border border-black px-2 py-1 text-center text-[12pt] font-bold">
              Hari/Tanggal
            </th>
            <th className="w-[22%] border border-black px-2 py-1 text-center text-[12pt] font-bold">
              Lokasi
            </th>
            <th className="w-[50%] border border-black px-2 py-1 text-center text-[12pt] font-bold">
              Rincian Kegiatan
            </th>
          </tr>
        </thead>
        <tbody>
          {buildDayRows(report).map((row, index) => {
            const { paragraphs, commits } = rincianLines(row.log);
            return (
              <tr key={toDateOnly(row.date)}>
                <SheetCell className="text-center">{index + 1}</SheetCell>
                <SheetCell className="text-center">
                  <span className="capitalize">{weekdayOf(row.date)}</span>
                  {" / "}
                  {formatDayShort(row.date)}
                </SheetCell>
                <SheetCell className="text-center">
                  {row.log?.location || "-"}
                </SheetCell>
                <SheetCell>
                  {paragraphs.length === 0 && commits.length === 0 ? (
                    "-"
                  ) : (
                    <div className="space-y-1">
                      {paragraphs.map((paragraph, i) => (
                        <p key={i} className="text-justify">
                          {paragraph}
                        </p>
                      ))}
                      {commits.length > 0 && (
                        <div className="mt-1">
                          <p className="font-bold italic">Bukti GitHub:</p>
                          <ul className="list-none space-y-0.5">
                            {commits.map((commit, i) => (
                              <li key={i} className="italic">
                                - {commit.message} ({commit.repositoryFullName}
                                @{shortSha(commit.sha)})
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </SheetCell>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}

function Section3({ report }: { report: ReportPreview }) {
  const items = letterItems(report.nextWeekPlan);
  return (
    <>
      <SheetSectionHeading>
        <span>3.</span>
        <span>Rencana Kegiatan Untuk Minggu Depan</span>
      </SheetSectionHeading>
      <div className="px-2 py-1 text-[12pt] leading-[1.5]">
        {items.length === 0 ? (
          <p className="text-justify">Belum diisi.</p>
        ) : (
          <ol className="list-none space-y-0.5">
            {items.map((item, index) => (
              <li key={index} className="text-justify">
                <span>{letters()[index]}.</span> {item}
              </li>
            ))}
          </ol>
        )}
      </div>
    </>
  );
}

function Section4({ report }: { report: ReportPreview }) {
  const items = letterItems(report.studentEvaluation);
  return (
    <>
      <SheetSectionHeading>
        <span>4.</span>
        <span>Penilaian Mahasiswa Terhadap Kegiatan yang Berlangsung</span>
      </SheetSectionHeading>
      <div className="px-2 py-1 text-[12pt] leading-[1.5]">
        {items.length === 0 ? (
          <p className="text-justify">Belum diisi.</p>
        ) : (
          <ol className="list-none space-y-0.5">
            {items.map((item, index) => (
              <li key={index} className="text-justify">
                <span>{letters()[index]}.</span> {item}
              </li>
            ))}
          </ol>
        )}
      </div>
    </>
  );
}

function Appendix({ report }: { report: ReportPreview }) {
  return (
    <>
      <div className="break-before-page" />
      <p className="text-center text-[14pt] font-bold leading-[1.5]">
        LAMPIRAN
      </p>
      <p className="text-center text-[12pt] font-bold leading-[1.5]">
        DOKUMENTASI DAN HASIL KEGIATAN
      </p>
      {report.photos.length === 0 ? (
        <p className="px-2 py-1 text-[12pt] leading-[1.5]">
          Belum ada dokumentasi.
        </p>
      ) : (
        <div className="mt-3 space-y-4">
          {report.photos.map((photo, index) => (
            <figure key={photo.id} className="break-inside-avoid text-center">
              {/* eslint-disable-next-line @next/next/no-img-element -- dynamic external image URLs */}
              <img
                src={photo.url}
                alt={photo.caption || `Dokumentasi ${index + 1}`}
                className="mx-auto max-h-[170mm] max-w-full object-contain"
              />
              {photo.caption ? (
                <figcaption className="mt-1 text-center text-[12pt] italic leading-[1.5]">
                  Gambar {index + 1}. {photo.caption}
                </figcaption>
              ) : null}
            </figure>
          ))}
        </div>
      )}
    </>
  );
}

export function ReportPreview({
  report,
  showCompleteness = false,
}: {
  report: ReportPreview;
  showCompleteness?: boolean;
}) {
  const completeness = computeReportCompleteness(report);

  return (
    <div className="preview-sheet w-full max-w-[210mm] bg-white font-report text-[12pt] text-black leading-[1.5] shadow-md print:max-w-none print:shadow-none">
      {showCompleteness && !completeness.complete ? (
        <div className="mb-3 rounded-md border border-amber-300 bg-amber-50 p-3 print:hidden">
          <p className="text-sm font-semibold text-amber-900">
            Data laporan belum lengkap.
          </p>
          <ul className="mt-1 list-inside list-disc text-sm text-amber-800">
            {completeness.issues
              .filter((issue) => !issue.present)
              .map((issue) => (
                <li key={issue.key}>{issue.label}</li>
              ))}
          </ul>
        </div>
      ) : null}

      <div className="p-[12.7mm] print:p-0">
        <HeaderTable />

        <div className="mt-2 space-y-1 px-2">
          <p>
            <span className="inline-block w-[6rem] text-right font-bold">
              Skema :{" "}
            </span>
            {report.user.scheme}
          </p>
          <p>
            <span className="inline-block w-[6rem] text-right font-bold">
              Mitra :{" "}
            </span>
            {report.user.partner}
          </p>
          <p>
            <span className="inline-block w-[6rem] text-right font-bold">
              Minggu ke :{" "}
            </span>
            {report.weekNumber} ({formatDayShort(report.startDate)} -{" "}
            {formatDayShort(report.endDate)})
          </p>
        </div>

        <div className="mt-3 space-y-3">
          <Section1 report={report} />
          <Section2 report={report} />
          <Section3 report={report} />
          <Section4 report={report} />
        </div>

        <Appendix report={report} />
      </div>
    </div>
  );
}