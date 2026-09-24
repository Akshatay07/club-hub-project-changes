import React from "react";
import { signaturesConfig, getStoredGlobalSignature } from "../../utils/signatureLoader";

interface SignatoriesBlockProps {
  currentStage?: string;
  stageSignatures?: Record<string, string> | Map<string, string>;
  className?: string;
}

export const SignatoriesBlock: React.FC<SignatoriesBlockProps> = ({
  currentStage = "Event Coordinators",
  stageSignatures,
  className = "",
}) => {
  const signatories = signaturesConfig.signatories;

  const getStageIndexNum = (st: string) => {
    if (st === "Approved") return 6;
    if (st === "Rejected") return -1;
    const idx = signatories.findIndex((s) => s.title === st);
    return idx >= 0 ? idx + 1 : 1;
  };

  const activeStageIdx = getStageIndexNum(currentStage);

  const getSignatureUrl = (title: string, id: string, defaultUrl: string): string => {
    let sigMap: Record<string, string> = {};
    if (stageSignatures instanceof Map) {
      stageSignatures.forEach((val, key) => {
        if (typeof val === "string") sigMap[key] = val;
      });
    } else if (stageSignatures && typeof stageSignatures === "object") {
      sigMap = stageSignatures as Record<string, string>;
    }

    const norm = (s: string) => (s ? s.toLowerCase().replace(/[^a-z0-9]/g, "") : "");
    const targetTitle = norm(title);
    const targetId = norm(id);

    for (const [k, v] of Object.entries(sigMap)) {
      if (v) {
        const normK = norm(k);
        if (normK === targetTitle || normK === targetId || k === title || k === id) {
          return v;
        }
      }
    }

    const globalSig = getStoredGlobalSignature(title) || getStoredGlobalSignature(id);
    if (globalSig) return globalSig;

    return defaultUrl;
  };

  return (
    <div className={`grid grid-cols-5 gap-3 text-center pt-10 pb-4 ${className}`}>
      {signatories.map((sig) => {
        const signatureSrc = getSignatureUrl(sig.title, sig.id, sig.signatureUrl);
        const isSigned = (activeStageIdx >= sig.stageNum || currentStage === "Approved") && activeStageIdx !== -1;

        return (
          <div key={sig.id} className="flex flex-col items-center justify-end group">
            {/* SIGNATURE IMAGE ZONE */}
            <div className="h-16 flex flex-col items-center justify-end relative w-full px-1">
              {isSigned && signatureSrc ? (
                <img
                  src={signatureSrc}
                  alt={`${sig.title} signature`}
                  className="max-h-14 max-w-[110px] object-contain transition-transform group-hover:scale-105 mb-1 mix-blend-multiply"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              ) : null}
            </div>

            {/* SIGNATURE UNDERLINE */}
            <div className={`w-full h-0.5 my-1.5 ${isSigned ? "bg-slate-700" : "bg-slate-300"}`} />

            {/* SIGNATORY TITLE */}
            <div className="text-xs font-bold text-slate-800 tracking-tight leading-tight">
              {sig.title}
            </div>
          </div>
        );
      })}
    </div>
  );
};
