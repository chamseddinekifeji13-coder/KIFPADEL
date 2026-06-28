import type { PwaInstallLabels } from "@/components/features/pwa/pwa-install-panel";

export function buildPwaInstallLabels(labels: Record<string, string>): PwaInstallLabels {
  return {
    installAppTitle: labels.installAppTitle,
    installAppSubtitle: labels.installAppSubtitle,
    installAppCta: labels.installAppCta,
    installAppIosTitle: labels.installAppIosTitle,
    installAppIosStep1: labels.installAppIosStep1,
    installAppIosStep2: labels.installAppIosStep2,
    installAppIosStep3: labels.installAppIosStep3,
    installAppAndroidHint: labels.installAppAndroidHint,
    installAppClose: labels.installAppClose,
  };
}
