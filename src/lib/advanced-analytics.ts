export type DifficultyRow = {
  difficulty: 'easy' | 'moderate' | 'difficult' | 'highly_difficult' | string;
  idealTimeSec: number;
  totalQuestions: number;
  correctAnswered: {
    count: number;
    avgTime: number;
    inTime: number;
    lessTime: number;
    overTime: number;
  };
  wrongAnswered: {
    count: number;
    avgTime: number;
    inTime: number;
    lessTime: number;
    overTime: number;
  };
};

export type AdvancedAnalyticsPayload = {
  difficultyTimeIntelligence: DifficultyRow[];
  questionTypeMatrix: Array<{
    type: string;
    correct: { physics: number; chemistry: number; maths: number };
    wrong: { physics: number; chemistry: number; maths: number };
    notAnswered: { physics: number; chemistry: number; maths: number };
  }>;
  conceptVsApplication: Array<{
    type: 'Concept' | 'Application' | string;
    accuracy: number;
    correct: number;
    wrong: number;
    notAnswered: number;
    totalTime: number;
    avgTimePerQuestion: number;
  }>;
  chapterWeakness: Array<{
    chapter: string;
    subject: string;
    accuracy: number;
    correct: number;
    errors: number;
    notAnswered: number;
  }>;
  aiObservations: string[];
  timeEfficiency: {
    avgTimePerSubject: Array<{ subject: string; avgTime: number; accuracy: number; totalQuestions: number }>;
    slowestSubject: string;
    fastestSubject: string;
    timeWastedOnWrongQuestions: number;
    efficiencyScore: number;
    totalTimeTaken: number;
  };
  visuals: {
    chapterHeatmap: Array<{ chapter: string; subject: string; accuracy: number }>;
    subjectPerformanceBars: Array<{ subject: string; accuracy: number; avgTime: number }>;
    outcomePie: Array<{ name: string; value: number }>;
    timeVsAccuracy: Array<{ subject: string; avgTime: number; accuracy: number }>;
  };
  recommendation: {
    riskLevel: 'High' | 'Medium' | 'Low' | string;
    focusAreas: string[];
    actionPlan: {
      today: string[];
      thisWeek: string[];
      beforeNextExam: string[];
    };
    strategy: string;
    confidenceTrend: string;
  } | null;
  metadata: {
    generatedAt: string;
    totalQuestionsAnalyzed: number;
  };
};

export const ADVANCED_CHART_COLORS = {
  correct: '#22c55e',
  wrong: '#f97316',
  notAnswered: '#3b82f6',
  inTime: '#22c55e',
  lessTime: '#3b82f6',
  overTime: '#f97316',
};

export const formatSeconds = (seconds: number) => {
  const safe = Math.max(0, Math.round(Number(seconds) || 0));
  const min = Math.floor(safe / 60);
  const sec = safe % 60;
  return `${min}m ${sec}s`;
};

export const difficultyLabel = (difficulty: string) => {
  const map: Record<string, string> = {
    easy: 'Easy',
    moderate: 'Moderate',
    difficult: 'Difficult',
    highly_difficult: 'Highly Difficult',
  };
  return map[difficulty] || difficulty;
};

/** Shorter labels for mobile chart X-axis (matches web readability). */
export const difficultyChartLabel = (difficulty: string) => {
  const map: Record<string, string> = {
    easy: 'Easy',
    moderate: 'Moderate',
    difficult: 'Difficult',
    highly_difficult: 'H. Difficult',
  };
  return map[difficulty] || difficultyLabel(difficulty);
};

export function normalizeAdvancedAnalyticsPayload(raw: unknown): AdvancedAnalyticsPayload {
  const data = (raw && typeof raw === 'object' ? raw : {}) as Partial<AdvancedAnalyticsPayload>;
  return {
    difficultyTimeIntelligence: Array.isArray(data.difficultyTimeIntelligence)
      ? data.difficultyTimeIntelligence
      : [],
    questionTypeMatrix: Array.isArray(data.questionTypeMatrix) ? data.questionTypeMatrix : [],
    conceptVsApplication: Array.isArray(data.conceptVsApplication) ? data.conceptVsApplication : [],
    chapterWeakness: Array.isArray(data.chapterWeakness) ? data.chapterWeakness : [],
    aiObservations: Array.isArray(data.aiObservations) ? data.aiObservations : [],
    timeEfficiency: {
      avgTimePerSubject: Array.isArray(data.timeEfficiency?.avgTimePerSubject)
        ? data.timeEfficiency!.avgTimePerSubject
        : [],
      slowestSubject: data.timeEfficiency?.slowestSubject || '—',
      fastestSubject: data.timeEfficiency?.fastestSubject || '—',
      timeWastedOnWrongQuestions: Number(data.timeEfficiency?.timeWastedOnWrongQuestions || 0),
      efficiencyScore: Number(data.timeEfficiency?.efficiencyScore || 0),
      totalTimeTaken: Number(data.timeEfficiency?.totalTimeTaken || 0),
    },
    visuals: {
      chapterHeatmap: Array.isArray(data.visuals?.chapterHeatmap) ? data.visuals!.chapterHeatmap : [],
      subjectPerformanceBars: Array.isArray(data.visuals?.subjectPerformanceBars)
        ? data.visuals!.subjectPerformanceBars
        : [],
      outcomePie: Array.isArray(data.visuals?.outcomePie) ? data.visuals!.outcomePie : [],
      timeVsAccuracy: Array.isArray(data.visuals?.timeVsAccuracy) ? data.visuals!.timeVsAccuracy : [],
    },
    recommendation: data.recommendation ?? null,
    metadata: {
      generatedAt: data.metadata?.generatedAt || new Date().toISOString(),
      totalQuestionsAnalyzed: Number(data.metadata?.totalQuestionsAnalyzed || 0),
    },
  };
}

export const advancedAnalyticsMockData: AdvancedAnalyticsPayload = {
  difficultyTimeIntelligence: [
    {
      difficulty: 'easy',
      idealTimeSec: 30,
      totalQuestions: 8,
      correctAnswered: { count: 6, avgTime: 24, inTime: 4, lessTime: 1, overTime: 1 },
      wrongAnswered: { count: 2, avgTime: 36, inTime: 1, lessTime: 0, overTime: 1 },
    },
    {
      difficulty: 'moderate',
      idealTimeSec: 60,
      totalQuestions: 12,
      correctAnswered: { count: 7, avgTime: 68, inTime: 4, lessTime: 1, overTime: 2 },
      wrongAnswered: { count: 3, avgTime: 82, inTime: 1, lessTime: 0, overTime: 2 },
    },
    {
      difficulty: 'difficult',
      idealTimeSec: 90,
      totalQuestions: 7,
      correctAnswered: { count: 2, avgTime: 95, inTime: 1, lessTime: 0, overTime: 1 },
      wrongAnswered: { count: 3, avgTime: 126, inTime: 0, lessTime: 0, overTime: 3 },
    },
    {
      difficulty: 'highly_difficult',
      idealTimeSec: 120,
      totalQuestions: 3,
      correctAnswered: { count: 1, avgTime: 134, inTime: 0, lessTime: 0, overTime: 1 },
      wrongAnswered: { count: 1, avgTime: 148, inTime: 0, lessTime: 0, overTime: 1 },
    },
  ],
  questionTypeMatrix: [
    {
      type: 'Numerical',
      correct: { physics: 2, chemistry: 1, maths: 3 },
      wrong: { physics: 1, chemistry: 0, maths: 1 },
      notAnswered: { physics: 0, chemistry: 1, maths: 0 },
    },
    {
      type: 'Theory',
      correct: { physics: 3, chemistry: 2, maths: 1 },
      wrong: { physics: 1, chemistry: 1, maths: 2 },
      notAnswered: { physics: 0, chemistry: 0, maths: 1 },
    },
    {
      type: 'Formula',
      correct: { physics: 1, chemistry: 2, maths: 2 },
      wrong: { physics: 0, chemistry: 1, maths: 1 },
      notAnswered: { physics: 1, chemistry: 0, maths: 0 },
    },
  ],
  conceptVsApplication: [
    {
      type: 'Concept',
      accuracy: 62,
      correct: 10,
      wrong: 4,
      notAnswered: 2,
      totalTime: 920,
      avgTimePerQuestion: 61,
    },
    {
      type: 'Application',
      accuracy: 48,
      correct: 6,
      wrong: 5,
      notAnswered: 3,
      totalTime: 1100,
      avgTimePerQuestion: 79,
    },
  ],
  chapterWeakness: [
    {
      chapter: 'Electrostatics',
      subject: 'physics',
      accuracy: 42,
      correct: 2,
      errors: 2,
      notAnswered: 1,
    },
    {
      chapter: 'Organic Chemistry',
      subject: 'chemistry',
      accuracy: 55,
      correct: 3,
      errors: 2,
      notAnswered: 1,
    },
    {
      chapter: 'Calculus',
      subject: 'maths',
      accuracy: 58,
      correct: 4,
      errors: 2,
      notAnswered: 1,
    },
  ],
  aiObservations: [
    'You are spending more time than required on Moderate Physics questions.',
    'Application-based Mathematics questions need targeted timed drills.',
  ],
  timeEfficiency: {
    avgTimePerSubject: [
      { subject: 'physics', avgTime: 85, accuracy: 56, totalQuestions: 8 },
      { subject: 'chemistry', avgTime: 63, accuracy: 68, totalQuestions: 10 },
      { subject: 'maths', avgTime: 77, accuracy: 59, totalQuestions: 12 },
    ],
    slowestSubject: 'physics',
    fastestSubject: 'chemistry',
    timeWastedOnWrongQuestions: 545,
    efficiencyScore: 0.34,
    totalTimeTaken: 3120,
  },
  visuals: {
    chapterHeatmap: [],
    subjectPerformanceBars: [],
    outcomePie: [
      { name: 'Correct', value: 16 },
      { name: 'Wrong', value: 9 },
      { name: 'Skipped', value: 5 },
    ],
    timeVsAccuracy: [],
  },
  recommendation: {
    riskLevel: 'Medium',
    focusAreas: ['Electrostatics', 'Organic Chemistry'],
    actionPlan: {
      today: ['Revise Electrostatics notes', 'Solve 20 Organic reaction MCQs'],
      thisWeek: ['Take two timed sectional mocks', 'Audit wrong answers and classify mistakes'],
      beforeNextExam: ['One full test with exam constraints', 'Revision sprint on weak concepts'],
    },
    strategy: 'Improve time management in moderate questions',
    confidenceTrend: 'Improving',
  },
  metadata: {
    generatedAt: new Date().toISOString(),
    totalQuestionsAnalyzed: 30,
  },
};
