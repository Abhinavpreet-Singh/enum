export type AdminContentType =
  | "dsa"
  | "linux"
  | "simulations"
  | "incidents"
  | "system-design";

export type AdminContentTypeConfig = {
  key: AdminContentType;
  label: string;
  singularLabel: string;
  description: string;
  href: string;
  countKey?:
    | "simulations"
    | "incidents"
    | "dsaQuestions"
    | "linuxQuestions"
    | "systemDesign";
};

export const ADMIN_CONTENT_TYPES: Record<AdminContentType, AdminContentTypeConfig> = {
  simulations: {
    key: "simulations",
    label: "Browser Simulations",
    singularLabel: "Browser Simulation",
    description: "Create a new browser sandbox debugging simulation.",
    href: "/dashboard/admin/content/new/simulations/",
    countKey: "simulations",
  },
  incidents: {
    key: "incidents",
    label: "Incident Scenarios",
    singularLabel: "Incident Scenario",
    description: "Create a new production incident response scenario.",
    href: "/dashboard/admin/content/new/incidents/",
    countKey: "incidents",
  },
  dsa: {
    key: "dsa",
    label: "DSA Questions",
    singularLabel: "DSA Question",
    description: "Create, edit, and delete DSA Arena coding questions.",
    href: "/dashboard/admin/content/dsa/",
    countKey: "dsaQuestions",
  },
  linux: {
    key: "linux",
    label: "Linux Challenges",
    singularLabel: "Linux Challenge",
    description: "Create a new Bash/Linux command challenge.",
    href: "/dashboard/admin/content/new/linux/",
    countKey: "linuxQuestions",
  },
  "system-design": {
    key: "system-design",
    label: "System Design",
    singularLabel: "System Design Simulation",
    description: "Create a new system design simulation with evaluation rules.",
    href: "/dashboard/admin/content/new/system-design/",
    countKey: "systemDesign",
  },
};

export const ADMIN_CREATABLE_CONTENT_TYPES = Object.values(ADMIN_CONTENT_TYPES);

export function isAdminContentType(value: string): value is AdminContentType {
  return value in ADMIN_CONTENT_TYPES;
}
