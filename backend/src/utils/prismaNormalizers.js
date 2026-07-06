/** Shared Prisma includes and serializers for normalized PostgreSQL models. */

export const simulationInclude = {
  steps: { orderBy: { sortOrder: "asc" } },
  initialFiles: { orderBy: { path: "asc" } },
};

export const systemDesignSimulationInclude = {
  evaluationRules: { orderBy: { sortOrder: "asc" } },
};

export const systemDesignSubmissionInclude = {
  feedbackItems: { orderBy: { sortOrder: "asc" } },
};

export const incidentInclude = {
  timelineEvents: { orderBy: { timeSecond: "asc" } },
  services: { orderBy: { sortOrder: "asc" } },
  rootCauseOptions: { orderBy: { sortOrder: "asc" } },
  actionOptions: { orderBy: { sortOrder: "asc" } },
  metricSeries: {
    orderBy: { metricName: "asc" },
    include: { snapshots: { orderBy: { timestamp: "asc" } } },
  },
};

export const incidentSessionInclude = {
  actions: { orderBy: { timestamp: "asc" } },
};

export const incidentSessionStateInclude = {
  services: { orderBy: { serviceKey: "asc" } },
};

export const questionInclude = {
  testCases: { orderBy: { sortOrder: "asc" } },
  initialCodes: { orderBy: { language: "asc" } },
};

export const bankQuestionInclude = {
  options: { orderBy: { sortOrder: "asc" } },
  testCases: { orderBy: { sortOrder: "asc" } },
};

export const linuxQuestionInclude = {
  examples: { orderBy: { sortOrder: "asc" } },
};

export const userProfileInclude = {
  certs: { orderBy: { createdAt: "asc" } },
};

export const candidateAttemptInclude = {
  answers: { orderBy: { sortOrder: "asc" } },
  codeSubmissions: { orderBy: { sortOrder: "asc" } },
};

export function serializeSimulationFile(file) {
  return {
    name: file.name,
    path: file.path,
    content: file.content,
    language: file.language,
    cloudinaryUrl: file.cloudinaryUrl,
    cloudinaryPublicId: file.cloudinaryPublicId,
  };
}

export function serializeSimulation(simulation) {
  if (!simulation) return simulation;
  const { steps, initialFiles, ...rest } = simulation;
  return {
    ...rest,
    steps: (steps || []).map(({ description }) => ({ description })),
    initialFiles: (initialFiles || []).map(serializeSimulationFile),
  };
}

export function serializeSystemDesignSimulation(simulation) {
  if (!simulation) return simulation;
  const { evaluationRules, ...rest } = simulation;
  return {
    ...rest,
    evaluationRules: (evaluationRules || []).map(
      ({ description, requiredComponent, requiredEdge, points }) => ({
        description,
        requiredComponent,
        requiredEdge,
        points,
      }),
    ),
  };
}

export function serializeSystemDesignSubmission(submission) {
  if (!submission) return submission;
  const { feedbackItems, ...rest } = submission;
  return {
    ...rest,
    feedback: (feedbackItems || []).map(({ rule, passed, message }) => ({
      rule,
      passed,
      message,
    })),
  };
}

export function buildInitialMetrics(metricSeries = []) {
  const metrics = {};
  for (const series of metricSeries) {
    metrics[series.metricName] = (series.snapshots || []).map((snapshot) => ({
      timestamp: snapshot.timestamp,
      value: snapshot.value,
    }));
  }
  return metrics;
}

export function serializeIncident(incident) {
  if (!incident) return incident;
  const {
    services,
    rootCauseOptions,
    actionOptions,
    metricSeries,
    timelineEvents,
    ...rest
  } = incident;

  return {
    ...rest,
    timelineEvents,
    initialServices: (services || []).map((service) => ({
      id: service.serviceKey,
      name: service.name,
      status: service.status,
      color: service.color,
    })),
    rootCauseOptions: (rootCauseOptions || []).map((option) => ({
      id: option.optionKey,
      title: option.title,
      description: option.description,
      isCorrect: option.isCorrect,
      hint: option.hint,
    })),
    actionOptions: (actionOptions || []).map((option) => ({
      id: option.actionKey,
      title: option.title,
      description: option.description,
      category: option.category,
      fixesMetrics: option.fixesMetrics,
      recoveryTime: option.recoveryTime,
      pointsIfCorrect: option.pointsIfCorrect,
      pointsIfWrong: option.pointsIfWrong,
    })),
    initialMetrics: buildInitialMetrics(metricSeries),
  };
}

export function serializeIncidentSession(session) {
  if (!session) return session;
  const { actions, ...rest } = session;
  return {
    ...rest,
    actionsTaken: (actions || []).map((action) => ({
      actionId: action.actionKey,
      timestamp: action.timestamp,
      effective: action.effective,
    })),
  };
}

export function serializeIncidentSessionState(state) {
  if (!state) return state;
  const { services, ...rest } = state;
  return {
    ...rest,
    services: (services || []).map((service) => ({
      id: service.serviceKey,
      name: service.name,
      status: service.status,
      color: service.color,
    })),
  };
}

export function serializeUserProfile(user) {
  if (!user) return user;
  const { github, linkedin, website, certs, ...rest } = user;
  return {
    ...rest,
    links: {
      github: github || "",
      linkedin: linkedin || "",
      website: website || "",
    },
    certs: (certs || []).map(({ name, issuer, date, done }) => ({
      name,
      issuer,
      date,
      done,
    })),
  };
}

export function serializeQuestion(question) {
  if (!question) return question;
  const { testCases, initialCodes, ...rest } = question;
  return {
    ...rest,
    testcases: (testCases || []).map(({ input, expectedOutput }) => ({
      input,
      expectedOutput,
    })),
    initialCode: (initialCodes || []).map(({ language, code }) => ({
      [language]: code,
    })),
  };
}

export function serializeBankQuestion(question) {
  if (!question) return question;
  const { options, testCases, ...rest } = question;
  return {
    ...rest,
    options: (options || []).map(({ text, isCorrect }) => ({ text, isCorrect })),
    testCases: (testCases || []).map(({ input, expectedOutput }) => ({
      input,
      expectedOutput,
    })),
  };
}

export function serializeLinuxQuestion(question) {
  if (!question) return question;
  const { examples, ...rest } = question;
  return {
    ...rest,
    examples: (examples || []).map(({ input, output }) => ({ input, output })),
  };
}

export function serializeCandidateAttempt(attempt) {
  if (!attempt) return attempt;
  const { answers, codeSubmissions, ...rest } = attempt;
  return {
    ...rest,
    answers: (answers || []).map(({ payload }) => payload),
    codeSubmissions: (codeSubmissions || []).map(({ payload }) => payload),
  };
}

export function buildSimulationNestedCreate({ steps = [], initialFiles = [] } = {}) {
  return {
    steps: {
      create: steps.map((step, index) => ({
        sortOrder: index,
        description: step?.description || "",
      })),
    },
    initialFiles: {
      create: initialFiles.map((file) => ({
        name: file?.name || "",
        path: file?.path || "",
        content: file?.content || "",
        language: file?.language || "javascript",
        cloudinaryUrl: file?.cloudinaryUrl || "",
        cloudinaryPublicId: file?.cloudinaryPublicId || "",
      })),
    },
  };
}

export function buildSystemDesignRulesCreate(evaluationRules = []) {
  return {
    evaluationRules: {
      create: evaluationRules.map((rule, index) => ({
        sortOrder: index,
        description: rule?.description || "",
        requiredComponent: rule?.requiredComponent || "",
        requiredEdge: rule?.requiredEdge || "",
        points: rule?.points ?? 1,
      })),
    },
  };
}

export function buildQuestionNestedCreate({ testcases = [], initialCode = [] } = {}) {
  return {
    testCases: {
      create: testcases.map((testcase, index) => ({
        sortOrder: index,
        input: testcase?.input ?? "",
        expectedOutput: String(
          testcase?.expectedOutput ?? testcase?.output ?? "",
        ),
      })),
    },
    initialCodes: {
      create: initialCode.flatMap((entry) =>
        Object.entries(entry || {}).map(([language, code]) => ({
          language,
          code: String(code ?? ""),
        })),
      ),
    },
  };
}

export function buildBankQuestionNestedCreate({
  options = null,
  testCases = [],
} = {}) {
  const nested = {};

  if (Array.isArray(options)) {
    nested.options = {
      create: options.map((option, index) => ({
        sortOrder: index,
        text: option?.text || "",
        isCorrect: Boolean(option?.isCorrect),
      })),
    };
  }

  nested.testCases = {
    create: testCases.map((testcase, index) => ({
      sortOrder: index,
      input: testcase?.input ?? null,
      expectedOutput: String(
        testcase?.expectedOutput ?? testcase?.output ?? "",
      ),
    })),
  };

  return nested;
}

export function buildFeedbackItemsCreate(feedback = []) {
  return {
    feedbackItems: {
      create: feedback.map((item, index) => ({
        sortOrder: index,
        rule: item?.rule || "",
        passed: Boolean(item?.passed),
        message: item?.message || "",
      })),
    },
  };
}

export function buildSessionServicesCreate(services = []) {
  return {
    services: {
      create: services.map((service, index) => ({
        sortOrder: index,
        serviceKey: service?.id || service?.serviceKey || `service_${index}`,
        name: service?.name || "",
        status: service?.status || "healthy",
        color: service?.color || "green",
      })),
    },
  };
}

export function buildSessionActionsCreate(actions = []) {
  return {
    actions: {
      create: actions.map((action) => ({
        actionKey: action?.actionId || action?.actionKey || "",
        timestamp: action?.timestamp ?? 0,
        effective: Boolean(action?.effective),
      })),
    },
  };
}

export function buildUserCertReplace(certs = []) {
  return {
    deleteMany: {},
    create: certs.map((cert) => ({
      name: cert?.name || "",
      issuer: cert?.issuer || "",
      date: cert?.date || "",
      done: Boolean(cert?.done),
    })),
  };
}

export function parseUserLinksUpdate(links) {
  if (!links || typeof links !== "object") return {};
  return {
    github: links.github ?? "",
    linkedin: links.linkedin ?? "",
    website: links.website ?? "",
  };
}

export async function replaceSimulationSteps(tx, simulationId, steps = []) {
  await tx.simulationStep.deleteMany({ where: { simulationId } });
  if (steps.length === 0) return;
  await tx.simulationStep.createMany({
    data: steps.map((step, index) => ({
      simulationId,
      sortOrder: index,
      description: step?.description || "",
    })),
  });
}

export async function replaceSimulationFiles(tx, simulationId, initialFiles = []) {
  await tx.simulationFile.deleteMany({ where: { simulationId } });
  if (initialFiles.length === 0) return;
  await tx.simulationFile.createMany({
    data: initialFiles.map((file) => ({
      simulationId,
      name: file?.name || "",
      path: file?.path || "",
      content: file?.content || "",
      language: file?.language || "javascript",
      cloudinaryUrl: file?.cloudinaryUrl || "",
      cloudinaryPublicId: file?.cloudinaryPublicId || "",
    })),
  });
}

export async function replaceSessionStateServices(tx, sessionStateId, services = []) {
  await tx.incidentSessionService.deleteMany({ where: { sessionStateId } });
  if (services.length === 0) return;
  await tx.incidentSessionService.createMany({
    data: services.map((service, index) => ({
      sessionStateId,
      sortOrder: index,
      serviceKey: service?.id || service?.serviceKey || `service_${index}`,
      name: service?.name || "",
      status: service?.status || "healthy",
      color: service?.color || "green",
    })),
  });
}

export async function replaceSessionActions(tx, sessionId, actions = []) {
  await tx.incidentSessionAction.deleteMany({ where: { sessionId } });
  if (actions.length === 0) return;
  await tx.incidentSessionAction.createMany({
    data: actions.map((action) => ({
      sessionId,
      actionKey: action?.actionId || action?.actionKey || "",
      timestamp: action?.timestamp ?? 0,
      effective: Boolean(action?.effective),
    })),
  });
}

export async function replaceQuestionTestCases(tx, questionId, testcases = []) {
  await tx.questionTestCase.deleteMany({ where: { questionId } });
  if (testcases.length === 0) return;
  await tx.questionTestCase.createMany({
    data: testcases.map((testcase, index) => ({
      questionId,
      sortOrder: index,
      input: testcase?.input ?? "",
      expectedOutput: String(
        testcase?.expectedOutput ?? testcase?.output ?? "",
      ),
    })),
  });
}

export async function replaceQuestionInitialCodes(tx, questionId, initialCode = []) {
  await tx.questionInitialCode.deleteMany({ where: { questionId } });
  const rows = initialCode.flatMap((entry) =>
    Object.entries(entry || {}).map(([language, code]) => ({
      questionId,
      language,
      code: String(code ?? ""),
    })),
  );
  if (rows.length === 0) return;
  await tx.questionInitialCode.createMany({ data: rows });
}

export async function replaceBankQuestionOptions(tx, questionId, options = []) {
  await tx.bankQuestionOption.deleteMany({ where: { questionId } });
  if (!Array.isArray(options) || options.length === 0) return;
  await tx.bankQuestionOption.createMany({
    data: options.map((option, index) => ({
      questionId,
      sortOrder: index,
      text: option?.text || "",
      isCorrect: Boolean(option?.isCorrect),
    })),
  });
}

export async function replaceBankQuestionTestCases(tx, questionId, testCases = []) {
  await tx.bankQuestionTestCase.deleteMany({ where: { questionId } });
  if (testCases.length === 0) return;
  await tx.bankQuestionTestCase.createMany({
    data: testCases.map((testcase, index) => ({
      questionId,
      sortOrder: index,
      input: testcase?.input ?? null,
      expectedOutput: String(
        testcase?.expectedOutput ?? testcase?.output ?? "",
      ),
    })),
  });
}

export async function replaceCandidateAttemptAnswers(tx, attemptId, answers = []) {
  await tx.candidateAttemptAnswer.deleteMany({ where: { attemptId } });
  if (answers.length === 0) return;
  await tx.candidateAttemptAnswer.createMany({
    data: answers.map((payload, index) => ({
      attemptId,
      sortOrder: index,
      payload,
    })),
  });
}

export async function replaceCandidateAttemptCodeSubmissions(
  tx,
  attemptId,
  codeSubmissions = [],
) {
  await tx.candidateAttemptCodeSubmission.deleteMany({ where: { attemptId } });
  if (codeSubmissions.length === 0) return;
  await tx.candidateAttemptCodeSubmission.createMany({
    data: codeSubmissions.map((payload, index) => ({
      attemptId,
      sortOrder: index,
      payload,
    })),
  });
}
