import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  activityDescriptionSchema,
  aiDescriptionSchema,
  dateOnlySchema,
  loginSchema,
  photoCaptionSchema,
  planEvaluationSchema,
  registerSchema,
  saveDaySchema,
  timeSchema,
} from "../lib/validation";

describe("input boundary enforcement", () => {
  it("photoCaptionSchema rejects captions longer than 300 characters", () => {
    const ok = photoCaptionSchema.safeParse("a".repeat(300));
    assert.equal(ok.success, true);
    const tooLong = photoCaptionSchema.safeParse("a".repeat(301));
    assert.equal(tooLong.success, false);
  });

  it("photoCaptionSchema allows an empty caption", () => {
    const parsed = photoCaptionSchema.safeParse("");
    assert.equal(parsed.success, true);
  });

  it("dateOnlySchema rejects strings longer than the ISO date format", () => {
    assert.equal(dateOnlySchema.safeParse("2026-08-03").success, true);
    assert.equal(dateOnlySchema.safeParse("2026-08-03T00:00:00Z").success, false);
    assert.equal(dateOnlySchema.safeParse("a".repeat(200)).success, false);
  });

  it("timeSchema rejects values outside the HH:MM format", () => {
    assert.equal(timeSchema.safeParse("08:30").success, true);
    assert.equal(timeSchema.safeParse("25:00").success, false);
    assert.equal(timeSchema.safeParse("08").success, false);
    assert.equal(timeSchema.safeParse("08:99").success, false);
  });

  it("registerSchema bounds every field", () => {
    const base = {
      name: "Budi Santoso",
      nim: "2112100001",
      email: "budi@example.com",
      password: "rahasia123",
      scheme: "Non Reguler",
      partner: "PT Contoh",
    };
    assert.equal(registerSchema.safeParse(base).success, true);

    const tooLongName = registerSchema.safeParse({
      ...base,
      name: "a".repeat(101),
    });
    assert.equal(tooLongName.success, false);

    const shortPassword = registerSchema.safeParse({
      ...base,
      password: "1234567",
    });
    assert.equal(shortPassword.success, false);

    const badEmail = registerSchema.safeParse({
      ...base,
      email: "not-an-email",
    });
    assert.equal(badEmail.success, false);
  });

  it("loginSchema bounds email and password length", () => {
    const ok = loginSchema.safeParse({
      email: "budi@example.com",
      password: "rahasia123",
    });
    assert.equal(ok.success, true);

    const longEmail = loginSchema.safeParse({
      email: `${"a".repeat(246)}@example.com`,
      password: "rahasia123",
    });
    assert.equal(longEmail.success, false);
  });

  it("activityDescriptionSchema caps descriptions at 1000 characters", () => {
    assert.equal(activityDescriptionSchema.safeParse("a".repeat(1000)).success, true);
    assert.equal(activityDescriptionSchema.safeParse("a".repeat(1001)).success, false);
  });

  it("aiDescriptionSchema caps descriptions at 4000 characters", () => {
    assert.equal(aiDescriptionSchema.safeParse("a".repeat(4000)).success, true);
    assert.equal(aiDescriptionSchema.safeParse("a".repeat(4001)).success, false);
  });

  it("planEvaluationSchema caps plan and evaluation at 2000 characters", () => {
    const ok = planEvaluationSchema.safeParse({
      nextWeekPlan: "a".repeat(2000),
      studentEvaluation: "b".repeat(2000),
    });
    assert.equal(ok.success, true);

    const tooLong = planEvaluationSchema.safeParse({
      nextWeekPlan: "a".repeat(2001),
      studentEvaluation: "b",
    });
    assert.equal(tooLong.success, false);
  });

  it("saveDaySchema enforces required day fields", () => {
    const ok = saveDaySchema.safeParse({
      reportId: "rpt_1",
      date: "2026-08-03",
      startTime: "08:00",
      endTime: "17:00",
      location: "Kantor",
    });
    assert.equal(ok.success, true);

    const missingLocation = saveDaySchema.safeParse({
      reportId: "rpt_1",
      date: "2026-08-03",
      startTime: "08:00",
      endTime: "17:00",
      location: "",
    });
    assert.equal(missingLocation.success, false);
  });
});
