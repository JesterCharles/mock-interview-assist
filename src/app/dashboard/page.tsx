'use client';

// Dashboard page - Interview setup and configuration wizard

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText, Users, Settings, ArrowRight, Check, X,
  Search, Github, Loader2, Clock, Brain, UserCheck, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useInterviewStore } from '@/store/interviewStore';
import { parseInterviewQuestions } from '@/lib/markdownParser';
import { ParsedQuestion } from '@/lib/types';
import { GitHubService, GitHubFile } from '@/lib/github-service';
import { useAuth } from '@/lib/auth-context';
import { validateSlug } from '@/lib/slug-validation';
import { mapGapScoresToWeights, GapScoreResponse } from '@/lib/adaptiveSetup';

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
    setRepoConfig,
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
      // Filter out non-matching naming conventions if needed, or just show all MD files
      setAvailableTechs(files);
      if (files.length === 0) {
        setError('No question banks found (looking for .md files).');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch from GitHub. Check repository details.');
      setAvailableTechs([]);
    } finally {
      setIsFetchingTechs(false);
    }
  }, [repoConfig]);

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
          // Use Promise.all for parallel fetching
          const promises = selectedTechs.map(async (techFile, index) => {
            const content = await service.getFileContent(techFile.path);
            // Use the index + 1 as the week number to ensure unique IDs across different files
            // (e.g. if multiple files have Q1, they will become week1-q1, week2-q1, etc.)
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

  // Pagination calculations
  const totalPages = Math.ceil(filteredTechs.length / TECHS_PER_PAGE);
  const paginatedTechs = filteredTechs.slice(
    (techPage - 1) * TECHS_PER_PAGE,
    techPage * TECHS_PER_PAGE
  );

  // Reset to page 1 when search changes
  useEffect(() => {
    setTechPage(1);
  }, [techSearch]);

  // applyGapScores: cross-references gap scores against availableTechs and pre-populates
  const applyGapScores = useCallback((scores: GapScoreResponse['scores']) => {
    const weights = mapGapScoresToWeights(scores);
    // Build a case-insensitive lookup from gap skill name → weight
    // Gap scores use skill names like "React", tech paths are like "react/question-bank-v1.md"
    const skillWeightMap = new Map<string, 1 | 2 | 3 | 4 | 5>();
    for (const [skill, weight] of Object.entries(weights)) {
      skillWeightMap.set(skill.toLowerCase(), weight as 1 | 2 | 3 | 4 | 5);
    }
    // Match tech path against gap skill: extract directory name from path, compare lowercase
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
    if (matchedTechs.length === 0) return; // no matching techs — stay manual
    setSelectedTechs(matchedTechs);
    matchedTechs.forEach(t => setTechWeight(t.path, matchedWeights[t.path]));
    setPrePopulatedPaths(new Set(matchedTechs.map(t => t.path)));
    setPrePopulatedWeights(matchedWeights);
    setPendingGapScores(null);
  }, [availableTechs, setSelectedTechs, setTechWeight]);

  // handleSlugLookup: fetches gap scores on slug blur, applies pre-population per D-05
  const handleSlugLookup = useCallback(async (slug: string) => {
    const trimmed = slug.trim().toLowerCase();
    if (!trimmed) return;
    setIsLoadingGapScores(true);
    try {
      const res = await fetch(`/api/associates/${encodeURIComponent(trimmed)}/gap-scores`);
      if (!res.ok) return; // network error — fail silently, stay manual
      const data: GapScoreResponse = await res.json();
      if (!data.found || data.sessionCount < 3) return; // cold start fallback per D-04
      if (availableTechs.length === 0) {
        setPendingGapScores(data.scores); // defer until techs load
        return;
      }
      applyGapScores(data.scores);
    } finally {
      setIsLoadingGapScores(false);
    }
  }, [availableTechs, applyGapScores]);

  // Deferred gap score application: fires when pendingGapScores exists and availableTechs loads
  useEffect(() => {
    if (pendingGapScores && availableTechs.length > 0) {
      applyGapScores(pendingGapScores);
    }
  }, [pendingGapScores, availableTechs, applyGapScores]);

  // handleWeightChange: wraps setTechWeight and removes the "auto" badge for that tech
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
      [1], // Placeholder for weeks
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
        <label className="text-sm font-medium" style={{ color: 'var(--muted)' }}>
          Associate <span className="text-gray-500 font-normal">(optional — pre-fills from gap history)</span>
        </label>
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={associateSlug}
                onChange={(e) => {
                  setAssociateSlug(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => {
                  setSlugInputFocused(true);
                  if (associateSlug.trim()) setShowSuggestions(true);
                }}
                onBlur={() => {
                  setSlugInputFocused(false);
                  // Delay hiding so click on suggestion registers
                  setTimeout(() => setShowSuggestions(false), 150);
                  handleSlugLookup(associateSlug);
                }}
                placeholder="Search by name or slug..."
                className="w-full pl-9 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 text-sm outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            {isLoadingGapScores && (
              <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
            )}
          </div>

          {/* Typeahead suggestions dropdown */}
          {showSuggestions && slugInputFocused && filteredSuggestions.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-gray-900 border border-white/20 rounded-lg shadow-lg max-h-48 overflow-y-auto">
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
                  className="w-full px-3 py-2 text-left hover:bg-white/10 transition-colors flex items-center justify-between"
                >
                  <span className="text-white text-sm">{a.displayName}</span>
                  <span className="text-xs text-gray-500">{a.slug}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Pre-population summary */}
        {prePopulatedPaths.size > 0 && (
          <div className="mt-3 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
            <p className="text-xs font-medium text-indigo-300 mb-2">
              {prePopulatedPaths.size} technologies pre-selected from gap history
            </p>
            <div className="flex flex-wrap gap-2">
              {Array.from(prePopulatedPaths).map(path => {
                const name = path.replace(/\/question-bank-v1\.md$/, '').replace(/\.md$/, '');
                const weight = prePopulatedWeights[path] ?? techWeights[path] ?? 1;
                return (
                  <span key={path} className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md bg-white/10">
                    <span className="text-white">{name}</span>
                    <span className={`font-bold ${weight >= 4 ? 'text-orange-400' : weight >= 3 ? 'text-yellow-400' : 'text-green-400'}`}>
                      {weight}x
                    </span>
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
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Brain className="w-6 h-6 text-indigo-400" />
            Assessment Focus
          </h3>
          <div className="flex flex-col gap-3">
            {['Technical', 'Behavioral'].map((type) => (
              <button
                key={type}
                onClick={() => setAssessmentType(type as 'Technical' | 'Behavioral')}
                className={`p-4 rounded-xl border-2 transition-all duration-200 font-medium ${assessmentType === type
                  ? 'border-indigo-500 bg-indigo-500/20 text-white'
                  : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20'
                  }`}
              >
                {type}
              </button>
            ))}
          </div>
          <p className="text-sm text-gray-500 mt-3">
            {assessmentType === 'Technical'
              ? 'Focus on technical knowledge and problem-solving skills'
              : 'Focus on communication, teamwork, and behavioral scenarios'
            }
          </p>
        </div>

        <div>
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Clock className="w-6 h-6 text-indigo-400" />
            Questions
          </h3>
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-300">Number of Questions</span>
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
                className="w-16 text-2xl font-bold text-indigo-400 bg-transparent border-b-2 border-indigo-500/50 focus:border-indigo-400 outline-none text-center"
              />
            </div>
            <input
              type="range"
              min="5"
              max="30"
              step="1"
              value={questionCount}
              onChange={(e) => setQuestionCount(parseInt(e.target.value))}
              className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-indigo-500 mb-2"
            />
            <p className="text-sm text-gray-400 text-right">
              Approx. {questionCount * 2} minutes
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Github className="w-6 h-6 text-indigo-400" />
          Technology Selection
        </h3>

        {/* Repo Config is now obscured/server-side managed */}
        <div className="flex justify-end mb-2">
          <button
            onClick={fetchTechs}
            className="text-xs text-gray-400 hover:text-white underline transition-colors"
          >
            Refresh List
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={techSearch}
            onChange={(e) => setTechSearch(e.target.value)}
            placeholder="Search technologies..."
            className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
          />
        </div>

        {/* Tech List */}
        <div className="min-h-[280px] pr-2 space-y-2">
          {isFetchingTechs ? (
            <div className="flex items-center justify-center h-full text-gray-400 gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading repositories...
            </div>
          ) : error ? (
            <div className="text-red-400 text-center py-4 text-sm">{error}</div>
          ) : filteredTechs.length === 0 ? (
            <div className="text-gray-500 text-center py-8">No matching technologies found</div>
          ) : (
            paginatedTechs.map((tech) => {
              const isSelected = selectedTechs.find(t => t.path === tech.path);
              const weight = techWeights[tech.path] ?? 1;
              const topicName = tech.path.replace('/question-bank-v1.md', '').replace('.md', '');

              return (
                <div key={tech.path} className="space-y-0">
                  <button
                    onClick={() => toggleTech(tech)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all duration-200 text-left ${isSelected
                      ? 'border-indigo-500 bg-indigo-500/20 text-white rounded-b-none'
                      : 'border-white/5 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'
                      }`}
                  >
                    <span className="truncate mr-2" title={tech.path}>
                      {topicName}
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isSelected && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300">
                          {weight}x
                        </span>
                      )}
                      {isSelected && (
                        <Check className="w-4 h-4 text-indigo-400" />
                      )}
                    </div>
                  </button>

                  {/* Inline Weight Slider - only visible when selected */}
                  {isSelected && (
                    <div
                      className="bg-indigo-500/10 border border-t-0 border-indigo-500/30 rounded-b-lg px-3 py-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400 whitespace-nowrap">Weight:</span>
                        <input
                          type="range"
                          min="1"
                          max="5"
                          step="1"
                          value={weight}
                          onChange={(e) => handleWeightChange(tech.path, parseInt(e.target.value))}
                          className="flex-1 h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                        <div className="flex gap-1 text-xs text-gray-500">
                          {[1, 2, 3, 4, 5].map((w) => (
                            <button
                              key={w}
                              onClick={() => handleWeightChange(tech.path, w)}
                              className={`w-5 h-5 rounded text-center transition-all ${weight === w
                                ? 'bg-indigo-500 text-white font-bold'
                                : 'bg-white/10 text-gray-400 hover:bg-white/20'
                                }`}
                            >
                              {w}
                            </button>
                          ))}
                        </div>
                        {prePopulatedPaths.has(tech.path) && (
                          <span className="text-xs font-medium ml-2" style={{ color: 'var(--muted)' }}>
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
          <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-white/10">
            <button
              onClick={() => setTechPage(p => Math.max(1, p - 1))}
              disabled={techPage === 1}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-4 h-4 text-gray-400" />
            </button>
            <span className="text-sm text-gray-400">
              Page {techPage} of {totalPages}
            </span>
            <button
              onClick={() => setTechPage(p => Math.min(totalPages, p + 1))}
              disabled={techPage === totalPages}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        )}

        <p className="text-sm text-gray-400 mt-2 text-right">
          {selectedTechs.length} selected {selectedTechs.length > 0 && '• Adjust weights below each selection'}
        </p>
      </div>

      <div className="pt-4 flex justify-end">
        <button
          onClick={() => setSetupPhase(2)}
          disabled={selectedTechs.length === 0}
          className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          Next Step <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );

  const renderPhase2 = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-right duration-500">
      <div>
        <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
          <Users className="w-6 h-6 text-indigo-400" />
          Participant Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm text-gray-300">Candidate Name</label>
            <input
              type="text"
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
              placeholder="e.g. Jane Doe"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-gray-300">Interviewer Name</label>
            <input
              type="text"
              value={interviewerName}
              onChange={(e) => setInterviewerName(e.target.value)}
              placeholder="e.g. John Smith"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        {/* Associate ID (optional) */}
        <div className="mt-6 space-y-2">
          <label className="text-sm text-gray-300">
            Associate ID <span className="text-gray-500">(optional)</span>
          </label>
          <input
            type="text"
            value={associateSlug}
            onChange={handleSlugChange}
            placeholder="e.g. jane-doe"
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white outline-none focus:border-indigo-500 transition-colors"
          />
          {slugError && <p className="text-xs text-red-400">{slugError}</p>}
          <p className="text-xs text-gray-500">Links this session to an associate&apos;s history</p>
        </div>
      </div>

      <div>
        <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
          <UserCheck className="w-6 h-6 text-indigo-400" />
          Interview Level
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => setInterviewLevel('entry')}
            className={`p-6 rounded-xl border-2 transition-all duration-200 text-left space-y-2 ${interviewLevel === 'entry'
              ? 'border-green-500 bg-green-500/10 text-white'
              : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20'
              }`}
          >
            <div className="font-bold text-lg">New Hire / Entry</div>
            <p className="text-sm opacity-80">
              Focuses on foundational knowledge and core concepts.
              Higher mix of beginner/intermediate questions.
            </p>
          </button>

          <button
            onClick={() => setInterviewLevel('experienced')}
            className={`p-6 rounded-xl border-2 transition-all duration-200 text-left space-y-2 ${interviewLevel === 'experienced'
              ? 'border-purple-500 bg-purple-500/10 text-white'
              : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20'
              }`}
          >
            <div className="font-bold text-lg">Experienced Hire</div>
            <p className="text-sm opacity-80">
              Focuses on system design, advanced concepts, and trade-offs.
              Higher mix of intermediate/advanced questions.
            </p>
          </button>
        </div>
      </div>

      <div className="pt-4 flex justify-between">
        <button
          onClick={() => setSetupPhase(1)}
          className="px-6 py-3 text-gray-400 hover:text-white transition-colors"
        >
          Back
        </button>
        <button
          onClick={() => setSetupPhase(3)}
          className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors flex items-center gap-2"
        >
          Review & Confirm <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );

  const renderPhase3 = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-right duration-500">
      <div className="glass-card rounded-2xl p-8 space-y-6">
        <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
          <Check className="w-6 h-6 text-green-400" />
          Ready to Start?
        </h3>

        <div className="grid grid-cols-2 gap-y-4 text-sm">
          <span className="text-gray-400">Assessment Type</span>
          <span className="text-white font-medium">{assessmentType}</span>

          <span className="text-gray-400">Target Level</span>
          <span className="text-white font-medium capitalize">{interviewLevel} Hire</span>

          <span className="text-gray-400">Candidate</span>
          <span className="text-white font-medium">{candidateName || 'Not specified'}</span>

          {associateSlug && (
            <>
              <span className="text-gray-400">Associate ID</span>
              <span className="text-white font-medium">{associateSlug}</span>
            </>
          )}

          <span className="text-gray-400">Questions</span>
          <span className="text-white font-medium">{questionCount} (~{questionCount * 2} min)</span>

          <span className="text-gray-400">Selected Techs</span>
          <span className="text-white font-medium">
            {selectedTechs.map(t => t.path.replace('/question-bank-v1.md', '').replace('.md', '')).join(', ').substring(0, 60)}
            {selectedTechs.length > 3 ? '...' : ''}
          </span>
        </div>

        {loadingQuestions ? (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
            <div className="flex-1">
              <p className="text-blue-100 font-medium">Loading Questions...</p>
              <p className="text-blue-300 text-sm">Fetching content from GitHub. This may take a moment.</p>
            </div>
          </div>
        ) : (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center gap-3">
            <Check className="w-5 h-5 text-green-400" />
            <div className="flex-1">
              <p className="text-green-100 font-medium">Questions Ready ({loadedQuestions.length})</p>
              <p className="text-green-300 text-sm">All selected banks have been loaded successfully.</p>
            </div>
          </div>
        )}
      </div>

      <div className="pt-4 flex justify-between">
        <button
          onClick={() => setSetupPhase(2)}
          className="px-6 py-3 text-gray-400 hover:text-white transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleStartInterview}
          disabled={loadingQuestions || loadedQuestions.length === 0 || !!slugError}
          className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:grayscale flex items-center gap-2"
        >
          {loadingQuestions ? 'Please Wait...' : 'Start Interview Now'}
          {!loadingQuestions && <ArrowRight className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );

  // --- Main Render ---

  return (
    <main className="min-h-screen nlm-bg flex flex-col">
      <div className="container mx-auto px-4 py-8 flex-1 flex flex-col max-w-4xl">

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Interview Setup
          </h1>

          {/* Progress Steps - Clickable */}
          <div className="flex items-center justify-center gap-4 mt-6">
            <button
              onClick={() => setSetupPhase(1)}
              className={`flex items-center gap-2 ${setupPhase >= 1 ? 'text-indigo-400' : 'text-gray-600'} hover:opacity-80 transition-opacity`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold border-2 ${setupPhase >= 1 ? 'border-indigo-400 bg-indigo-400/10' : 'border-gray-600'} ${setupPhase === 1 ? 'ring-2 ring-indigo-400/50' : ''}`}>1</div>
              <span className="hidden sm:inline font-medium">Focus</span>
            </button>
            <div className={`w-12 h-0.5 ${setupPhase >= 2 ? 'bg-indigo-400' : 'bg-gray-700'}`} />
            <button
              onClick={() => setSetupPhase(2)}
              className={`flex items-center gap-2 ${setupPhase >= 2 ? 'text-indigo-400' : 'text-gray-600'} hover:opacity-80 transition-opacity`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold border-2 ${setupPhase >= 2 ? 'border-indigo-400 bg-indigo-400/10' : 'border-gray-600'} ${setupPhase === 2 ? 'ring-2 ring-indigo-400/50' : ''}`}>2</div>
              <span className="hidden sm:inline font-medium">Details</span>
            </button>
            <div className={`w-12 h-0.5 ${setupPhase >= 3 ? 'bg-indigo-400' : 'bg-gray-700'}`} />
            <button
              onClick={() => setSetupPhase(3)}
              className={`flex items-center gap-2 ${setupPhase >= 3 ? 'text-indigo-400' : 'text-gray-600'} hover:opacity-80 transition-opacity`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold border-2 ${setupPhase >= 3 ? 'border-indigo-400 bg-indigo-400/10' : 'border-gray-600'} ${setupPhase === 3 ? 'ring-2 ring-indigo-400/50' : ''}`}>3</div>
              <span className="hidden sm:inline font-medium">Confirm</span>
            </button>
          </div>
        </div>

        {/* Previous Active Session Banner */}
        {session && (session.status === 'in-progress' || session.status === 'review') && (
          <div className={`mb-8 border rounded-xl p-4 flex items-center justify-between animate-in fade-in slide-in-from-top-2 ${session.status === 'review'
            ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border-indigo-500/30'
            : 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-500/30'
            }`}>
            <div>
              <h3 className={`font-semibold ${session.status === 'review' ? 'text-indigo-100' : 'text-amber-100'}`}>
                {session.status === 'review' ? 'Review In Progress' : 'Active Session in Progress'}
              </h3>
              <p className={`text-sm ${session.status === 'review' ? 'text-indigo-200/70' : 'text-amber-200/70'}`}>
                {session.candidateName || 'Unnamed'} • {session.status === 'review' ? 'Awaiting score validation' : `Q${session.currentQuestionIndex + 1}`}
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={resetSession} className={`text-sm px-3 py-1 ${session.status === 'review' ? 'text-indigo-200 hover:text-white' : 'text-amber-200 hover:text-white'}`}>Discard</button>
              <button
                onClick={() => router.push(session.status === 'review' ? '/review' : '/interview')}
                className={`px-4 py-2 rounded-lg text-sm font-medium text-white ${session.status === 'review'
                  ? 'bg-indigo-500 hover:bg-indigo-400'
                  : 'bg-amber-500 hover:bg-amber-400'
                  }`}
              >
                {session.status === 'review' ? 'Resume Review' : 'Resume'}
              </button>
            </div>
          </div>
        )}

        {/* Wizard Card */}
        <div className="glass-card-strong rounded-3xl overflow-hidden flex-1 flex flex-col border border-white/10">
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
