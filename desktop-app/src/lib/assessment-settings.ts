import type { AssessmentSettings } from "@/types";

/** Safe defaults when assessment settings are missing — web-friendly, no desktop requirement. */
export function resolveAssessmentSettings(
  settings: AssessmentSettings | null | undefined,
): AssessmentSettings {
  return {
    id: settings?.id ?? "",
    assessmentId: settings?.assessmentId ?? "",
    lockScreen: settings?.lockScreen ?? false,
    disableAltTab: settings?.disableAltTab ?? false,
    disableWinKey: settings?.disableWinKey ?? false,
    disableTaskSwitch: settings?.disableTaskSwitch ?? false,
    disableMultiMonitor: settings?.disableMultiMonitor ?? false,
    forceFullscreen: settings?.forceFullscreen ?? false,
    requireDesktopApp: settings?.requireDesktopApp ?? false,
    requireScreenShare: settings?.requireScreenShare ?? false,
    recordScreen: settings?.recordScreen ?? false,
    periodicScreenshots: settings?.periodicScreenshots ?? false,
    liveMonitoring: settings?.liveMonitoring ?? false,
    requireWebcam: settings?.requireWebcam ?? false,
    recordWebcam: settings?.recordWebcam ?? false,
    faceDetection: settings?.faceDetection ?? false,
    multipleFaceDetection: settings?.multipleFaceDetection ?? false,
    phoneDetection: settings?.phoneDetection ?? false,
    eyeTracking: settings?.eyeTracking ?? false,
    requireMicrophone: settings?.requireMicrophone ?? false,
    recordAudio: settings?.recordAudio ?? false,
    voiceDetection: settings?.voiceDetection ?? false,
    copyPasteDetection: settings?.copyPasteDetection ?? false,
    typingPatternAnalysis: settings?.typingPatternAnalysis ?? false,
    aiDetection: settings?.aiDetection ?? false,
    devToolsDetection: settings?.devToolsDetection ?? false,
    vmDetection: settings?.vmDetection ?? false,
    remoteDesktopDetection: settings?.remoteDesktopDetection ?? false,
    allowInternet: settings?.allowInternet ?? true,
    allowExternalSites: settings?.allowExternalSites ?? false,
    whitelistDomains: settings?.whitelistDomains ?? [],
  };
}
