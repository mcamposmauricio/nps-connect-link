// Shared chat utility functions used across Widget, Portal, and Workspace

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export function isImage(type: string): boolean {
  return type.startsWith("image/");
}

export function formatFileSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatChatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export interface FileMetadata {
  file_url: string;
  file_name: string;
  file_type: string;
  file_size?: number;
}

import { supabase } from "@/integrations/supabase/client";

export async function uploadChatFile(
  file: File,
  bucket = "chat-attachments"
): Promise<FileMetadata | null> {
  const ext = file.name.split(".").pop() || "bin";
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType: file.type });

  if (error) return null;

  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  return {
    file_url: urlData.publicUrl,
    file_name: file.name,
    file_type: file.type,
    file_size: file.size,
  };
}
