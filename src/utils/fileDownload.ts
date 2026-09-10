const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const BACKEND_BASE = API_URL.replace("/api", "");

/**
 * Ensures a relative URL has the full backend origin.
 */
export function getFullMediaUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:") || url.startsWith("blob:")) {
    return url;
  }
  const cleanPath = url.startsWith("/") ? url : `/${url}`;
  return `${BACKEND_BASE}${cleanPath}`;
}

/**
 * Sanitizes a string for use in a file name across Windows, macOS, and Linux.
 */
export function sanitizeFilename(name: string, fallback: string = "download"): string {
  if (!name) return fallback;
  const sanitized = name
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .trim();
  return sanitized.length > 0 ? sanitized : fallback;
}

/**
 * Generates a clean filename for an event photo.
 */
export function getCleanPhotoFilename(
  eventName: string = "Event",
  caption?: string,
  index: number = 0,
  urlOrOriginalName: string = ""
): string {
  const extMatch = urlOrOriginalName.match(/\.([a-zA-Z0-9]+)(?:[?#]|$)/);
  const ext = extMatch ? extMatch[1].toLowerCase() : "jpg";

  const cleanEvent = sanitizeFilename(eventName.slice(0, 30), "Event");
  const cleanCaption = caption && caption !== "Event Photograph"
    ? sanitizeFilename(caption.slice(0, 40), "")
    : "";

  if (cleanCaption) {
    return `${cleanEvent}_Photo_${index + 1}_${cleanCaption}.${ext}`;
  }
  return `${cleanEvent}_Photo_${index + 1}.${ext}`;
}

/**
 * Downloads a single file from a given URL by fetching its blob.
 * This guarantees the browser triggers a native save dialog / downloads folder placement,
 * avoiding accidental navigation on cross-origin media files.
 */
export async function downloadFileFromUrl(url: string, filename: string): Promise<boolean> {
  const fullUrl = getFullMediaUrl(url);
  try {
    const response = await fetch(fullUrl, {
      method: "GET",
      mode: "cors",
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const blob = await response.blob();
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up memory
    setTimeout(() => {
      window.URL.revokeObjectURL(objectUrl);
    }, 1000);

    return true;
  } catch (error) {
    console.warn("Direct blob download failed, attempting standard link download fallback:", error);
    try {
      const link = document.createElement("a");
      link.href = fullUrl;
      link.download = filename;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return true;
    } catch (fallbackError) {
      console.error("Failed to download file:", fallbackError);
      return false;
    }
  }
}

/**
 * Downloads multiple files sequentially with a small delay to avoid browser blocking.
 */
export async function downloadBatchFiles(
  files: Array<{ url: string; filename: string }>,
  onProgress?: (current: number, total: number) => void
): Promise<number> {
  let successCount = 0;
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (onProgress) {
      onProgress(i + 1, files.length);
    }
    const success = await downloadFileFromUrl(file.url, file.filename);
    if (success) successCount++;

    // Small delay between downloads so the browser handles each cleanly
    if (i < files.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
  return successCount;
}
