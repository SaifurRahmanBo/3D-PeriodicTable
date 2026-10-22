import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ELEMENTS, ElementData, CATEGORY_LABELS } from '../data/elements';
import { soundEngine } from '../utils/audio';
import confetti from 'canvas-confetti';
import {
  Award,
  CheckCircle2,
  XCircle,
  RotateCcw,
  HelpCircle,
  Trophy,
  Play,
  Pause,
  StopCircle,
  BarChart3,
  Clock,
  Sparkles,
  BookOpen,
  ArrowRight,
  ShieldAlert,
  GraduationCap,
} from 'lucide-react';

export type QuizDifficulty = 'beginner' | 'intermediate' | 'advanced';

interface Question {
  id: number;
  prompt: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: QuizDifficulty;
  category: string;
  element: ElementData;
}

interface QuestionResult {
  question: Question;
  userAnswer: string;
  isCorrect: boolean;
  timeSpentSec: number;
}

export const ElementQuiz: React.FC = () => {
  const [difficulty, setDifficulty] = useState<QuizDifficulty>('intermediate');
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState<boolean>(false);
  const [streak, setStreak] = useState<number>(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [results, setResults] = useState<QuestionResult[]>([]);

  // Timer & Session state
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [showScoreModal, setShowScoreModal] = useState<boolean>(false);

  // Explanation permission state
  const [showExplanation, setShowExplanation] = useState<boolean>(false);

  const timerRef = useRef<number | null>(null);

  // Procedural Generator for Infinite Quiz Questions based on Difficulty
  const generateQuestions = (diff: QuizDifficulty, count: number): Question[] => {
    const pool: Question[] = [];

    // Filter elements pool by difficulty
    const elementPool =
      diff === 'beginner'
        ? ELEMENTS.slice(0, 20) // Light elements H to Ca
        : diff === 'intermediate'
        ? ELEMENTS.slice(0, 54) // Up to Xenon
        : ELEMENTS; // All 118 elements including Lanthanides, Actinides, Superheavies

    let qId = 1;

    // Type 1: Symbol to Name identification
    for (let i = 0; i < Math.ceil(count * 0.25); i++) {
      const el = elementPool[Math.floor(Math.random() * elementPool.length)];
      const distractors = elementPool.filter((e) => e.number !== el.number);
      const shuffledDistractors = [...distractors].sort(() => Math.random() - 0.5).slice(0, 3);
      const options = [el.name, ...shuffledDistractors.map((d) => d.name)].sort(() => Math.random() - 0.5);

      pool.push({
        id: qId++,
        prompt: `Which chemical element is represented by the chemical symbol "${el.symbol}"?`,
        options,
        correctAnswer: el.name,
        explanation: `${el.name} has the atomic symbol "${el.symbol}" with atomic number Z = ${el.number}. It belongs to the ${CATEGORY_LABELS[el.category]} family in Period ${el.period}.`,
        difficulty: diff,
        category: 'Symbols & Nomenclature',
        element: el,
      });
    }

    // Type 2: Electron Configuration Question
    for (let i = 0; i < Math.ceil(count * 0.25); i++) {
      const el = elementPool[Math.floor(Math.random() * elementPool.length)];
      const distractors = elementPool.filter((e) => e.number !== el.number);
      const shuffledDistractors = [...distractors].sort(() => Math.random() - 0.5).slice(0, 3);
      const options = [el.name, ...shuffledDistractors.map((d) => d.name)].sort(() => Math.random() - 0.5);

      pool.push({
        id: qId++,
        prompt: `Which element possesses the ground-state electron configuration: "${el.electronConfiguration}"?`,
        options,
        correctAnswer: el.name,
        explanation: `${el.name} (Z = ${el.number}) contains exactly ${el.electrons} electrons, filling its sublevels in the ground state as ${el.electronConfiguration}.`,
        difficulty: diff,
        category: 'Electron Configurations',
        element: el,
      });
    }

    // Type 3: Category / Chemical Group classification
    for (let i = 0; i < Math.ceil(count * 0.2); i++) {
      const targetCat = elementPool[Math.floor(Math.random() * elementPool.length)].category;
      const targetMatch = elementPool.find((e) => e.category === targetCat);
      const nonMatches = elementPool.filter((e) => e.category !== targetCat).slice(0, 3);

      if (targetMatch && nonMatches.length >= 3) {
        const options = [targetMatch.name, ...nonMatches.map((n) => n.name)].sort(() => Math.random() - 0.5);
        pool.push({
          id: qId++,
          prompt: `Which of the following elements is classified under the "${CATEGORY_LABELS[targetCat]}" family?`,
          options,
          correctAnswer: targetMatch.name,
          explanation: `${targetMatch.name} (${targetMatch.symbol}) is a member of the ${CATEGORY_LABELS[targetCat]} category located in Group ${targetMatch.group || 'f-block'}.`,
          difficulty: diff,
          category: 'Chemical Families',
          element: targetMatch,
        });
      }
    }

    // Type 4: Physical Property & Trends Question
    const trendQuestions: Question[] = [
      {
        id: qId++,
        prompt: 'Which element exhibits the highest Pauling electronegativity (3.98) in the periodic table?',
        options: ['Fluorine (F)', 'Oxygen (O)', 'Chlorine (Cl)', 'Nitrogen (N)'],
        correctAnswer: 'Fluorine (F)',
        explanation: 'Fluorine has the highest Pauling electronegativity (3.98) due to its minimal atomic radius (42 pm) and high effective nuclear charge attracting bonding electrons strongly.',
        difficulty: 'beginner',
        category: 'Periodic Trends',
        element: ELEMENTS.find((e) => e.symbol === 'F')!,
      },
      {
        id: qId++,
        prompt: 'Which metallic element possesses the highest melting point of all elements at 3422 °C?',
        options: ['Tungsten (W)', 'Titanium (Ti)', 'Platinum (Pt)', 'Osmium (Os)'],
        correctAnswer: 'Tungsten (W)',
        explanation: 'Tungsten (W, Z=74) has the highest melting point of all metals (3422 °C) because its half-filled 5d electron subshell forms exceptionally rigid covalent metallic bonds.',
        difficulty: 'intermediate',
        category: 'Physical Constants',
        element: ELEMENTS.find((e) => e.symbol === 'W')!,
      },
      {
        id: qId++,
        prompt: 'Which chemical element has the lowest first ionization energy and is the most electropositive?',
        options: ['Caesium (Cs)', 'Francium (Fr)', 'Potassium (K)', 'Lithium (Li)'],
        correctAnswer: 'Francium (Fr)',
        explanation: 'Francium (Fr, Z=87) has an electronegativity of 0.70 and ionization energy of 380 kJ/mol, making it the most electropositive naturally occurring alkali metal.',
        difficulty: 'intermediate',
        category: 'Periodic Trends',
        element: ELEMENTS.find((e) => e.symbol === 'Fr')!,
      },
      {
        id: qId++,
        prompt: 'Which element is liquid at standard room temperature and pressure (STP)?',
        options: ['Bromine (Br)', 'Gallium (Ga)', 'Caesium (Cs)', 'Chlorine (Cl)'],
        correctAnswer: 'Bromine (Br)',
        explanation: 'Only two chemical elements are liquid at standard room temperature (25 °C): Bromine (Br, nonmetal) and Mercury (Hg, transition metal).',
        difficulty: 'beginner',
        category: 'States of Matter',
        element: ELEMENTS.find((e) => e.symbol === 'Br')!,
      },
      {
        id: qId++,
        prompt: 'Which element has the anomalous ground-state electron configuration [Ar] 3d⁵ 4s¹ instead of [Ar] 3d⁴ 4s²?',
        options: ['Chromium (Cr)', 'Manganese (Mn)', 'Vanadium (V)', 'Iron (Fe)'],
        correctAnswer: 'Chromium (Cr)',
        explanation: 'Chromium (Z=24) promotes a 4s electron into 3d to achieve a half-filled 3d⁵ subshell, which confers extra exchange-energy stability.',
        difficulty: 'advanced',
        category: 'Quantum Mechanics',
        element: ELEMENTS.find((e) => e.symbol === 'Cr')!,
      },
      {
        id: qId++,
        prompt: 'Which element is the densest naturally occurring substance on Earth at 22.59 g/cm³?',
        options: ['Osmium (Os)', 'Lead (Pb)', 'Gold (Au)', 'Uranium (U)'],
        correctAnswer: 'Osmium (Os)',
        explanation: 'Osmium (Os, Z=76) is the densest naturally occurring element, surpassing iridium (22.56 g/cm³) due to strong lanthanide contraction in Period 6.',
        difficulty: 'intermediate',
        category: 'Physical Constants',
        element: ELEMENTS.find((e) => e.symbol === 'Os')!,
      },
      {
        id: qId++,
        prompt: 'Which noble gas completes Period 7 and is the heaviest known chemical element with atomic number 118?',
        options: ['Oganesson (Og)', 'Tennessine (Ts)', 'Radon (Rn)', 'Flerovium (Fl)'],
        correctAnswer: 'Oganesson (Og)',
        explanation: 'Oganesson (Og, Z=118) was synthesized in Dubna, Russia and named after nuclear physicist Yuri Oganessian, completing Period 7 and Group 18.',
        difficulty: 'advanced',
        category: 'Transuranic Elements',
        element: ELEMENTS.find((e) => e.symbol === 'Og')!,
      },
      {
        id: qId++,
        prompt: 'Which element exhibits completely filled 4d¹⁰ orbitals with zero 5s electrons ([Kr] 4d¹⁰)?',
        options: ['Palladium (Pd)', 'Platinum (Pt)', 'Silver (Ag)', 'Cadmium (Cd)'],
        correctAnswer: 'Palladium (Pd)',
        explanation: 'Palladium (Z=46) uniquely has the closed-shell configuration [Kr] 4d¹⁰ 5s⁰, having both 5s electrons shifted into the 4d subshell.',
        difficulty: 'advanced',
        category: 'Quantum Mechanics',
        element: ELEMENTS.find((e) => e.symbol === 'Pd')!,
      },
    ];

    const suitableTrendQuestions = trendQuestions.filter((t) => {
      if (diff === 'beginner') return t.difficulty === 'beginner';
      if (diff === 'intermediate') return t.difficulty !== 'advanced';
      return true;
    });

    pool.push(...suitableTrendQuestions);

    // Shuffle and pick exact requested count
    const shuffled = pool.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count).map((q, idx) => ({ ...q, id: idx + 1 }));
  };

  // Timer loop
  useEffect(() => {
    if (isRunning && !showScoreModal) {
      timerRef.current = window.setInterval(() => {
        setElapsedTime((t) => t + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, showScoreModal]);

  // Initialize or re-generate questions on difficulty change
  const startFreshQuiz = (newDiff = difficulty, newCount = questionCount) => {
    soundEngine.playClick(900);
    const newQs = generateQuestions(newDiff, newCount);
    setQuestions(newQs);
    setCurrentIdx(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setShowExplanation(false);
    setResults([]);
    setStreak(0);
    setElapsedTime(0);
    setIsRunning(true);
    setShowScoreModal(false);
  };

  useEffect(() => {
    startFreshQuiz(difficulty, questionCount);
  }, [difficulty]);

  const currentQ = questions[currentIdx];

  const handleSelectOption = (opt: string) => {
    if (isAnswered || !isRunning) return;
    setSelectedAnswer(opt);
    setIsAnswered(true);

    const isCorrect = opt === currentQ.correctAnswer;
    soundEngine.playQuizResult(isCorrect);

    // Record result
    setResults((prev) => [
      ...prev,
      {
        question: currentQ,
        userAnswer: opt,
        isCorrect,
        timeSpentSec: elapsedTime,
      },
    ]);

    if (isCorrect) {
      setStreak((s) => s + 1);
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.7 },
        colors: ['#06b6d4', '#38bdf8', '#10b981', '#f59e0b'],
      });
      // Correct answers can automatically show the quick fact if desired
      setShowExplanation(true);
    } else {
      setStreak(0);
      // INCORRECT ANSWER: We DO NOT reveal explanation automatically.
      // We will ask the student if they would like to view the explanation!
      setShowExplanation(false);
    }
  };

  const handleNext = () => {
    soundEngine.playClick(1000);
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((i) => i + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setShowExplanation(false);
    } else {
      // Completed all questions
      setIsRunning(false);
      setShowScoreModal(true);
    }
  };

  const scoreCount = results.filter((r) => r.isCorrect).length;
  const scorePercent = questions.length > 0 ? Math.round((scoreCount / questions.length) * 100) : 0;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!currentQ) return null;

  return (
    <div className="w-full rounded-xl bg-slate-950/90 border border-slate-800/90 p-5 shadow-2xl flex flex-col gap-5">
      {/* Quiz Top Action Bar: Difficulty, Controls, Timer & Scores */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        {/* Title & Difficulty Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">Quantum Elements Mastery Quiz</h3>
          </div>

          {/* Difficulty Level Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-900 border border-slate-800 text-xs">
            {(['beginner', 'intermediate', 'advanced'] as QuizDifficulty[]).map((diff) => (
              <button
                key={diff}
                onClick={() => {
                  soundEngine.playClick(1000);
                  setDifficulty(diff);
                }}
                className={`px-2.5 py-1 rounded capitalize font-medium transition-all ${
                  difficulty === diff
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {diff}
              </button>
            ))}
          </div>
        </div>

        {/* Operational Instant Controls: Start/Stop, Reset, View Scores */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Timer Display */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-xs text-slate-300">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>{formatTime(elapsedTime)}</span>
          </div>

          {/* Start / Pause Button */}
          <button
            onClick={() => {
              soundEngine.playClick(950);
              setIsRunning(!isRunning);
            }}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              isRunning
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25'
                : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/30'
            }`}
            title={isRunning ? 'Pause Quiz Session' : 'Resume Quiz Session'}
          >
            {isRunning ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Resume</span>
              </>
            )}
          </button>

          {/* Reset Quiz Button */}
          <button
            onClick={() => startFreshQuiz()}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Reset Quiz with fresh questions"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Reset</span>
          </button>

          {/* View Scores Button */}
          <button
            onClick={() => {
              soundEngine.playClick(1000);
              setShowScoreModal(true);
            }}
            className="px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="View Scoreboard and Analytics"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Scores ({scoreCount}/{results.length})</span>
          </button>
        </div>
      </div>

      {/* Progress & Live Streak Header */}
      <div className="flex items-center justify-between text-xs font-mono text-slate-400">
        <div className="flex items-center gap-2">
          <span>Question {currentIdx + 1} of {questions.length}</span>
          <span>·</span>
          <span className="text-cyan-400 capitalize">{difficulty} Level</span>
        </div>

        <div className="flex items-center gap-3">
          {streak > 1 && (
            <div className="px-2.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold flex items-center gap-1">
              <Trophy className="w-3 h-3" /> {streak} Streak!
            </div>
          )}
          <div className="text-slate-300">
            Accuracy: <strong className="text-cyan-400">{scorePercent}%</strong>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
        <div
          className="bg-cyan-500 h-full transition-all duration-300"
          style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Main Question Card */}
      {!isRunning ? (
        <div className="p-8 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col items-center justify-center text-center gap-3">
          <Pause className="w-10 h-10 text-amber-400" />
          <h4 className="text-lg font-bold text-white">Quiz is Paused</h4>
          <p className="text-xs text-slate-400 max-w-sm">
            The timer has been halted. Take a breath or resume when ready to continue.
          </p>
          <button
            onClick={() => setIsRunning(true)}
            className="mt-2 px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            <span>Resume Quiz</span>
          </button>
        </div>
      ) : (
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col gap-4">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              {currentQ.category}
            </span>
            <span className="text-slate-500 font-mono">ID #{currentQ.id}</span>
          </div>

          <h4 className="text-lg font-semibold text-white leading-snug">
            {currentQ.prompt}
          </h4>

          {/* Options Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {currentQ.options.map((opt) => {
              const isSelected = selectedAnswer === opt;
              const isCorrect = opt === currentQ.correctAnswer;

              let btnStyle = 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800 hover:border-slate-700';

              if (isAnswered) {
                if (isCorrect) {
                  btnStyle = 'bg-emerald-500/20 border-emerald-500 text-emerald-200 font-bold shadow-md shadow-emerald-500/20';
                } else if (isSelected) {
                  btnStyle = 'bg-rose-500/20 border-rose-500 text-rose-200';
                } else {
                  btnStyle = 'bg-slate-900/40 border-slate-850 text-slate-500 opacity-50';
                }
              }

              return (
                <button
                  key={opt}
                  disabled={isAnswered}
                  onClick={() => handleSelectOption(opt)}
                  className={`p-3.5 rounded-lg border text-sm font-medium text-left flex items-center justify-between transition-all ${btnStyle}`}
                >
                  <span>{opt}</span>
                  {isAnswered && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  {isAnswered && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-rose-400" />}
                </button>
              );
            })}
          </div>

          {/* PERMISSION GATE FOR EXPLANATIONS */}
          {isAnswered && (
            <div className="mt-2 flex flex-col gap-3">
              {/* If answered WRONG: Ask for permission first */}
              {selectedAnswer !== currentQ.correctAnswer ? (
                <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-800/40 flex flex-col gap-3">
                  <div className="flex items-start gap-2.5">
                    <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-semibold text-rose-300">
                        Incorrect Answer: You selected "{selectedAnswer}"
                      </div>
                      <p className="text-xs text-slate-300 mt-1">
                        The correct answer is <strong className="text-emerald-400 font-bold">{currentQ.correctAnswer}</strong>.
                      </p>
                    </div>
                  </div>

                  {!showExplanation ? (
                    /* Permission Prompt */
                    <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-700/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                      <span className="text-slate-300">
                        Would you like to view the step-by-step scientific explanation of the correct answer?
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            soundEngine.playClick(1100);
                            setShowExplanation(true);
                          }}
                          className="px-3.5 py-1.5 rounded-md bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-colors whitespace-nowrap shadow-sm"
                        >
                          Show Scientific Explanation
                        </button>
                        <button
                          onClick={() => handleNext()}
                          className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors whitespace-nowrap"
                        >
                          Skip & Next →
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Revealed Explanation */
                    <div className="p-3.5 rounded-lg bg-cyan-950/40 border border-cyan-800/60 text-xs text-cyan-200 leading-relaxed flex items-start gap-2 animate-fadeIn">
                      <HelpCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block mb-1 text-cyan-300 text-xs uppercase font-mono tracking-wider">
                          Scientific Explanation & Derivation:
                        </strong>
                        <p className="leading-relaxed">{currentQ.explanation}</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* If answered CORRECT */
                <div className="p-3.5 rounded-lg bg-emerald-950/30 border border-emerald-800/50 text-xs text-emerald-200 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block mb-0.5 text-emerald-300">Spot on! Correct answer.</strong>
                      <p className="text-[11px] text-slate-300 leading-relaxed">{currentQ.explanation}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Next Question Navigation */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={handleNext}
                  className="px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-lg shadow-cyan-500/20"
                >
                  <span>{currentIdx < questions.length - 1 ? 'Next Question' : 'Finish & View Report'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SCOREBOARD & ANALYTICS MODAL */}
      {showScoreModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
              <div className="flex items-center gap-2.5">
                <GraduationCap className="w-6 h-6 text-cyan-400" />
                <div>
                  <h3 className="text-base font-bold text-white">Quiz Performance & Scorecard</h3>
                  <p className="text-xs text-slate-400">Comprehensive atomic mastery evaluation</p>
                </div>
              </div>
              <button
                onClick={() => setShowScoreModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Score Stats Strip */}
            <div className="p-5 grid grid-cols-3 gap-3 border-b border-slate-800/80 bg-slate-900/30 text-center font-mono">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="text-[11px] text-slate-400 uppercase">Total Score</div>
                <div className="text-2xl font-black text-cyan-400 mt-1">
                  {scoreCount} / {questions.length}
                </div>
                <div className="text-[10px] text-slate-500">{scorePercent}% accuracy</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="text-[11px] text-slate-400 uppercase">Time Elapsed</div>
                <div className="text-2xl font-black text-white mt-1">
                  {formatTime(elapsedTime)}
                </div>
                <div className="text-[10px] text-slate-500">
                  ~{results.length > 0 ? (elapsedTime / results.length).toFixed(1) : 0}s per Q
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="text-[11px] text-slate-400 uppercase">Proficiency</div>
                <div className="text-sm font-bold text-amber-400 mt-2 truncate">
                  {scorePercent === 100
                    ? 'Quantum Laureate'
                    : scorePercent >= 80
                    ? 'Master Chemist'
                    : scorePercent >= 60
                    ? 'Rising Physicist'
                    : 'Apprentice'}
                </div>
                <div className="text-[10px] text-slate-500 capitalize">{difficulty} tier</div>
              </div>
            </div>

            {/* Questions Review Breakdown */}
            <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-3">
              <h5 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                Question Breakdown & Review
              </h5>

              {results.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  No questions answered yet in this session.
                </div>
              ) : (
                results.map((r, i) => (
                  <div
                    key={i}
                    className={`p-3.5 rounded-lg border text-xs flex flex-col gap-2 ${
                      r.isCorrect
                        ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-200'
                        : 'bg-rose-950/20 border-rose-800/40 text-rose-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-white">
                        {i + 1}. {r.question.prompt}
                      </span>
                      {r.isCorrect ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px] shrink-0">
                          Correct
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold text-[10px] shrink-0">
                          Incorrect
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-300 flex items-center gap-3">
                      <span>
                        Your Answer: <strong className={r.isCorrect ? 'text-emerald-400' : 'text-rose-400'}>{r.userAnswer}</strong>
                      </span>
                      {!r.isCorrect && (
                        <span>
                          Correct: <strong className="text-emerald-400">{r.question.correctAnswer}</strong>
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-400 border-t border-slate-800/60 pt-1.5 leading-relaxed">
                      {r.question.explanation}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-900/60">
              <button
                onClick={() => {
                  soundEngine.playClick(900);
                  startFreshQuiz(difficulty, questionCount);
                }}
                className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Generate New Quiz</span>
              </button>

              <button
                onClick={() => setShowScoreModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
