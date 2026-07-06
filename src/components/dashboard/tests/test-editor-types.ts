export type TestEditorTab = "general" | "questions" | "security" | "access";

export interface AssessmentSettingsForm {
  lockScreen: boolean;
  disableAltTab: boolean;
  disableWinKey: boolean;
  disableTaskSwitch: boolean;
  disableMultiMonitor: boolean;
  forceFullscreen: boolean;
  requireDesktopApp: boolean;
  requireScreenShare: boolean;
  recordScreen: boolean;
  periodicScreenshots: boolean;
  liveMonitoring: boolean;
  requireWebcam: boolean;
  recordWebcam: boolean;
  faceDetection: boolean;
  multipleFaceDetection: boolean;
  phoneDetection: boolean;
  eyeTracking: boolean;
  requireMicrophone: boolean;
  recordAudio: boolean;
  voiceDetection: boolean;
  copyPasteDetection: boolean;
  typingPatternAnalysis: boolean;
  aiDetection: boolean;
  devToolsDetection: boolean;
  vmDetection: boolean;
  remoteDesktopDetection: boolean;
  allowInternet: boolean;
  allowExternalSites: boolean;
  whitelistDomains: string[];
}

export const defaultAssessmentSettings = (): AssessmentSettingsForm => ({
  lockScreen: true,
  disableAltTab: true,
  disableWinKey: true,
  disableTaskSwitch: true,
  disableMultiMonitor: true,
  forceFullscreen: true,
  requireDesktopApp: false,
  requireScreenShare: false,
  recordScreen: false,
  periodicScreenshots: false,
  liveMonitoring: false,
  requireWebcam: false,
  recordWebcam: false,
  faceDetection: false,
  multipleFaceDetection: false,
  phoneDetection: false,
  eyeTracking: false,
  requireMicrophone: false,
  recordAudio: false,
  voiceDetection: false,
  copyPasteDetection: true,
  typingPatternAnalysis: false,
  aiDetection: false,
  devToolsDetection: true,
  vmDetection: false,
  remoteDesktopDetection: false,
  allowInternet: false,
  allowExternalSites: false,
  whitelistDomains: [],
});

export interface AssessmentFormState {
  title: string;
  description: string;
  duration: number;
  passingScore: number;
  maxAttempts: number;
  startDate: string;
  endDate: string;
  accessType: "public" | "invite_only" | "password";
  accessPassword: string;
  settings: AssessmentSettingsForm;
}

export const defaultAssessmentForm = (): AssessmentFormState => ({
  title: "",
  description: "",
  duration: 60,
  passingScore: 60,
  maxAttempts: 1,
  startDate: "",
  endDate: "",
  accessType: "public",
  accessPassword: "",
  settings: defaultAssessmentSettings(),
});
