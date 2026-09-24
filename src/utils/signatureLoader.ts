import signaturesData from "../config/signaturesConfig.json";

export interface SignatoryInfo {
  stageNum: number;
  id: string;
  title: string;
  name: string;
  designation: string;
  signatureUrl: string;
}

export interface SignaturesConfig {
  signatories: SignatoryInfo[];
}

export const signaturesConfig: SignaturesConfig = signaturesData as SignaturesConfig;

const signatureCache: Record<string, string> = {};

const normKey = (s: string) => (s ? s.toLowerCase().replace(/[^a-z0-9]/g, "") : "");

export function getStoredGlobalSignature(stageKey: string): string {
  try {
    const k = normKey(stageKey);
    const stored = localStorage.getItem(`global_signature_${k}`);
    if (stored) return stored;
  } catch (e) {}
  return "";
}

export function saveStoredGlobalSignature(stageKey: string, base64: string): void {
  try {
    if (!stageKey || !base64) return;
    const k = normKey(stageKey);
    localStorage.setItem(`global_signature_${k}`, base64);
  } catch (e) {}
}

/**
 * Gets signatory configuration by title or stage number
 */
export function getSignatoryConfig(titleOrStage: string | number): SignatoryInfo | undefined {
  if (typeof titleOrStage === "number") {
    return signaturesConfig.signatories.find((s) => s.stageNum === titleOrStage);
  }
  return signaturesConfig.signatories.find(
    (s) => s.title.toLowerCase() === titleOrStage.toLowerCase()
  );
}

/**
 * Loads a signature image URL and processes it onto an HTML5 canvas:
 * - Converts off-white paper background pixels to pure crisp white (255, 255, 255)
 *   so there are zero black box artifacts in jsPDF or HTML preview.
 * - Enhances contrast of the dark ink strokes.
 */
export async function getProcessedSignatureBase64(imageUrl: string): Promise<string> {
  if (!imageUrl) return "";
  if (signatureCache[imageUrl]) {
    return signatureCache[imageUrl];
  }

  if (imageUrl.startsWith("data:image")) {
    return imageUrl;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.setAttribute("crossOrigin", "anonymous");

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          resolve("");
          return;
        }

        // Fill background with solid white
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const brightness = (r + g + b) / 3;

          if (brightness > 175) {
            // Pure white background matching PDF paper
            data[i] = 255;
            data[i + 1] = 255;
            data[i + 2] = 255;
            data[i + 3] = 255;
          } else {
            // Darken ink stroke for maximum clarity
            const darkFactor = brightness / 175;
            data[i] = Math.floor(r * darkFactor * 0.7);
            data[i + 1] = Math.floor(g * darkFactor * 0.7);
            data[i + 2] = Math.floor(b * darkFactor * 0.7);
            data[i + 3] = 255;
          }
        }

        ctx.putImageData(imgData, 0, 0);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
        signatureCache[imageUrl] = dataUrl;
        resolve(dataUrl);
      } catch (err) {
        console.warn("Failed processing signature image:", err);
        resolve("");
      }
    };

    img.onerror = () => {
      resolve("");
    };

    img.src = imageUrl;
  });
}
