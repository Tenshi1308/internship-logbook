import { prisma } from "@/lib/prisma";
import { ReportNotFoundError } from "@/lib/reports";

export class PhotoNotFoundError extends Error {
  constructor() {
    super("photo-not-found");
    this.name = "PhotoNotFoundError";
  }
}

export type PhotoData = {
  id: string;
  cloudinaryPublicId: string;
  url: string;
  caption: string;
  order: number;
  dailyLogId: string | null;
  createdAt: Date;
};

async function requireOwnedReport(userId: string, reportId: string) {
  const report = await prisma.weeklyReport.findFirst({
    where: { id: reportId, userId },
    select: { id: true },
  });
  if (!report) {
    throw new ReportNotFoundError();
  }
  return report;
}

export async function assertOwnedReport(userId: string, reportId: string) {
  await requireOwnedReport(userId, reportId);
}

async function requireOwnedPhoto(
  userId: string,
  reportId: string,
  photoId: string
) {
  await requireOwnedReport(userId, reportId);
  const photo = await prisma.documentationPhoto.findFirst({
    where: { id: photoId, weeklyReportId: reportId },
  });
  if (!photo) {
    throw new PhotoNotFoundError();
  }
  return photo;
}

export async function listPhotosForReport(
  userId: string,
  reportId: string
): Promise<PhotoData[]> {
  await requireOwnedReport(userId, reportId);
  return prisma.documentationPhoto.findMany({
    where: { weeklyReportId: reportId },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
}

export async function getPhotoForUser(
  userId: string,
  reportId: string,
  photoId: string
): Promise<PhotoData> {
  return requireOwnedPhoto(userId, reportId, photoId);
}

export type AddPhotoData = {
  cloudinaryPublicId: string;
  url: string;
  caption?: string;
  dailyLogId?: string | null;
};

export async function addPhotoForUser(
  userId: string,
  reportId: string,
  data: AddPhotoData
): Promise<PhotoData> {
  const report = await requireOwnedReport(userId, reportId);

  if (data.dailyLogId) {
    const dailyLog = await prisma.dailyLog.findFirst({
      where: { id: data.dailyLogId, weeklyReportId: report.id },
      select: { id: true },
    });
    if (!dailyLog) {
      throw new PhotoNotFoundError();
    }
  }

  const count = await prisma.documentationPhoto.count({
    where: { weeklyReportId: report.id },
  });

  return prisma.documentationPhoto.create({
    data: {
      weeklyReportId: report.id,
      dailyLogId: data.dailyLogId ?? null,
      cloudinaryPublicId: data.cloudinaryPublicId,
      url: data.url,
      caption: data.caption?.trim() ?? "",
      order: count,
    },
  });
}

export async function updatePhotoCaptionForUser(
  userId: string,
  reportId: string,
  photoId: string,
  caption: string
): Promise<PhotoData> {
  const photo = await requireOwnedPhoto(userId, reportId, photoId);
  return prisma.documentationPhoto.update({
    where: { id: photo.id },
    data: { caption: caption.trim() },
  });
}

export async function deletePhotoForUser(
  userId: string,
  reportId: string,
  photoId: string
): Promise<PhotoData> {
  const photo = await requireOwnedPhoto(userId, reportId, photoId);

  await prisma.documentationPhoto.delete({ where: { id: photo.id } });

  const remaining = await prisma.documentationPhoto.findMany({
    where: { weeklyReportId: reportId },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  await prisma.$transaction(
    remaining.map((item, index) =>
      prisma.documentationPhoto.update({
        where: { id: item.id },
        data: { order: index },
      })
    )
  );

  return photo;
}

export async function reorderPhotosForUser(
  userId: string,
  reportId: string,
  orderedPhotoIds: string[]
): Promise<PhotoData[]> {
  const report = await requireOwnedReport(userId, reportId);

  const owned = await prisma.documentationPhoto.findMany({
    where: { weeklyReportId: report.id },
    select: { id: true },
  });
  const ownedIds = new Set(owned.map((photo) => photo.id));

  if (
    orderedPhotoIds.length !== ownedIds.size ||
    orderedPhotoIds.some((id) => !ownedIds.has(id))
  ) {
    throw new PhotoNotFoundError();
  }

  const seen = new Set<string>();
  for (const id of orderedPhotoIds) {
    if (seen.has(id)) {
      throw new PhotoNotFoundError();
    }
    seen.add(id);
  }

  await prisma.$transaction(
    orderedPhotoIds.map((id, index) =>
      prisma.documentationPhoto.update({
        where: { id },
        data: { order: index },
      })
    )
  );

  return prisma.documentationPhoto.findMany({
    where: { weeklyReportId: report.id },
    orderBy: { order: "asc" },
  });
}