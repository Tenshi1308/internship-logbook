"use server";

import { revalidatePath } from "next/cache";

import { updateProfileForUser } from "@/lib/profile";
import { requireUser } from "@/lib/session";
import { profileSchema } from "@/lib/validation";

export type ProfileFormState =
  | undefined
  | {
      message?: string;
      error?: string;
      fieldErrors?: Record<string, string[] | undefined>;
    };

export async function updateProfile(
  _prevState: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const user = await requireUser();

  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    nim: formData.get("nim"),
    scheme: formData.get("scheme"),
    partner: formData.get("partner"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    await updateProfileForUser(user.id, {
      name: parsed.data.name,
      nim: parsed.data.nim,
      scheme: parsed.data.scheme,
      partner: parsed.data.partner,
    });
  } catch {
    return { error: "Gagal menyimpan profil. Silakan coba lagi." };
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  return { message: "Profil berhasil diperbarui." };
}