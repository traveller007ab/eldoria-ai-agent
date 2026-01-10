import type { AcademicProject } from '../../types';

export interface ProgressMetrics {
  overallProgress: number;
  chapterProgress: ChapterProgress[];
  wordCount: WordCountMetrics;
  citationMetrics: CitationMetrics;
  timelineMetrics: TimelineMetrics;
  estimatedCompletion: EstimatedCompletion;
  riskFactors: RiskFactor[];
  recommendations: string[];
}

export interface ChapterProgress {
  id: string;
  title: string;
  progress: number;
  wordCount: number;
  targetWordCount: number;
  citations: number;
  status: 'not_started' | 'in_progress' | 'review' | 'complete';
  lastModified: Date;
  dependencies: string[];
  blockers: string[];
}

export interface WordCountMetrics {
  current: number;
  target: number;
  averagePerDay: number;
  projectedTotal: number;
  paceStatus: 'ahead' | 'on_track' | 'behind';
  dailyRateTrend: 'increasing' | 'stable' | 'decreasing';
}

export interface CitationMetrics {
  current: number;
  target: number;
  perChapter: number;
  qualityScore: number;
  recentGrowth: number;
}

export interface TimelineMetrics {
  startDate: Date;
  targetDate: Date;
  elapsedDays: number;
  totalDays: number;
  percentTimeElapsed: number;
  percentWorkComplete: number;
  velocityScore: number;
}

export interface EstimatedCompletion {
  date: Date;
  confidence: number;
  scenarios: {
    optimistic: Date;
    realistic: Date;
    pessimistic: Date;
  };
  factors: string[];
}

export interface RiskFactor {
  id: string;
  type: 'schedule' | 'quality' | 'resource' | 'scope' | 'external';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  mitigation: string;
  probability: number;
}

export interface WritingSession {
  date: Date;
  duration: number;
  wordsWritten: number;
  chaptersModified: string[];
  productive: boolean;
}

export class ProgressPredictor {
  private project: AcademicProject | null = null;
  private writingHistory: WritingSession[] = [];
  private targetWordCount: number = 10000;
  private targetCitations: number = 20;

  constructor(project?: AcademicProject) {
    if (project) {
      this.initialize(project);
    }
  }

  initialize(project: AcademicProject): void {
    this.project = project;
    this.targetWordCount = this.estimateTargetWordCount(project);
    this.targetCitations = this.estimateTargetCitations(project);
  }

  private estimateTargetWordCount(project: AcademicProject): number {
    const objectives = project.wizard_state.objectives;
    const aim = objectives?.aim?.toLowerCase() || '';

    if (aim.includes('phd') || aim.includes('doctoral')) return 30000;
    if (aim.includes('master')) return 15000;
    if (aim.includes('bachelor')) return 6000;
    return 10000;
  }

  private estimateTargetCitations(project: AcademicProject): number {
    const objectives = project.wizard_state.objectives;
    const aim = objectives?.aim?.toLowerCase() || '';

    if (aim.includes('phd') || aim.includes('doctoral')) return 100;
    if (aim.includes('master')) return 30;
    if (aim.includes('bachelor')) return 15;
    return 20;
  }

  analyzeProgress(
    chapters: { id: string; title: string; content: string; status: string; lastModified: Date }[],
    references: { id: string }[]
  ): ProgressMetrics {
    const wordMetrics = this.analyzeWordProgress(chapters);
    const citationMetrics = this.analyzeCitationProgress(references);
    const timelineMetrics = this.analyzeTimeline();
    const chapterProgress = this.analyzeChapterProgress(chapters);
    const completion = this.estimateCompletion(wordMetrics, timelineMetrics);
    const risks = this.identifyRiskFactors(wordMetrics, timelineMetrics, chapterProgress);
    const recommendations = this.generateRecommendations(
      wordMetrics,
      citationMetrics,
      timelineMetrics,
      chapterProgress
    );

    const overallProgress = this.calculateOverallProgress(
      wordMetrics,
      citationMetrics,
      chapterProgress
    );

    return {
      overallProgress,
      chapterProgress,
      wordCount: wordMetrics,
      citationMetrics,
      timelineMetrics,
      estimatedCompletion: completion,
      riskFactors: risks,
      recommendations
    };
  }

  private analyzeWordProgress(
    chapters: { id: string; title: string; content: string; status: string; lastModified: Date }[]
  ): WordCountMetrics {
    const current = chapters.reduce((sum, ch) => {
      const words = ch.content.split(/\s+/).filter(w => w.length > 0).length;
      return sum + words;
    }, 0);

    const averagePerDay = this.calculateAverageDaily写作速度();
    const projectedTotal = current + (averagePerDay * 30);

    const paceStatus = this.determinePaceStatus(current, averagePerDay);
    const dailyRateTrend = this.analyzeTrend();

    return {
      current,
      target: this.targetWordCount,
      averagePerDay,
      projectedTotal,
      paceStatus,
      dailyRateTrend
    };
  }

  private calculateAverageDaily写作速度(): number {
    if (this.writingHistory.length === 0) return 500;

    const recentSessions = this.writingHistory.slice(-14);
    const totalWords = recentSessions.reduce((sum, s) => sum + s.wordsWritten, 0);
    const activeDays = new Set(recentSessions.map(s => s.date.toDateString())).size;

    return Math.round(totalWords / Math.max(1, activeDays));
  }

  private determinePaceStatus(current: number, dailyRate: number): 'ahead' | 'on_track' | 'behind' {
    if (!this.project) return 'on_track';

    const elapsed = this.getElapsedDays();
    const total = this.getTotalDays();
    const expectedProgress = (elapsed / total) * this.targetWordCount;

    const buffer = this.targetWordCount * 0.1;

    if (current > expectedProgress + buffer) return 'ahead';
    if (current < expectedProgress - buffer) return 'behind';
    return 'on_track';
  }

  private analyzeTrend(): 'increasing' | 'stable' | 'decreasing' {
    if (this.writingHistory.length < 7) return 'stable';

    const recent = this.writingHistory.slice(-7);
    const older = this.writingHistory.slice(-14, -7);

    if (older.length === 0) return 'stable';

    const recentAvg = recent.reduce((sum, s) => sum + s.wordsWritten, 0) / recent.length;
    const olderAvg = older.reduce((sum, s) => sum + s.wordsWritten, 0) / older.length;

    if (recentAvg > olderAvg * 1.1) return 'increasing';
    if (recentAvg < olderAvg * 0.9) return 'decreasing';
    return 'stable';
  }

  private analyzeChapterProgress(
    chapters: { id: string; title: string; content: string; status: string; lastModified: Date }[]
  ): ChapterProgress[] {
    return chapters.map(ch => {
      const wordCount = ch.content.split(/\s+/).filter(w => w.length > 0).length;
      const progress = this.calculateChapterProgress(ch.status, wordCount);

      return {
        id: ch.id,
        title: ch.title,
        progress,
        wordCount,
        targetWordCount: Math.round(this.targetWordCount / Math.max(1, chapters.length)),
        citations: 0,
        status: ch.status as ChapterProgress['status'],
        lastModified: ch.lastModified,
        dependencies: this.getChapterDependencies(ch.id),
        blockers: this.identifyChapterBlockers(ch)
      };
    });
  }

  private calculateChapterProgress(status: string, wordCount: number): number {
    switch (status) {
      case 'complete': return 100;
      case 'review': return 80;
      case 'in_progress': return Math.min(60, (wordCount / 500) * 60);
      default: return 0;
    }
  }

  private getChapterDependencies(chapterId: string): string[] {
    const dependencies: Record<string, string[]> = {
      'literature-review': ['introduction'],
      'methodology': ['literature-review'],
      'results': ['methodology'],
      'discussion': ['results'],
      'conclusion': ['discussion']
    };

    const lowerId = chapterId.toLowerCase();
    for (const [chapter, deps] of Object.entries(dependencies)) {
      if (lowerId.includes(chapter)) return deps;
    }

    return [];
  }

  private identifyChapterBlockers(
    chapter: { id: string; title: string; content: string; status: string }
  ): string[] {
    const blockers: string[] = [];

    if (chapter.status === 'in_progress' && chapter.content.length < 200) {
      blockers.push('Content needs expansion');
    }

    if (chapter.status === 'review' && !chapter.content.includes('.')) {
      blockers.push('Content appears incomplete');
    }

    return blockers;
  }

  private analyzeCitationProgress(references: { id: string }[]): CitationMetrics {
    const current = references.length;
    const perChapter = references.length / 5;

    const recentGrowth = this.calculateRecentCitationGrowth();

    return {
      current,
      target: this.targetCitations,
      perChapter,
      qualityScore: this.assessCitationQuality(),
      recentGrowth
    };
  }

  private calculateRecentCitationGrowth(): number {
    return Math.floor(Math.random() * 5);
  }

  private assessCitationQuality(): number {
    return 0.7 + Math.random() * 0.25;
  }

  private analyzeTimeline(): TimelineMetrics {
    const startDate = this.project?.created_at ? new Date(this.project.created_at) : new Date();
    const targetDate = new Date(startDate);
    targetDate.setMonth(targetDate.getMonth() + 6);

    const elapsed = this.getElapsedDays();
    const total = this.getTotalDays();

    const workComplete = this.project?.wizard_state ? 50 : 0;
    const percentTimeElapsed = (elapsed / total) * 100;
    const velocityScore = workComplete > 0 ? (workComplete / percentTimeElapsed) : 0;

    return {
      startDate,
      targetDate,
      elapsedDays: elapsed,
      totalDays: total,
      percentTimeElapsed,
      percentWorkComplete: workComplete,
      velocityScore: Math.min(2, velocityScore)
    };
  }

  private getElapsedDays(): number {
    if (!this.project) return 0;
    const created = new Date(this.project.created_at || Date.now());
    const now = new Date();
    return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  }

  private getTotalDays(): number {
    return 180;
  }

  private estimateCompletion(
    wordMetrics: WordCountMetrics,
    timelineMetrics: TimelineMetrics
  ): EstimatedCompletion {
    const remaining = this.targetWordCount - wordMetrics.current;
    const dailyRate = wordMetrics.averagePerDay || 500;

    const daysToComplete = Math.ceil(remaining / dailyRate);
    const realisticDate = new Date();
    realisticDate.setDate(realisticDate.getDate() + daysToComplete);

    const optimisticDate = new Date(realisticDate);
    optimisticDate.setDate(optimisticDate.getDate() - Math.ceil(daysToComplete * 0.3));

    const pessimisticDate = new Date(realisticDate);
    pessimisticDate.setDate(pessimisticDate.getDate() + Math.ceil(daysToComplete * 0.5));

    const confidence = this.calculateConfidence(wordMetrics, timelineMetrics);

    const factors = this.identifyCompletionFactors(wordMetrics, timelineMetrics);

    return {
      date: realisticDate,
      confidence,
      scenarios: {
        optimistic: optimisticDate,
        realistic: realisticDate,
        pessimistic: pessimisticDate
      },
      factors
    };
  }

  private calculateConfidence(
    wordMetrics: WordCountMetrics,
    timelineMetrics: TimelineMetrics
  ): number {
    let confidence = 0.8;

    if (wordMetrics.paceStatus === 'ahead') confidence += 0.1;
    if (wordMetrics.paceStatus === 'behind') confidence -= 0.2;

    if (wordMetrics.dailyRateTrend === 'increasing') confidence += 0.1;
    if (wordMetrics.dailyRateTrend === 'decreasing') confidence -= 0.15;

    if (timelineMetrics.velocityScore > 1) confidence += 0.1;
    if (timelineMetrics.velocityScore < 0.8) confidence -= 0.1;

    return Math.max(0.3, Math.min(0.95, confidence));
  }

  private identifyCompletionFactors(
    wordMetrics: WordCountMetrics,
    timelineMetrics: TimelineMetrics
  ): string[] {
    const factors: string[] = [];

    if (wordMetrics.paceStatus === 'behind') {
      factors.push('Current writing pace is below target');
    }

    if (wordMetrics.dailyRateTrend === 'decreasing') {
      factors.push('Productivity has been declining');
    }

    if (timelineMetrics.percentTimeElapsed > timelineMetrics.percentWorkComplete) {
      factors.push('Work completion is lagging behind schedule');
    }

    if (factors.length === 0) {
      factors.push('Current trajectory supports on-time completion');
    }

    return factors;
  }

  private identifyRiskFactor(
    type: RiskFactor['type'],
    severity: RiskFactor['severity'],
    description: string,
    mitigation: string,
    probability: number
  ): RiskFactor {
    return {
      id: `${type}-${Date.now()}`,
      type,
      severity,
      description,
      mitigation,
      probability
    };
  }

  private identifyRiskFactors(
    wordMetrics: WordCountMetrics,
    timelineMetrics: TimelineMetrics,
    chapterProgress: ChapterProgress[]
  ): RiskFactor[] {
    const risks: RiskFactor[] = [];

    if (wordMetrics.paceStatus === 'behind') {
      risks.push(this.identifyRiskFactor(
        'schedule',
        'high',
        'Current writing pace will miss deadline',
        'Increase daily writing target or reduce scope',
        0.7
      ));
    }

    const incompleteChapters = chapterProgress.filter(c => c.status === 'not_started');
    if (incompleteChapters.length > 3) {
      risks.push(this.identifyRiskFactor(
        'scope',
        'medium',
        `${incompleteChapters.length} chapters not started`,
        'Prioritize starting remaining chapters',
        0.5
      ));
    }

    const blockedChapters = chapterProgress.filter(c => c.blockers.length > 0);
    if (blockedChapters.length > 0) {
      risks.push(this.identifyRiskFactor(
        'resource',
        'medium',
        `${blockedChapters.length} chapters have blockers`,
        'Address specific blockers for each chapter',
        0.6
      ));
    }

    if (timelineMetrics.percentTimeElapsed > 80 && timelineMetrics.percentWorkComplete < 80) {
      risks.push(this.identifyRiskFactor(
        'schedule',
        'critical',
        'Time nearly exhausted with significant work remaining',
        'Immediate acceleration or deadline negotiation required',
        0.8
      ));
    }

    return risks;
  }

  private generateRecommendations(
    wordMetrics: WordCountMetrics,
    citationMetrics: CitationMetrics,
    timelineMetrics: TimelineMetrics,
    chapterProgress: ChapterProgress[]
  ): string[] {
    const recommendations: string[] = [];

    if (wordMetrics.paceStatus === 'behind') {
      recommendations.push(`Increase daily word target from ${wordMetrics.averagePerDay} to ${Math.round(wordMetrics.averagePerDay * 1.3)} words`);
    }

    if (wordMetrics.dailyRateTrend === 'decreasing') {
      recommendations.push('Consider changing writing environment or schedule to boost productivity');
    }

    const stuckChapters = chapterProgress.filter(c => c.progress > 0 && c.progress < 30);
    if (stuckChapters.length > 0) {
      recommendations.push(`Review stuck chapters: ${stuckChapters.map(c => c.title).join(', ')}`);
    }

    if (citationMetrics.perChapter < 3) {
      recommendations.push('Increase citation density by reviewing more recent literature');
    }

    if (timelineMetrics.velocityScore < 0.9) {
      recommendations.push('Consider reducing scope or increasing daily writing time');
    }

    if (recommendations.length === 0) {
      recommendations.push('Great progress! Maintain current trajectory');
    }

    return recommendations.slice(0, 5);
  }

  private calculateOverallProgress(
    wordMetrics: WordCountMetrics,
    citationMetrics: CitationMetrics,
    chapterProgress: ChapterProgress[]
  ): number {
    const wordProgress = Math.min(100, (wordMetrics.current / wordMetrics.target) * 100);
    const citationProgress = Math.min(100, (citationMetrics.current / citationMetrics.target) * 100);
    const chapterProgressAvg = chapterProgress.length > 0
      ? chapterProgress.reduce((sum, c) => sum + c.progress, 0) / chapterProgress.length
      : 0;

    return (wordProgress * 0.5) + (citationProgress * 0.2) + (chapterProgressAvg * 0.3);
  }

  recordWritingSession(session: WritingSession): void {
    this.writingHistory.push(session);
  }

  getPredictions() {
    return {
      wordMetrics: this.analyzeWordProgress([]),
      timelineMetrics: this.analyzeTimeline(),
      completion: this.estimateCompletion(
        this.analyzeWordProgress([]),
        this.analyzeTimeline()
      )
    };
  }
}

export const progressPredictor = new ProgressPredictor();
