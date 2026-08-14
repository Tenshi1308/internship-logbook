import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { config } from "dotenv";
config({ path: ".env.local" });

import { profileSchema } from "../lib/validation";

const base = {
  name: "Test Profile User",
  nim: "2112109999",
  scheme: "Non Reguler",
  partner: "PT Contoh Teknologi",
};

describe("profileSchema validation", () => {
  it("accepts valid profile input", () => {
    const parsed = profileSchema.safeParse(base);
    assert.equal(parsed.success, true);
  });

  it("rejects an empty name", () => {
    const parsed = profileSchema.safeParse({ ...base, name: "" });
    assert.equal(parsed.success, false);
  });

  it("rejects a too-short NIM", () => {
    const parsed = profileSchema.safeParse({ ...base, nim: "1234" });
    assert.equal(parsed.success, false);
  });

  it("rejects an empty scheme", () => {
    const parsed = profileSchema.safeParse({ ...base, scheme: "  " });
    assert.equal(parsed.success, false);
  });

  it("rejects an empty partner", () => {
    const parsed = profileSchema.safeParse({ ...base, partner: "" });
    assert.equal(parsed.success, false);
  });
});

describe("profile update authentication guard", () => {
  it("rejects an update without an authenticated session", async () => {
    const { updateProfile } = await import("../lib/actions/profile");
    const formData = new FormData();
    formData.set("name", "Tidak Tersenang");
    formData.set("nim", "2112101111");
    formData.set("scheme", "Reguler");
    formData.set("partner", "PT Contoh");

    await assert.rejects(
      updateProfile(undefined, formData),
      /headers|request scope|NEXT_REDIRECT|login/i
    );
  });
});

describe("profile update persistence", () => {
  const emails = [
    "profile-auth-a@example.com",
    "profile-auth-b@example.com",
  ];

  async function prisma() {
    const { PrismaNeon } = await import("@prisma/adapter-neon");
    const { PrismaClient } = await import("../generated/prisma/client");
    return new PrismaClient({
      adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }),
    });
  }

  async function createTestUser(client: Awaited<ReturnType<typeof prisma>>) {
    const passwordHash =
      "$2a$12$abcdefghijklmnopqrstuu.testhashplaceholder000000000000";
    return client.user.create({
      data: {
        name: base.name,
        nim: base.nim,
        email: emails[0],
        passwordHash,
        scheme: base.scheme,
        partner: base.partner,
      },
      select: { id: true, email: true },
    });
  }

  it("persists updated values in PostgreSQL", async () => {
    const client = await prisma();
    const user = await createTestUser(client);
    try {
      const { updateProfileForUser } = await import("../lib/profile");
      const updated = await updateProfileForUser(user.id, {
        name: "Nama Baru",
        nim: "2112107777",
        scheme: "Reguler",
        partner: "PT Mitra Baru",
      });

      assert.equal(updated.name, "Nama Baru");
      assert.equal(updated.nim, "2112107777");
      assert.equal(updated.scheme, "Reguler");
      assert.equal(updated.partner, "PT Mitra Baru");

      const persisted = await client.user.findUnique({
        where: { email: emails[0] },
        select: { name: true, nim: true, scheme: true, partner: true },
      });
      assert.equal(persisted?.name, "Nama Baru");
      assert.equal(persisted?.nim, "2112107777");
      assert.equal(persisted?.scheme, "Reguler");
      assert.equal(persisted?.partner, "PT Mitra Baru");
    } finally {
      await client.user.deleteMany({ where: { email: { in: emails } } });
      await client.$disconnect();
    }
  });

  it("scopes updates to the given userId and never touches another user", async () => {
    const client = await prisma();
    const userA = await createTestUser(client);
    const passwordHash =
      "$2a$12$abcdefghijklmnopqrstuu.testhashplaceholder000000000000";
    await client.user.create({
      data: {
        name: base.name,
        nim: base.nim,
        email: emails[1],
        passwordHash,
        scheme: base.scheme,
        partner: base.partner,
      },
      select: { id: true, email: true },
    });
    try {
      const { updateProfileForUser } = await import("../lib/profile");
      await updateProfileForUser(userA.id, {
        name: "User A Renamed",
        nim: "2112101111",
        scheme: "Reguler",
        partner: "PT A",
      });

      const a = await client.user.findUnique({
        where: { email: emails[0] },
        select: { name: true, nim: true, scheme: true, partner: true },
      });
      const b = await client.user.findUnique({
        where: { email: emails[1] },
        select: { name: true, nim: true, scheme: true, partner: true },
      });

      assert.equal(a?.name, "User A Renamed");
      assert.equal(b?.name, base.name);
      assert.equal(b?.nim, base.nim);
      assert.equal(b?.scheme, base.scheme);
      assert.equal(b?.partner, base.partner);
    } finally {
      await client.user.deleteMany({ where: { email: { in: emails } } });
      await client.$disconnect();
    }
  });
});