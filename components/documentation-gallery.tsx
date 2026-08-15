"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ImagePlus,
  Loader2,
  Save,
  Trash2,
  X,
} from "lucide-react";

import {
  deletePhoto,
  reorderPhotos,
  savePhotoCaption,
  type PhotoFormState,
} from "@/lib/actions/photos";
import { FormError, FormSuccess } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type GalleryPhoto = {
  id: string;
  url: string;
  caption: string;
  order: number;
};

type UploadError =
  | { error: string; message?: string }
  | { error?: never; message: string };

export default function DocumentationGallery({
  reportId,
  initialPhotos,
  dailyLogId,
  cloudinaryConfigured,
}: {
  reportId: string;
  initialPhotos: GalleryPhoto[];
  dailyLogId?: string | null;
  cloudinaryConfigured: boolean;
}) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<UploadError | null>(null);
  const [captionState, setCaptionState] = useState<Record<string, PhotoFormState>>(
    {}
  );
  const [captionPending, setCaptionPending] = useState<string | null>(null);
  const [reorderMessage, setReorderMessage] = useState<string>("");
  const [reorderError, setReorderError] = useState<string>("");
  const [reordering, setReordering] = useState(false);
  const [deletePending, setDeletePending] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function resetUpload() {
    setFile(null);
    setCaption("");
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleUpload() {
    setUploadMessage(null);
    if (!file) {
      setUploadMessage({ error: "file-missing", message: "Pilih file gambar terlebih dahulu." });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("reportId", reportId);
      if (caption) formData.append("caption", caption);
      if (dailyLogId) formData.append("dailyLogId", dailyLogId);

      const res = await fetch("/api/photos", { method: "POST", body: formData });
      const data = (await res.json()) as {
        photo?: { id: string; url: string; caption: string; order: number };
        error?: string;
        message?: string;
      };
      if (!res.ok || !data.photo) {
        setUploadMessage({
          error: data.error ?? "upload-failed",
          message: data.message ?? "Gagal mengunggah gambar. Silakan coba lagi.",
        });
        return;
      }
      setPhotos((prev) => [...prev, data.photo!]);
      resetUpload();
      setUploadMessage({ message: "Gambar berhasil ditambahkan." });
    } catch {
      setUploadMessage({
        error: "network",
        message: "Gagal terhubung ke server. Coba lagi.",
      });
    } finally {
      setUploading(false);
    }
  }

  async function handleMove(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= photos.length) return;
    const next = [...photos];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    next.forEach((photo, i) => (photo.order = i));
    setPhotos(next);
    setReordering(true);
    setDeleteError("");
    setReorderError("");
    setReorderMessage("");
    try {
      const result = await reorderPhotos(
        reportId,
        next.map((photo) => photo.id)
      );
      if (result?.error) {
        setReorderError(result.error);
        // In case of failure, restore server ordering.
        setPhotos(initialPhotos);
      } else {
        setReorderMessage("Urutan disimpan.");
      }
    } catch {
      setPhotos(initialPhotos);
      setReorderError("Gagal mengubah urutan gambar. Silakan coba lagi.");
    } finally {
      setReordering(false);
    }
  }

  async function handleDelete(photo: GalleryPhoto) {
    setDeletePending(photo.id);
    setDeleteError("");
    const formData = new FormData();
    formData.set("reportId", reportId);
    formData.set("photoId", photo.id);
    const result = await deletePhoto(undefined, formData);
    setDeletePending(null);
    if (result?.error) {
      setDeleteError(result.error);
      return;
    }
    setPhotos((prev) => {
      const next = prev.filter((item) => item.id !== photo.id);
      return next.map((item, i) => ({ ...item, order: i }));
    });
  }

  const renderPhoto = (photo: GalleryPhoto, index: number) => {
    const state = captionState[photo.id];
    return (
      <div
        key={photo.id}
        className="overflow-hidden rounded-lg border border-border"
      >
        <div className="relative aspect-video w-full overflow-hidden bg-secondary/40">
          {/* eslint-disable-next-line @next/next/no-img-element -- dynamic external image URLs */}
          <img
            src={photo.url}
            alt={photo.caption || `Dokumentasi ${index + 1}`}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </div>
        <div className="space-y-2 p-3">
          <form
            action={async (formData) => {
              setCaptionPending(photo.id);
              const result = await savePhotoCaption(undefined, formData);
              setCaptionPending(null);
              setCaptionState((prev) => ({ ...prev, [photo.id]: result }));
              if (!result?.error) {
                setPhotos((prev) =>
                  prev.map((item) =>
                    item.id === photo.id
                      ? {
                          ...item,
                          caption: String(formData.get("caption") ?? "").trim(),
                        }
                      : item
                  )
                );
              }
            }}
          >
            <input type="hidden" name="reportId" value={reportId} />
            <input type="hidden" name="photoId" value={photo.id} />
            <div className="flex gap-2">
              <Input
                name="caption"
                defaultValue={photo.caption}
                placeholder="Tulis keterangan..."
                aria-label={`Keterangan gambar ${index + 1}`}
              />
              <Button
                type="submit"
                size="icon"
                variant="outline"
                disabled={captionPending === photo.id}
              >
                {captionPending === photo.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Save className="h-4 w-4" aria-hidden="true" />
                )}
                <span className="sr-only">Simpan keterangan</span>
              </Button>
            </div>
            {state?.error ? <FormError message={state.error} /> : null}
            {state?.message ? (
              <FormSuccess message={state.message} />
            ) : null}
          </form>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              Urutan {photo.order + 1}
            </span>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                disabled={index === 0 || reordering}
                onClick={() => handleMove(index, -1)}
                aria-label="Naikkan urutan"
              >
                <ArrowUp className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                disabled={index === photos.length - 1 || reordering}
                onClick={() => handleMove(index, 1)}
                aria-label="Turunkan urutan"
              >
                <ArrowDown className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                disabled={deletePending === photo.id}
                onClick={() => handleDelete(photo)}
                aria-label="Hapus gambar"
                className="text-destructive hover:text-destructive"
              >
                {deletePending === photo.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label
          htmlFor={`photos-file-${reportId}`}
          className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
        >
          <ImagePlus className="h-4 w-4" aria-hidden="true" />
          {uploading ? "Mengunggah..." : "Pilih Gambar"}
        </label>
        <input
          id={`photos-file-${reportId}`}
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          disabled={uploading}
          onChange={(event) => {
            setUploadMessage(null);
            const selected = event.target.files?.[0] ?? null;
            setFile(selected);
            setPreviewUrl((prev) => {
              if (prev) URL.revokeObjectURL(prev);
              return selected ? URL.createObjectURL(selected) : null;
            });
          }}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            placeholder="Keterangan (opsional)"
            aria-label="Keterangan untuk gambar baru"
            className="max-w-xs"
            disabled={uploading}
          />
          <Button
            type="button"
            size="sm"
            onClick={handleUpload}
            disabled={uploading || !file}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : null}
            {uploading ? "Mengunggah..." : "Unggah"}
          </Button>
        </div>
      </div>

      {previewUrl && file ? (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-2">
          <div className="relative h-24 w-36 shrink-0 overflow-hidden rounded-md bg-secondary/40">
            {/* eslint-disable-next-line @next/next/no-img-element -- blob preview of locally selected file */}
            <img
              src={previewUrl}
              alt="Pratinjau gambar yang dipilih"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="truncate text-sm font-medium text-foreground">
              {file.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {(file.size / 1024).toFixed(1)} KB
            </p>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={resetUpload}
              disabled={uploading}
            >
              <X className="h-4 w-4" aria-hidden="true" />
              Batal pilih
            </Button>
          </div>
        </div>
      ) : null}

      {!cloudinaryConfigured ? (
        <p className="text-xs text-muted-foreground">
          Fitur dokumentasi belum dikonfigurasi oleh pengelola aplikasi. Anda
          tetap dapat menulis laporan seperti biasa.
        </p>
      ) : null}

      {uploadMessage ? (
        uploadMessage.error ? (
          <FormError message={uploadMessage.message} />
        ) : (
          <FormSuccess message={uploadMessage.message} />
        )
      ) : null}

      {deleteError ? <FormError message={deleteError} /> : null}
      {reorderError ? <FormError message={reorderError} /> : null}
      {reorderMessage ? <FormSuccess message={reorderMessage} /> : null}

      {photos.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Belum ada dokumentasi. Unggah foto kegiatan Anda di atas.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo, index) => renderPhoto(photo, index))}
        </div>
      )}
    </div>
  );
}