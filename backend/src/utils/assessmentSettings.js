/** Writable AssessmentSetting fields (excludes id, assessmentId, relations). */
const SETTING_KEYS = [
  "lockScreen",
  "disableAltTab",
  "disableWinKey",
  "disableTaskSwitch",
  "disableMultiMonitor",
  "forceFullscreen",
  "requireDesktopApp",
  "requireScreenShare",
  "recordScreen",
  "periodicScreenshots",
  "liveMonitoring",
  "requireWebcam",
  "recordWebcam",
  "faceDetection",
  "multipleFaceDetection",
  "phoneDetection",
  "eyeTracking",
  "requireMicrophone",
  "recordAudio",
  "voiceDetection",
  "copyPasteDetection",
  "typingPatternAnalysis",
  "aiDetection",
  "devToolsDetection",
  "vmDetection",
  "remoteDesktopDetection",
  "allowInternet",
  "allowExternalSites",
  "whitelistDomains",
];

export function sanitizeAssessmentSettings(settings) {
  if (!settings || typeof settings !== "object") return {};
  const data = {};
  for (const key of SETTING_KEYS) {
    if (settings[key] !== undefined) data[key] = settings[key];
  }
  return data;
}
