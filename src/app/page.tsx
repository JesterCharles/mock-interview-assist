'use client';

// Home page - Interview setup and configuration wizard

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText, Users, Settings, ArrowRight, Check, X,
  Search, Github, Loader2, Clock, Brain, UserCheck
} from 'lucide-react';
import { useInterviewStore } from '@/store/interviewStore';
import { parseInterviewQuestions } from '@/lib/markdownParser';
import { ParsedQuestion } from '@/lib/types';
import { GitHubService, GitHubFile } from '@/lib/github-service';

export default function HomePage() {
  const router = useRouter();
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
    loadingQuestions,
    setLoadingQuestions
  } = useInterviewStore();

  const [loadedQuestions, setLoadedQuestions] = useState<ParsedQuestion[]>([]);
  const [availableTechs, setAvailableTechs] = useState<GitHubFile[]>([]);
  const [techSearch, setTechSearch] = useState('');
  const [isFetchingTechs, setIsFetchingTechs] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Local state for Phase 1
  const [assessmentType, setAssessmentType] = useState<'Technical' | 'Soft Skill' | 'Behavioral'>('Technical');
  const [questionCount, setQuestionCount] = useState(10);

  // Local state for Phase 2
  const [candidateName, setCandidateName] = useState('');
  const [interviewerName, setInterviewerName] = useState('');


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

  const handleStartInterview = () => {
    if (loadedQuestions.length === 0) {
      alert('Questions are not loaded yet. Please wait.');
      return;
    }

    createSession(
      loadedQuestions,
      Math.min(questionCount, loadedQuestions.length),
      [1], // Placeholder for weeks
      candidateName || undefined,
      interviewerName || undefined,
      interviewLevel
    );

    router.push('/interview');
  };

  // --- Render Steps ---

  const renderPhase1 = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Brain className="w-6 h-6 text-indigo-400" />
          Assessment Focus
        </h3>
        <div className="grid grid-cols-3 gap-4">
          {['Technical', 'Soft Skill', 'Behavioral'].map((type) => (
            <button
              key={type}
              onClick={() => setAssessmentType(type as any)}
              className={`p-4 rounded-xl border-2 transition-all duration-200 font-medium ${assessmentType === type
                ? 'border-indigo-500 bg-indigo-500/20 text-white'
                : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20'
                }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Clock className="w-6 h-6 text-indigo-400" />
          Duration & Questions
        </h3>
        <div className="bg-white/5 rounded-xl p-6 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-300">Number of Questions</span>
            <span className="text-2xl font-bold text-indigo-400">{questionCount}</span>
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
        <div className="h-64 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
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
            filteredTechs.map((tech) => (
              <button
                key={tech.path}
                onClick={() => toggleTech(tech)}
                className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all duration-200 text-left ${selectedTechs.find(t => t.path === tech.path)
                  ? 'border-indigo-500 bg-indigo-500/20 text-white'
                  : 'border-white/5 bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}
              >
                <span className="truncate mr-2" title={tech.path}>
                  {/* Clean up path for display */}
                  {tech.path.replace('/question-bank-v1.md', '').replace('.md', '')}
                </span>
                {selectedTechs.find(t => t.path === tech.path) && (
                  <Check className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                )}
              </button>
            ))
          )}
        </div>
        <p className="text-sm text-gray-400 mt-2 text-right">
          {selectedTechs.length} selected
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
      <div className="bg-white/5 rounded-2xl p-8 border border-white/10 space-y-6">
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

          <span className="text-gray-400">Questions</span>
          <span className="text-white font-medium">{questionCount} (~{questionCount * 2} min)</span>

          <span className="text-gray-400">Selected Techs</span>
          <span className="text-white font-medium">
            {selectedTechs.map(t => t.name).join(', ').substring(0, 50)}
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
          disabled={loadingQuestions || loadedQuestions.length === 0}
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
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col">
      <div className="container mx-auto px-4 py-8 flex-1 flex flex-col max-w-4xl">

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Interview Setup
          </h1>

          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-4 mt-6">
            <div className={`flex items-center gap-2 ${setupPhase >= 1 ? 'text-indigo-400' : 'text-gray-600'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold border-2 ${setupPhase >= 1 ? 'border-indigo-400 bg-indigo-400/10' : 'border-gray-600'}`}>1</div>
              <span className="hidden sm:inline font-medium">Focus</span>
            </div>
            <div className={`w-12 h-0.5 ${setupPhase >= 2 ? 'bg-indigo-400' : 'bg-gray-700'}`} />
            <div className={`flex items-center gap-2 ${setupPhase >= 2 ? 'text-indigo-400' : 'text-gray-600'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold border-2 ${setupPhase >= 2 ? 'border-indigo-400 bg-indigo-400/10' : 'border-gray-600'}`}>2</div>
              <span className="hidden sm:inline font-medium">Details</span>
            </div>
            <div className={`w-12 h-0.5 ${setupPhase >= 3 ? 'bg-indigo-400' : 'bg-gray-700'}`} />
            <div className={`flex items-center gap-2 ${setupPhase >= 3 ? 'text-indigo-400' : 'text-gray-600'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold border-2 ${setupPhase >= 3 ? 'border-indigo-400 bg-indigo-400/10' : 'border-gray-600'}`}>3</div>
              <span className="hidden sm:inline font-medium">Confirm</span>
            </div>
          </div>
        </div>

        {/* Previous Active Session Banner */}
        {session && session.status === 'in-progress' && setupPhase === 1 && (
          <div className="mb-8 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-xl p-4 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
            <div>
              <h3 className="font-semibold text-amber-100">Active Session in Progress</h3>
              <p className="text-amber-200/70 text-sm">
                {session.candidateName || 'Unnamed'} • Q{session.currentQuestionIndex + 1}
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={resetSession} className="text-sm text-amber-200 hover:text-white px-3 py-1">Discard</button>
              <button
                onClick={() => router.push('/interview')}
                className="bg-amber-500 hover:bg-amber-400 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                Resume
              </button>
            </div>
          </div>
        )}

        {/* Wizard Card */}
        <div className="bg-white/5 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/10 overflow-hidden flex-1 flex flex-col">
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
