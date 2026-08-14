import { prisma } from "@/lib/prisma";

export type ProfileUpdate = {
  name: string;
  nim: string;
  scheme: string;
  partner: string;
};

export async function updateProfileForUser(
  userId: string,
  data: ProfileUpdate
) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      name: data.name,
      nim: data.nim,
      scheme: data.scheme,
      partner: data.partner,
    },
    select: {
      id: true,
      name: true,
      nim: true,
      email: true,
      scheme: true,
      partner: true,
    },
  });
}