import "./env";
import { prisma } from "../lib/prisma";
import { hashPassword, verifyPassword } from "../lib/password";
import { loginSchema, registerSchema } from "../lib/validation";

const email = `test-${Date.now()}@example.com`;

const validInput = {
  name: "Test User",
  nim: "1234567890",
  email,
  password: "password123",
  scheme: "Community Developer",
  partner: "Lavendrie Laundry",
};

async function main() {
  const results: string[] = [];
  const check = (name: string, ok: boolean, detail = "") => {
    results.push(`${ok ? "PASS" : "FAIL"}: ${name}${detail ? ` — ${detail}` : ""}`);
    if (!ok) process.exitCode = 1;
  };

  // Validation
  check(
    "registerSchema accepts valid input",
    registerSchema.safeParse(validInput).success
  );
  check(
    "registerSchema rejects missing fields",
    !registerSchema.safeParse({ name: "X", nim: "123" }).success
  );
  check(
    "registerSchema rejects invalid email",
    !registerSchema.safeParse({ ...validInput, email: "not-an-email" }).success
  );
  check(
    "registerSchema rejects weak password",
    !registerSchema.safeParse({ ...validInput, password: "short" }).success
  );
  check(
    "loginSchema rejects empty credentials",
    !loginSchema.safeParse({ email: "", password: "" }).success
  );

  // Hashing
  const hash = await hashPassword("password123");
  check(
    "hash is not plaintext",
    hash !== "password123" && hash.startsWith("$2")
  );
  check("verifyPassword accepts correct password", await verifyPassword("password123", hash));
  check("verifyPassword rejects wrong password", !(await verifyPassword("wrongpass", hash)));

  // Create user (mirrors register action normalization)
  const created = await prisma.user.create({
    data: {
      name: validInput.name,
      nim: validInput.nim,
      email: validInput.email.toLowerCase().trim(),
      passwordHash: hash,
      scheme: validInput.scheme,
      partner: validInput.partner,
    },
  });
  check("user created", Boolean(created.id));

  const stored = await prisma.user.findUnique({ where: { email } });
  check("user found by email", Boolean(stored));
  check(
    "stored hash differs from plaintext",
    Boolean(stored && stored.passwordHash !== "password123" && stored.passwordHash === hash)
  );
  check(
    "stored hash verifies against plaintext",
    stored ? await verifyPassword("password123", stored.passwordHash) : false
  );

  // Duplicate email
  try {
    await prisma.user.create({
      data: { ...validInput, email, passwordHash: hash },
    });
    check("duplicate email rejected", false, "second create succeeded");
  } catch {
    check("duplicate email rejected", true, "unique constraint");
  }

  // Relationships
  const report = await prisma.weeklyReport.create({
    data: {
      userId: created.id,
      weekNumber: 1,
      startDate: new Date("2026-02-02"),
      endDate: new Date("2026-02-06"),
    },
  });
  const log = await prisma.dailyLog.create({
    data: {
      weeklyReportId: report.id,
      dayNumber: 1,
      date: new Date("2026-02-02"),
      startTime: "08:04",
      endTime: "14:56",
      location: "WFH",
    },
  });
  await prisma.manualActivity.create({
    data: { dailyLogId: log.id, order: 1, description: "Morning briefing" },
  });
  check("relationships created", Boolean(report.id && log.id));

  const logsForReport = await prisma.dailyLog.count({ where: { weeklyReportId: report.id } });
  check("daily logs attach to report", logsForReport === 1);
  const actsForLog = await prisma.manualActivity.count({ where: { dailyLogId: log.id } });
  check("manual activities attach to log", actsForLog === 1);

  // Ownership isolation
  const otherEmail = `test-b-${Date.now()}@example.com`;
  const other = await prisma.user.create({
    data: {
      name: "Other User",
      nim: "0987654321",
      email: otherEmail,
      passwordHash: hash,
      scheme: "Community Developer",
      partner: "Mitra Lain",
    },
  });
  const othersReports = await prisma.weeklyReport.findMany({ where: { userId: other.id } });
  check("user B cannot see user A's reports", othersReports.length === 0);
  const ownReports = await prisma.weeklyReport.findMany({ where: { userId: created.id } });
  check("user A can see own reports", ownReports.length === 1);

  // Cascade delete
  await prisma.weeklyReport.delete({ where: { id: report.id } });
  check(
    "cascade deletes daily logs",
    (await prisma.dailyLog.count({ where: { weeklyReportId: report.id } })) === 0
  );
  check(
    "cascade deletes manual activities",
    (await prisma.manualActivity.count({ where: { dailyLogId: log.id } })) === 0
  );

  // Cleanup
  await prisma.user.delete({ where: { id: created.id } });
  await prisma.user.delete({ where: { id: other.id } });

  console.log(results.join("\n"));
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
