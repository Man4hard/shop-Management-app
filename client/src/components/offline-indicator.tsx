import { useOfflineContext } from "@/hooks/use-offline";
import { useLanguage } from "@/lib/language-context";
import { Wifi, WifiOff, CloudUpload, Check } from "lucide-react";
import { useState, useEffect } from "react";

export function OfflineIndicator() {
  const { isOnline, pendingCount } = useOfflineContext();
  const { t } = useLanguage();
  const [showSynced, setShowSynced] = useState(false);
  const [prevPending, setPrevPending] = useState(pendingCount);

  useEffect(() => {
    if (prevPending > 0 && pendingCount === 0 && isOnline) {
      setShowSynced(true);
      setTimeout(() => setShowSynced(false), 3000);
    }
    setPrevPending(pendingCount);
  }, [pendingCount, isOnline, prevPending]);

  if (showSynced) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/30 text-green-600 dark:text-green-400 text-xs font-medium animate-in fade-in duration-300" data-testid="badge-synced">
        <Check className="w-3 h-3" />
        <span>{t("offline", "synced")}</span>
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-600 dark:text-orange-400 text-xs font-medium" data-testid="badge-offline">
        <WifiOff className="w-3 h-3" />
        <span>{t("offline", "offline")}{pendingCount > 0 ? ` (${pendingCount})` : ""}</span>
      </div>
    );
  }

  if (pendingCount > 0) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 text-xs font-medium animate-pulse" data-testid="badge-syncing">
        <CloudUpload className="w-3 h-3" />
        <span>{t("offline", "syncing")} {pendingCount}</span>
      </div>
    );
  }

  return null;
}

export function OfflineBanner() {
  const { isOnline, pendingCount } = useOfflineContext();
  const { t } = useLanguage();

  if (isOnline && pendingCount === 0) return null;

  return (
    <div className={`px-3 py-1.5 text-xs font-medium text-center ${
      isOnline
        ? "bg-blue-500/10 text-blue-700 dark:text-blue-300"
        : "bg-orange-500/10 text-orange-700 dark:text-orange-300"
    }`} data-testid="banner-offline-status">
      {!isOnline && (
        <span className="flex items-center justify-center gap-1">
          <WifiOff className="w-3 h-3" />
          {t("offline", "offlineBanner")}
          {pendingCount > 0 && ` (${pendingCount} ${t("screensaver", "pending")})`}
        </span>
      )}
      {isOnline && pendingCount > 0 && (
        <span className="flex items-center justify-center gap-1">
          <CloudUpload className="w-3 h-3" />
          {t("offline", "syncing")} {pendingCount} {pendingCount !== 1 ? t("offline", "syncingBillsPlural") : t("offline", "syncingBills")}...
        </span>
      )}
    </div>
  );
}
