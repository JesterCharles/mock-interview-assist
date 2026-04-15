'use client';

// Dashboard page - Interview setup and configuration wizard

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, Search, Github, Loader2, Clock, Brain, UserCheck, ChevronLeft, ChevronRight, Check, ArrowRight
} from 'lucide-react';
import { useInterviewStore } from '@/store/interviewStore';
import { parseInterviewQuestions } from '@/lib/markdownParser';
import { ParsedQuestion } from '@/lib/types';
import { GitHubService, GitHubFile } from '@/lib/github-service';
import { useAuth } from '@/lib/auth-context';
import { validateSlug } from '@/lib/slug-validation';
import { mapGapScoresToWeights, GapScoreResponse } from '@/lib/adaptiveSetup';
import { filterTechsByCurriculum, filterGapScoresByCurriculum } from '@/lib/curriculumFilter';
import { CurriculumFilterBadge, TaughtWeek } from '@/components/dashboard/CurriculumFilterBadge';

const displayFont = { fontFamily: 'var(--font-display)' } as const;
const monoLabel = {
  fontFamily: 'var(--font-mono)',
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
};

// Surface card chrome used throughout the wizard
const surfaceCardStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
};

// Input chrome (token-driven)
const inputClass =
  'w-full px-4 py-3 rounded-lg text-sm outline-none transition-colors';
const inputStyle = {
  background: 'var(--surface-muted)',
  border: '1px solid var(--border)',
  color: 'var(--ink)',
};

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  const {
    createSession,
    session,
    resetSession,
    setupPhase,
    setSetupPhase,
    repoConfig,
    interviewLevel,
    setInterviewLevel,
    selectedTechs,
    setSelectedTechs,
    techWeights,
    setTechWeight,
    loadingQuestions,
    setLoadingQuestions
  } = useInterviewStore();

  const [loadedQuestions, setLoadedQuestions] = useState<ParsedQuestion[]>([]);
  // `allTechs` is the unfiltered GitHub-fetched list — source of truth.
  // `availableTechs` is what the user sees; may be filtered by curriculum.
  // Always re-filter from `allTechs`, never from `availableTechs` — otherwise
  // filters compose and hidden techs never return (Codex P2).
  const [allTechs, setAllTechs] = useState<GitHubFile[]>([]);
  const [availableTechs, setAvailableTechs] = useState<GitHubFile[]>([]);
  const [techSearch, setTechSearch] = useState('');
  const [isFetchingTechs, setIsFetchingTechs] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Local state for Phase 1
  const [assessmentType, setAssessmentType] = useState<'Technical' | 'Behavioral'>('Technical');
  const [questionCount, setQuestionCount] = useState(10);

  // Local state for Phase 2
  const [candidateName, setCandidateName] = useState('');
  const [interviewerName, setInterviewerName] = useState('');
  const [associateSlug, setAssociateSlug] = useState('');
  const [slugError, setSlugError] = useState<string | null>(null);

  // Adaptive pre-population state
  const [isLoadingGapScores, setIsLoadingGapScores] = useState(false);
  const [prePopulatedPaths, setPrePopulatedPaths] = useState<Set<string>>(new Set());
  const [pendingGapScores, setPendingGapScores] = useState<GapScoreResponse['scores'] | null>(null);
  const [prePopulatedWeights, setPrePopulatedWeights] = useState<Record<string, number>>({});

  // Curriculum filter state (D-14, D-17, D-18)
  const [taughtWeeks, setTaughtWeeks] = useState<TaughtWeek[]>([]);
  const [pendingTaughtSlugs, setPendingTaughtSlugs] = useState<string[] | null>(null);

  // Associate typeahead state
  const [associateList, setAssociateList] = useState<{ slug: string; displayName: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [slugInputFocused, setSlugInputFocused] = useState(false);

  // Pagination state for tech list
  const [techPage, setTechPage] = useState(1);
  const TECHS_PER_PAGE = 5;

  // Fetch associate list for typeahead on mount
  useEffect(() => {
    fetch('/api/trainer')
      .then(res => res.ok ? res.json() : [])
      .then((data: { slug: string; displayName: string }[]) => setAssociateList(data))
      .catch(() => setAssociateList([]));
  }, []);

  // Filtered suggestions for typeahead
  const filteredSuggestions = associateSlug.trim()
    ? associateList.filter(a =>
        a.slug.includes(associateSlug.toLowerCase()) ||
        a.displayName.toLowerCase().includes(associateSlug.toLowerCase())
      )
    : [];

  // Fetch available techs from GitHub when config changes or on mount
  const fetchTechs = useCallback(async () => {
    if (!repoConfig.owner || !repoConfig.repo) return;

    setIsFetchingTechs(true);
    setError(null);
    try {
      const service = new GitHubService(repoConfig.owner, repoConfig.repo, repoConfig.branch);
      const files = await service.findQuestionBanks('');
      setAllTechs(files);
      setAvailableTechs(files);
      if (files.length === 0) {
        setError('No question banks found (looking for .md files).');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch from GitHub. Check repository details.');
      setAllTechs([]);
      setAvailableTechs([]);
    } finally {
      setIsFetchingTechs(false);
    }
  }, [repoConfig]);

  // applyCurriculumFilter: filters the PROVIDED source list to taught slugs
  // and updates the visible `availableTechs`. Callers MUST pass `allTechs`
  // (the unfiltered source), never `availableTechs` — passing the filtered
  // list causes filters to compose and hidden techs never come back when
  // associates or cohorts are swapped (Codex P2).
  const applyCurriculumFilter = useCallback((source: GitHubFile[], taughtSlugs: string[]) => {
    const filtered = filterTechsByCurriculum(source, taughtSlugs);
    setAvailableTechs(filtered);
  }, []);

  // Clear any active curriculum filter — restore the full unfiltered list.
  const clearCurriculumFilter = useCallback(() => {
    setAvailableTechs(allTechs);
  }, [allTechs]);

  // Initial fetch
  useEffect(() => {
    fetchTechs();
  }, [fetchTechs]);

  // Trigger loading questions when moving to Phase 2 (or when techs are confirmed)
  useEffect(() => {
    if (selectedTechs.length > 0 && setupPhase > 1) {
      const loadSelectedQuestions = async () => {
        setLoadingQuestions(true);
        const allQuestions: ParsedQuestion[] = [];
        const service = new GitHubService(repoConfig.owner, repoConfig.repo, repoConfig.branch);

        try {
          const promises = selectedTechs.map(async (techFile, index) => {
            const content = await service.getFileContent(techFile.path);
            return parseInterviewQuestions(content, index + 1);
          });

          const results = await Promise.all(promises);
          results.forEach(questions => allQuestions.push(...questions));

          setLoadedQuestions(allQuestions);
        } catch (err) {
          console.error(err);
          setError('Failed to load some question banks.');
        } finally {
          setLoadingQuestions(false);
        }
      };

      loadSelectedQuestions();
    }
  }, [selectedTechs, setupPhase, repoConfig, setLoadingQuestions, setLoadedQuestions]);


  const toggleTech = (tech: GitHubFile) => {
    setSelectedTechs(
      selectedTechs.find(t => t.path === tech.path)
        ? selectedTechs.filter(t => t.path !== tech.path)
        : [...selectedTechs, tech]
    );
  };

  const filteredTechs = availableTechs.filter(t =>
    t.path.toLowerCase().includes(techSearch.toLowerCase())
  );

  const totalPages = Math.ceil(filteredTechs.length / TECHS_PER_PAGE);
  const paginatedTechs = filteredTechs.slice(
    (techPage - 1) * TECHS_PER_PAGE,
    techPage * TECHS_PER_PAGE
  );

  useEffect(() => {
    setTechPage(1);
  }, [techSearch]);

  // applyGapScores: cross-references gap scores against availableTechs and pre-populates
  const applyGapScores = useCallback((scores: GapScoreResponse['scores']) => {
    const weights = mapGapScoresToWeights(scores);
    const skillWeightMap = new Map<string, 1 | 2 | 3 | 4 | 5>();
    for (const [skill, weight] of Object.entries(weights)) {
      skillWeightMap.set(skill.toLowerCase(), weight as 1 | 2 | 3 | 4 | 5);
    }
    const matchedTechs: typeof availableTechs = [];
    const matchedWeights: Record<string, number> = {};
    for (const tech of availableTechs) {
      const techName = tech.path.replace(/\/question-bank-v1\.md$/, '').replace(/\.md$/, '').toLowerCase();
      const weight = skillWeightMap.get(techName);
      if (weight !== undefined) {
        matchedTechs.push(tech);
        matchedWeights[tech.path] = weight;
      }
    }
    if (matchedTechs.length === 0) return;
    setSelectedTechs(matchedTechs);
    matchedTechs.forEach(t => setTechWeight(t.path, matchedWeights[t.path]));
    setPrePopulatedPaths(new Set(matchedTechs.map(t => t.path)));
    setPrePopulatedWeights(matchedWeights);
    setPendingGapScores(null);
  }, [availableTechs, setSelectedTechs, setTechWeight]);

  // handleSlugLookup: fetches gap scores (+ curriculum if cohort present) on slug blur
  const handleSlugLookup = useCallback(async (slug: string) => {
    const trimmed = slug.trim().toLowerCase();
    if (!trimmed) return;
    setIsLoadingGapScores(true);
    try {
      const res = await fetch(`/api/associates/${encodeURIComponent(trimmed)}/gap-scores`);
      if (!res.ok) return;
      const data: GapScoreResponse = await res.json();

      let weeks: TaughtWeek[] = [];
      if (data.cohortId) {
        try {
          const [curriculumRes] = await Promise.all([
            fetch(`/api/cohorts/${data.cohortId}/curriculum?taught=true`),
          ]);
          if (curriculumRes.ok) {
            const curriculumData: TaughtWeek[] = await curriculumRes.json();
            weeks = curriculumData;
          }
        } catch {
          console.warn('[curriculum-filter] Failed to fetch curriculum — showing full tech list');
        }
        setTaughtWeeks(weeks);
      } else {
        setTaughtWeeks([]);
      }

      const taughtSlugs = weeks.map(w => w.skillSlug);

      if (taughtSlugs.length > 0) {
        if (allTechs.length > 0) {
          applyCurriculumFilter(allTechs, taughtSlugs);
        } else {
          setPendingTaughtSlugs(taughtSlugs);
        }
      } else {
        // Unassigned associate or cohort with no curriculum — restore the
        // full tech list so a prior filter doesn't linger (Codex P2).
        clearCurriculumFilter();
        setPendingTaughtSlugs(null);
      }

      if (!data.found || data.sessionCount < 3) return;
      const filteredScores = taughtSlugs.length > 0
        ? filterGapScoresByCurriculum(data.scores, taughtSlugs)
        : data.scores;
      if (availableTechs.length === 0) {
        setPendingGapScores(filteredScores);
        return;
      }
      applyGapScores(filteredScores);
    } catch {
      // Fail silently — stay in manual mode
    } finally {
      setIsLoadingGapScores(false);
    }
  }, [allTechs, availableTechs, applyGapScores, applyCurriculumFilter, clearCurriculumFilter]);

  useEffect(() => {
    if (pendingGapScores && availableTechs.length > 0) {
      applyGapScores(pendingGapScores);
    }
  }, [pendingGapScores, availableTechs, applyGapScores]);

  useEffect(() => {
    if (pendingTaughtSlugs && pendingTaughtSlugs.length > 0 && allTechs.length > 0) {
      applyCurriculumFilter(allTechs, pendingTaughtSlugs);
      setPendingTaughtSlugs(null);
    }
  }, [pendingTaughtSlugs, allTechs, applyCurriculumFilter]);

  const handleWeightChange = (path: string, weight: number) => {
    setTechWeight(path, weight);
    setPrePopulatedPaths(prev => {
      const next = new Set(prev);
      next.delete(path);
      return next;
    });
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const normalized = raw.toLowerCase().trim();
    setAssociateSlug(normalized);
    if (normalized) {
      const result = validateSlug(normalized);
      if (!result.success) {
        setSlugError(result.error);
      } else {
        setSlugError(null);
      }
    } else {
      setSlugError(null);
    }
  };

  const handleStartInterview = () => {
    if (loadedQuestions.length === 0) {
      alert('Questions are not loaded yet. Please wait.');
      return;
    }

    if (associateSlug) {
      const result = validateSlug(associateSlug);
      if (!result.success) {
        setSlugError(result.error);
        return;
      }
    }

    createSession(
      loadedQuestions,
      Math.min(questionCount, loadedQuestions.length),
      [1],
      candidateName || undefined,
      interviewerName || undefined,
      interviewLevel,
      associateSlug || undefined
    );

    router.push('/interview');
  };

  // --- Render Steps ---

  const renderPhase1 = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Adaptive Setup — Associate Search + Gap History */}
      <div className="space-y-2">
        <label className="text-xs font-medium" style={{ ...monoLabel, color: 'var(--muted)' }}>
          Associate <span style={{ textTransform: 'none', letterSpacing: 0 }} className="font-normal">(optional — pre-fills from gap history)</span>
        </label>
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--muted)' }} />
              <input
                type="text"
                value={associateSlug}
                onChange={(e) => {
                  handleSlugChange(e);
                  setShowSuggestions(true);
                }}
                onFocus={() => {
                  setSlugInputFocused(true);
                  if (associateSlug.trim()) setShowSuggestions(true);
                }}
                onBlur={() => {
                  setSlugInputFocused(false);
                  setTimeout(() => setShowSuggestions(false), 150);
                  handleSlugLookup(associateSlug);
                }}
                placeholder="Search by name or slug..."
                className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm outline-none transition-colors"
                style={inputStyle}
              />
            </div>
            {isLoadingGapScores && (
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--accent)' }} />
            )}
          </div>

          {/* Typeahead suggestions dropdown */}
          {showSuggestions && slugInputFocused && filteredSuggestions.length > 0 && (
            <div
              className="absolute z-10 mt-1 w-full rounded-lg max-h-48 overflow-y-auto"
              style={{ ...surfaceCardStyle, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
            >
              {filteredSuggestions.slice(0, 8).map((a) => (
                <button
                  key={a.slug}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setAssociateSlug(a.slug);
                    setShowSuggestions(false);
                    handleSlugLookup(a.slug);
                  }}
                  className="w-full px-3 py-2 text-left transition-colors flex items-center justify-between hover:bg-[var(--highlight)]"
                >
                  <span className="text-sm" style={{ color: 'var(--ink)' }}>{a.displayName}</span>
                  <span className="text-xs" style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{a.slug}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {slugError && (
          <p className="text-xs" style={{ color: 'var(--danger)' }}>{slugError}</p>
        )}

        {/* Pre-population summary */}
        {prePopulatedPaths.size > 0 && (
          <div
            className="mt-3 p-3 rounded-lg"
            style={{
              background: 'var(--highlight)',
              border: '1px solid var(--border)',
            }}
          >
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--accent)' }}>
              {prePopulatedPaths.size} technologies pre-selected from gap history
            </p>
            <div className="flex flex-wrap gap-2">
              {Array.from(prePopulatedPaths).map(path => {
                const name = path.replace(/\/question-bank-v1\.md$/, '').replace(/\.md$/, '');
                const weight = prePopulatedWeights[path] ?? techWeights[path] ?? 1;
                const weightColor =
                  weight >= 4 ? 'var(--danger)'
                  : weight >= 3 ? 'var(--warning)'
                  : 'var(--success)';
                return (
                  <span
                    key={path}
                    className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md"
                    style={{ background: 'var(--surface-muted)', border: '1px solid var(--border-subtle)' }}
                  >
                    <span style={{ color: 'var(--ink)' }}>{name}</span>
                    <span className="font-bold" style={{ color: weightColor }}>{weight}x</span>
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Assessment Focus & Question Count - Side by Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-xl mb-4 flex items-center gap-2" style={{ ...displayFont, fontWeight: 600, color: 'var(--ink)' }}>
            <Brain className="w-6 h-6" style={{ color: 'var(--accent)' }} />
            Assessment Focus
          </h3>
          <div className="flex flex-col gap-3">
            {(['Technical', 'Behavioral'] as const).map((type) => {
              const selected = assessmentType === type;
              return (
                <button
                  key={type}
                  onClick={() => setAssessmentType(type)}
                  className="p-4 rounded-lg transition-all duration-200 font-medium text-left"
                  style={{
                    border: `2px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                    background: selected ? 'var(--highlight)' : 'var(--surface)',
                    color: selected ? 'var(--ink)' : 'var(--muted)',
                  }}
                >
                  {type}
                </button>
              );
            })}
          </div>
          <p className="text-sm mt-3" style={{ color: 'var(--muted)' }}>
            {assessmentType === 'Technical'
              ? 'Focus on technical knowledge and problem-solving skills'
              : 'Focus on communication, teamwork, and behavioral scenarios'
            }
          </p>
        </div>

        <div>
          <h3 className="text-xl mb-4 flex items-center gap-2" style={{ ...displayFont, fontWeight: 600, color: 'var(--ink)' }}>
            <Clock className="w-6 h-6" style={{ color: 'var(--accent)' }} />
            Questions
          </h3>
          <div className="rounded-xl p-6" style={surfaceCardStyle}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm" style={{ color: 'var(--muted)' }}>Number of Questions</span>
              <input
                type="number"
                min="5"
                max="30"
                value={questionCount}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val)) setQuestionCount(val);
                }}
                onBlur={(e) => {
                  const val = parseInt(e.target.value) || 10;
                  setQuestionCount(Math.min(30, Math.max(5, val)));
                }}
                className="w-16 text-2xl font-bold bg-transparent outline-none text-center"
                style={{
                  color: 'var(--accent)',
                  borderBottom: '2px solid var(--accent)',
                  fontVariantNumeric: 'tabular-nums',
                  fontFamily: 'var(--font-mono)',
                }}
              />
            </div>
            <input
              type="range"
              min="5"
              max="30"
              step="1"
              value={questionCount}
              onChange={(e) => setQuestionCount(parseInt(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer mb-2"
              style={{
                background: 'var(--surface-muted)',
                accentColor: 'var(--accent)',
              }}
            />
            <p className="text-sm text-right" style={{ color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
              Approx. {questionCount * 2} minutes
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-xl mb-4 flex items-center gap-2" style={{ ...displayFont, fontWeight: 600, color: 'var(--ink)' }}>
          <Github className="w-6 h-6" style={{ color: 'var(--accent)' }} />
          Technology Selection
        </h3>

        {/* Curriculum filter badge — visible when associate has cohort with taught weeks */}
        <CurriculumFilterBadge taughtWeeks={taughtWeeks} />

        <div className="flex justify-end mb-2">
          <button
            onClick={fetchTechs}
            className="text-xs underline transition-colors"
            style={{ color: 'var(--muted)' }}
          >
            Refresh List
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: 'var(--muted)' }} />
          <input
            type="text"
            value={techSearch}
            onChange={(e) => setTechSearch(e.target.value)}
            placeholder="Search technologies..."
            className={inputClass + ' pl-10'}
            style={inputStyle}
          />
        </div>

        {/* Tech List */}
        <div className="min-h-[280px] pr-2 space-y-2">
          {isFetchingTechs ? (
            <div className="flex items-center justify-center h-full gap-2" style={{ color: 'var(--muted)' }}>
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--accent)' }} />
              Loading repositories...
            </div>
          ) : error ? (
            <div
              className="text-center py-4 text-sm rounded-lg px-3"
              style={{
                background: '#FDECEB',
                border: '1px solid var(--danger)',
                color: 'var(--danger)',
              }}
            >
              {error}
            </div>
          ) : filteredTechs.length === 0 ? (
            <div className="text-center py-8" style={{ color: 'var(--muted)' }}>No matching technologies found</div>
          ) : (
            paginatedTechs.map((tech) => {
              const isSelected = !!selectedTechs.find(t => t.path === tech.path);
              const weight = techWeights[tech.path] ?? 1;
              const topicName = tech.path.replace('/question-bank-v1.md', '').replace('.md', '');

              return (
                <div key={tech.path} className="space-y-0">
                  <button
                    onClick={() => toggleTech(tech)}
                    className="w-full flex items-center justify-between p-3 rounded-lg transition-all duration-200 text-left"
                    style={{
                      border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                      background: isSelected ? 'var(--highlight)' : 'var(--surface)',
                      color: 'var(--ink)',
                      borderBottomLeftRadius: isSelected ? 0 : undefined,
                      borderBottomRightRadius: isSelected ? 0 : undefined,
                    }}
                  >
                    <span className="truncate mr-2 text-sm" title={tech.path}>
                      {topicName}
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isSelected && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{
                            background: 'var(--accent)',
                            color: '#FFFFFF',
                            fontFamily: 'var(--font-mono)',
                          }}
                        >
                          {weight}x
                        </span>
                      )}
                      {isSelected && (
                        <Check className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                      )}
                    </div>
                  </button>

                  {/* Inline Weight Slider - only visible when selected */}
                  {isSelected && (
                    <div
                      className="rounded-b-lg px-3 py-2"
                      style={{
                        background: 'var(--surface-muted)',
                        border: '1px solid var(--accent)',
                        borderTop: 0,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs whitespace-nowrap" style={{ color: 'var(--muted)' }}>Weight:</span>
                        <input
                          type="range"
                          min="1"
                          max="5"
                          step="1"
                          value={weight}
                          onChange={(e) => handleWeightChange(tech.path, parseInt(e.target.value))}
                          className="flex-1 h-1.5 rounded-lg appearance-none cursor-pointer"
                          style={{ background: 'var(--border)', accentColor: 'var(--accent)' }}
                        />
                        <div className="flex gap-1 text-xs">
                          {[1, 2, 3, 4, 5].map((w) => {
                            const active = weight === w;
                            return (
                              <button
                                key={w}
                                onClick={() => handleWeightChange(tech.path, w)}
                                className="w-5 h-5 rounded text-center transition-all font-medium"
                                style={{
                                  background: active ? 'var(--accent)' : 'var(--surface)',
                                  color: active ? '#FFFFFF' : 'var(--muted)',
                                  border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                                  fontFamily: 'var(--font-mono)',
                                }}
                              >
                                {w}
                              </button>
                            );
                          })}
                        </div>
                        {prePopulatedPaths.has(tech.path) && (
                          <span className="text-xs font-medium ml-2" style={{ ...monoLabel, color: 'var(--muted)' }}>
                            auto
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-3 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <button
              onClick={() => setTechPage(p => Math.max(1, p - 1))}
              disabled={techPage === 1}
              className="p-2 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ background: 'var(--surface-muted)', color: 'var(--ink)' }}
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm" style={{ color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
              Page {techPage} of {totalPages}
            </span>
            <button
              onClick={() => setTechPage(p => Math.min(totalPages, p + 1))}
              disabled={techPage === totalPages}
              className="p-2 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ background: 'var(--surface-muted)', color: 'var(--ink)' }}
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        <p className="text-sm mt-2 text-right" style={{ color: 'var(--muted)' }}>
          {selectedTechs.length} selected {selectedTechs.length > 0 && '• Adjust weights below each selection'}
        </p>
      </div>

      <div className="pt-4 flex justify-end">
        <button
          onClick={() => setSetupPhase(2)}
          disabled={selectedTechs.length === 0}
          className="btn-accent-flat flex items-center gap-2"
        >
          Next Step <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );

  const renderPhase2 = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-right duration-500">
      <div>
        <h3 className="text-xl mb-6 flex items-center gap-2" style={{ ...displayFont, fontWeight: 600, color: 'var(--ink)' }}>
          <Users className="w-6 h-6" style={{ color: 'var(--accent)' }} />
          Participant Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-medium" style={{ ...monoLabel, color: 'var(--muted)' }}>Candidate Name</label>
            <input
              type="text"
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
              placeholder="e.g. Jane Doe"
              className={inputClass}
              style={inputStyle}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium" style={{ ...monoLabel, color: 'var(--muted)' }}>Interviewer Name</label>
            <input
              type="text"
              value={interviewerName}
              onChange={(e) => setInterviewerName(e.target.value)}
              placeholder="e.g. John Smith"
              className={inputClass}
              style={inputStyle}
            />
          </div>
        </div>

        {/* Associate ID — read-only, set from Phase 1 search */}
        {associateSlug && (
          <div className="mt-6 space-y-2">
            <label className="text-xs font-medium" style={{ ...monoLabel, color: 'var(--muted)' }}>Associate ID</label>
            <div
              className="w-full px-4 py-3 rounded-lg text-sm"
              style={{
                background: 'var(--surface-muted)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--ink)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {associateSlug}
            </div>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>Set in Focus step — go back to change</p>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-xl mb-6 flex items-center gap-2" style={{ ...displayFont, fontWeight: 600, color: 'var(--ink)' }}>
          <UserCheck className="w-6 h-6" style={{ color: 'var(--accent)' }} />
          Interview Level
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {([
            { value: 'entry' as const, title: 'New Hire / Entry', desc: 'Focuses on foundational knowledge and core concepts. Higher mix of beginner/intermediate questions.' },
            { value: 'experienced' as const, title: 'Experienced Hire', desc: 'Focuses on system design, advanced concepts, and trade-offs. Higher mix of intermediate/advanced questions.' },
          ]).map(({ value, title, desc }) => {
            const selected = interviewLevel === value;
            return (
              <button
                key={value}
                onClick={() => setInterviewLevel(value)}
                className="p-6 rounded-xl transition-all duration-200 text-left space-y-2"
                style={{
                  border: `2px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                  background: selected ? 'var(--highlight)' : 'var(--surface)',
                  color: 'var(--ink)',
                }}
              >
                <div className="font-bold text-lg" style={displayFont}>{title}</div>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>{desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="pt-4 flex justify-between">
        <button
          onClick={() => setSetupPhase(1)}
          className="btn-secondary-flat"
        >
          Back
        </button>
        <button
          onClick={() => setSetupPhase(3)}
          className="btn-accent-flat flex items-center gap-2"
        >
          Review &amp; Confirm <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );

  const renderPhase3 = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-right duration-500">
      <div className="rounded-xl p-8 space-y-6" style={surfaceCardStyle}>
        <h3 className="text-xl mb-6 flex items-center gap-2" style={{ ...displayFont, fontWeight: 600, color: 'var(--ink)' }}>
          <Check className="w-6 h-6" style={{ color: 'var(--success)' }} />
          Ready to Start?
        </h3>

        <div className="grid grid-cols-2 gap-y-4 text-sm">
          <span style={{ color: 'var(--muted)' }}>Assessment Type</span>
          <span className="font-medium" style={{ color: 'var(--ink)' }}>{assessmentType}</span>

          <span style={{ color: 'var(--muted)' }}>Target Level</span>
          <span className="font-medium capitalize" style={{ color: 'var(--ink)' }}>{interviewLevel} Hire</span>

          <span style={{ color: 'var(--muted)' }}>Candidate</span>
          <span className="font-medium" style={{ color: 'var(--ink)' }}>{candidateName || 'Not specified'}</span>

          {associateSlug && (
            <>
              <span style={{ color: 'var(--muted)' }}>Associate ID</span>
              <span className="font-medium" style={{ color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>{associateSlug}</span>
            </>
          )}

          <span style={{ color: 'var(--muted)' }}>Questions</span>
          <span className="font-medium" style={{ color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
            {questionCount} (~{questionCount * 2} min)
          </span>

          <span style={{ color: 'var(--muted)' }}>Selected Techs</span>
          <span className="font-medium" style={{ color: 'var(--ink)' }}>
            {selectedTechs.map(t => t.path.replace('/question-bank-v1.md', '').replace('.md', '')).join(', ').substring(0, 60)}
            {selectedTechs.length > 3 ? '...' : ''}
          </span>
        </div>

        {loadingQuestions ? (
          <div
            className="rounded-xl p-4 flex items-center gap-3"
            style={{
              background: '#FEF3E0',
              border: '1px solid var(--warning)',
            }}
          >
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--warning)' }} />
            <div className="flex-1">
              <p className="font-medium" style={{ color: 'var(--warning)' }}>Loading Questions...</p>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>Fetching content from GitHub. This may take a moment.</p>
            </div>
          </div>
        ) : (
          <div
            className="rounded-xl p-4 flex items-center gap-3"
            style={{
              background: '#E8F5EE',
              border: '1px solid var(--success)',
            }}
          >
            <Check className="w-5 h-5" style={{ color: 'var(--success)' }} />
            <div className="flex-1">
              <p className="font-medium" style={{ color: 'var(--success)' }}>Questions Ready ({loadedQuestions.length})</p>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>All selected banks have been loaded successfully.</p>
            </div>
          </div>
        )}
      </div>

      <div className="pt-4 flex justify-between">
        <button
          onClick={() => setSetupPhase(2)}
          className="btn-secondary-flat"
        >
          Back
        </button>
        <button
          onClick={handleStartInterview}
          disabled={loadingQuestions || loadedQuestions.length === 0 || !!slugError}
          className="btn-accent-flat flex items-center gap-2"
        >
          {loadingQuestions ? 'Please Wait...' : 'Start Interview Now'}
          {!loadingQuestions && <ArrowRight className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );

  // --- Main Render ---

  const steps: { num: 1 | 2 | 3; label: string }[] = [
    { num: 1, label: 'Focus' },
    { num: 2, label: 'Details' },
    { num: 3, label: 'Confirm' },
  ];

  return (
    <main className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      <div className="container mx-auto px-4 py-8 flex-1 flex flex-col max-w-4xl">

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl mb-2" style={{ ...displayFont, fontWeight: 600, color: 'var(--ink)' }}>
            Interview Setup
          </h1>

          {/* Progress Steps - Clickable (flat, token-driven, no gradient bar) */}
          <div className="flex items-center justify-center gap-4 mt-6">
            {steps.map((s, idx) => {
              const active = setupPhase >= s.num;
              const current = setupPhase === s.num;
              return (
                <div key={s.num} className="flex items-center gap-4">
                  <button
                    onClick={() => setSetupPhase(s.num)}
                    className="flex items-center gap-2 transition-opacity hover:opacity-80"
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                      style={{
                        border: `2px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                        background: active ? 'var(--highlight)' : 'var(--surface)',
                        color: active ? 'var(--accent)' : 'var(--muted)',
                        outline: current ? '2px solid var(--accent)' : 'none',
                        outlineOffset: current ? '2px' : undefined,
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {s.num}
                    </div>
                    <span
                      className="hidden sm:inline text-xs font-medium"
                      style={{ ...monoLabel, color: active ? 'var(--accent)' : 'var(--muted)' }}
                    >
                      {s.label}
                    </span>
                  </button>
                  {idx < steps.length - 1 && (
                    <div
                      className="w-12 h-px"
                      style={{ background: setupPhase > s.num ? 'var(--accent)' : 'var(--border)' }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Previous Active Session Banner */}
        {session && (session.status === 'in-progress' || session.status === 'review') && (
          <div
            className="mb-8 rounded-xl p-4 flex items-center justify-between animate-in fade-in slide-in-from-top-2"
            style={{
              background: session.status === 'review' ? 'var(--highlight)' : '#FEF3E0',
              border: `1px solid ${session.status === 'review' ? 'var(--accent)' : 'var(--warning)'}`,
            }}
          >
            <div>
              <h3
                className="font-semibold"
                style={{ color: session.status === 'review' ? 'var(--accent)' : 'var(--warning)' }}
              >
                {session.status === 'review' ? 'Review In Progress' : 'Active Session in Progress'}
              </h3>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                {session.candidateName || 'Unnamed'} • {session.status === 'review' ? 'Awaiting score validation' : `Q${session.currentQuestionIndex + 1}`}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={resetSession}
                className="text-sm px-3 py-1"
                style={{ color: 'var(--muted)' }}
              >
                Discard
              </button>
              <button
                onClick={() => router.push(session.status === 'review' ? '/review' : '/interview')}
                className="btn-accent-flat"
              >
                {session.status === 'review' ? 'Resume Review' : 'Resume'}
              </button>
            </div>
          </div>
        )}

        {/* Wizard Card */}
        <div
          className="rounded-xl overflow-hidden flex-1 flex flex-col"
          style={surfaceCardStyle}
        >
          <div className="p-8 flex-1">
            {setupPhase === 1 && renderPhase1()}
            {setupPhase === 2 && renderPhase2()}
            {setupPhase === 3 && renderPhase3()}
          </div>
        </div>
      </div>
    </main>
  );
}
