import React, { useState, useEffect, useRef } from 'react';
import { Course, Module, Lesson, Apostila, StudentProgress, SupportComment, Certificate, User, Sale, SupportTicket } from '../types';
import { 
  BookOpen, Play, CheckCircle, FileText, HelpCircle, 
  Sparkles, Send, Award, Download, CheckCircle2, Bookmark, BookmarkCheck, ExternalLink, Printer, ShieldAlert,
  ChevronRight, Camera, UploadCloud, Image as ImageIcon,
  Lock, Unlock, Pause, Volume2, VolumeX, Maximize, Minimize, RotateCcw, History, ChevronLeft
} from 'lucide-react';
import { getDirectDriveUrl } from '../utils/image';
import { cleanCitations } from '../utils/text';
import { FileUploader } from './FileUploader';
import { apiFetch } from '../utils/firebase';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const fetch = apiFetch;

interface StudentPortalProps {
  currentUser: User;
  courses: Course[];
  modules: Module[];
  lessons: Lesson[];
  apostilas: Apostila[];
  progress: StudentProgress[];
  onToggleComplete: (lessonId: string, courseId: string, completed: boolean) => void;
  onToggleFavorite: (lessonId: string, courseId: string, favorited: boolean) => void;
  onSaveProgress?: (lessonId: string, courseId: string, data: Partial<StudentProgress>) => Promise<void>;
  comments: SupportComment[];
  onAddComment: (commentPayload: any) => void;
  certificates: Certificate[];
  onIssueCertificate: (payload: any) => void;
  sales: Sale[];
  supportTickets: SupportTicket[];
  onSubmitTicket: (ticketPayload: any) => Promise<void>;
}

export default function StudentPortal({
  currentUser,
  courses,
  modules,
  lessons,
  apostilas,
  progress,
  onToggleComplete,
  onToggleFavorite,
  onSaveProgress,
  comments,
  onAddComment,
  certificates,
  onIssueCertificate,
  sales,
  supportTickets,
  onSubmitTicket
}: StudentPortalProps) {
  const [activeTab, setActiveTab] = useState<'my_products' | 'my_certificates' | 'my_receipts'>('my_products');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedApostila, setSelectedApostila] = useState<Apostila | null>(null);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  
  // Lesson view sub-tabs: 'content', 'quiz', 'ai_tutor', 'discussion', 'practical_work'
  const [lessonSubTab, setLessonSubTab] = useState<'content' | 'quiz' | 'ai_tutor' | 'discussion' | 'practical_work'>('content');

  // Practical Work submission states
  const [practicalQuery, setPracticalQuery] = useState('');
  const [practicalImage, setPracticalImage] = useState('');
  const [isUploadingPractical, setIsUploadingPractical] = useState(false);
  const [practicalSuccessMsg, setPracticalSuccessMsg] = useState('');

  // AI Tutor States
  const [aiQuery, setAiQuery] = useState('');
  const [aiChatHistory, setAiChatHistory] = useState<{ role: 'user' | 'model'; text: string }[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  // Extended AI Feature States
  const [aiSummary, setAiSummary] = useState('');
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  
  const [aiExercises, setAiExercises] = useState('');
  const [aiExercisesLoading, setAiExercisesLoading] = useState(false);
  
  const [aiMaterial, setAiMaterial] = useState('');
  const [aiMaterialLoading, setAiMaterialLoading] = useState(false);
  
  const [aiCorrectionQuestion, setAiCorrectionQuestion] = useState('Como realizar o corte a favor das fibras da madeira com segurança?');
  const [aiCorrectionInput, setAiCorrectionInput] = useState('');
  const [aiCorrection, setAiCorrection] = useState('');
  const [aiCorrectionLoading, setAiCorrectionLoading] = useState(false);
  
  const [aiCustomQuiz, setAiCustomQuiz] = useState<any>(null);
  const [aiCustomQuizLoading, setAiCustomQuizLoading] = useState(false);
  const [aiCustomQuizSelected, setAiCustomQuizSelected] = useState<number | null>(null);
  const [aiCustomQuizChecked, setAiCustomQuizChecked] = useState(false);
  const [aiCustomQuizIsCorrect, setAiCustomQuizIsCorrect] = useState<boolean | null>(null);

  // Comments / Support Section States
  const [newComment, setNewComment] = useState('');
  const [activeReplyBox, setActiveReplyBox] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // Ebook Reader States
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [watermarkPos, setWatermarkPos] = useState({ top: 20, left: 10 });

  // Certificate Verification state
  const [certificateToVerify, setCertificateToVerify] = useState('');
  const [verificationResult, setVerificationResult] = useState<any>(null);

  // Quiz submission states
  const [selectedAnswers, setSelectedAnswers] = useState<{ [quizId: string]: number }>({});
  const [quizResults, setQuizResults] = useState<{ [quizId: string]: boolean }>({});

  // Player control states
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const autoplayTimeoutRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPiP, setIsPiP] = useState(false);
  
  // Custom toast/notification for resume prompt or auto next
  const [toastMessage, setToastMessage] = useState<{ text: string; actionText?: string; onAction?: () => void } | null>(null);
  
  // Session tracking
  const [sessionWatchTime, setSessionWatchTime] = useState(0);

  const purchasedCourseIds = currentUser.purchasedProducts.filter(id => id.startsWith('course'));
  const purchasedApostilaIds = currentUser.purchasedProducts.filter(id => id.startsWith('ebook'));

  const myCourses = courses.filter(c => currentUser.purchasedProducts.includes(c.id));
  const myApostilas = apostilas.filter(a => currentUser.purchasedProducts.includes(a.id));

  const saveStudentProgress = async (lessonId: string, courseId: string, data: Partial<StudentProgress>) => {
    if (onSaveProgress) {
      await onSaveProgress(lessonId, courseId, data);
    } else {
      try {
        await fetch('/api/v1/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: currentUser.id,
            lessonId,
            courseId,
            ...data
          })
        });
      } catch (err) {
        console.error('Error saving progress:', err);
      }
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    const mStr = m.toString().padStart(2, '0');
    const sStr = s.toString().padStart(2, '0');
    if (h > 0) {
      return `${h}:${mStr}:${sStr}`;
    }
    return `${mStr}:${sStr}`;
  };

  // Setup lesson access, history tracking, auto-resume position
  useEffect(() => {
    if (autoplayTimeoutRef.current) {
      clearTimeout(autoplayTimeoutRef.current);
      autoplayTimeoutRef.current = null;
    }

    if (currentLesson && selectedCourse) {
      // Save lastAccessed to record history
      saveStudentProgress(currentLesson.id, selectedCourse.id, {
        lastAccessed: new Date().toISOString()
      });
      
      // Auto-resume checking
      const currentProg = progress.find(p => p.studentId === currentUser.id && p.lessonId === currentLesson.id);
      if (currentProg && currentProg.lastPosition && currentProg.lastPosition > 2) {
        const pos = currentProg.lastPosition;
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.currentTime = pos;
            setToastMessage({
              text: `Vídeo retomado de ${formatTime(pos)} de onde você parou!`,
              actionText: "Recomeçar do Início",
              onAction: () => {
                if (videoRef.current) {
                  videoRef.current.currentTime = 0;
                  setToastMessage(null);
                }
              }
            });
            setTimeout(() => {
              setToastMessage(null);
            }, 5000);
          }
        }, 300);
      } else {
        setToastMessage(null);
      }
    }
    
    setIsPlaying(false);
    setCurrentTime(0);
    setPlaybackSpeed(1);
    setSessionWatchTime(0);

    return () => {
      if (autoplayTimeoutRef.current) {
        clearTimeout(autoplayTimeoutRef.current);
        autoplayTimeoutRef.current = null;
      }
    };
  }, [currentLesson?.id]);

  // Periodic watch time tracking & position syncing
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPlaying && currentLesson && selectedCourse) {
      interval = setInterval(() => {
        setSessionWatchTime(prev => {
          const newWatchTime = prev + 1;
          const currentProg = progress.find(p => p.studentId === currentUser.id && p.lessonId === currentLesson.id);
          const accumulatedWatchTime = (currentProg?.watchTime || 0) + 1;
          
          if (newWatchTime % 5 === 0 && videoRef.current) {
            saveStudentProgress(currentLesson.id, selectedCourse.id, {
              lastPosition: videoRef.current.currentTime,
              watchTime: accumulatedWatchTime
            });
          }
          return newWatchTime;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, currentLesson?.id, selectedCourse?.id]);

  const handlePauseOrUnload = () => {
    if (videoRef.current && currentLesson && selectedCourse) {
      const currentProg = progress.find(p => p.studentId === currentUser.id && p.lessonId === currentLesson.id);
      const accumulatedWatchTime = (currentProg?.watchTime || 0) + sessionWatchTime;
      saveStudentProgress(currentLesson.id, selectedCourse.id, {
        lastPosition: videoRef.current.currentTime,
        watchTime: accumulatedWatchTime
      });
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        handlePauseOrUnload();
        setIsPlaying(false);
      } else {
        videoRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch(err => console.log('Playback error:', err));
      }
    }
  };

  const handleTimelineChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const nextMute = !isMuted;
      setIsMuted(nextMute);
      videoRef.current.muted = nextMute;
      if (!nextMute && volume === 0) {
        setVolume(0.5);
        videoRef.current.volume = 0.5;
      }
    }
  };

  const changeSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(err => console.error(err));
    } else {
      document.exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch(err => console.error(err));
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const togglePiP = () => {
    if (videoRef.current) {
      if (document.pictureInPictureElement) {
        document.exitPictureInPicture()
          .then(() => setIsPiP(false))
          .catch(err => console.error(err));
      } else {
        videoRef.current.requestPictureInPicture()
          .then(() => setIsPiP(true))
          .catch(err => console.error(err));
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      const dur = videoRef.current.duration;
      setCurrentTime(current);
      if (dur && dur > 0) {
        setDuration(dur);
        // Auto complete progress at 90%
        if (current / dur >= 0.90 && !isLessonCompleted(currentLesson!.id)) {
          onToggleComplete(currentLesson!.id, selectedCourse!.id, true);
        }
      }
    }
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    if (currentLesson && selectedCourse) {
      onToggleComplete(currentLesson.id, selectedCourse.id, true);
      
      const courseLessons = lessons.filter(l => l.courseId === selectedCourse.id).sort((a,b) => a.order - b.order);
      const currentIndex = courseLessons.findIndex(l => l.id === currentLesson.id);
      if (currentIndex !== -1 && currentIndex + 1 < courseLessons.length) {
        if (autoplayTimeoutRef.current) {
          clearTimeout(autoplayTimeoutRef.current);
        }

        setToastMessage({
          text: "Aula concluída! Iniciando próxima aula em 3 segundos...",
          actionText: "Cancelar Autoplay",
          onAction: () => {
            if (autoplayTimeoutRef.current) {
              clearTimeout(autoplayTimeoutRef.current);
              autoplayTimeoutRef.current = null;
            }
            setToastMessage(null);
          }
        });
        
        autoplayTimeoutRef.current = setTimeout(() => {
          setCurrentLesson(courseLessons[currentIndex + 1]);
          setLessonSubTab('content');
          setAiChatHistory([]);
          setToastMessage(null);
          autoplayTimeoutRef.current = null;
        }, 3000);
      } else {
        setToastMessage({
          text: "Parabéns! Você concluiu a última aula deste curso!",
        });
        setTimeout(() => setToastMessage(null), 5000);
      }
    }
  };

  // Autoplay / Auto-continue lessons trigger
  const handleCompleteAndNext = (lesson: Lesson, courseId: string) => {
    const isCompleted = isLessonCompleted(lesson.id);
    onToggleComplete(lesson.id, courseId, !isCompleted);

    // Find next lesson to autoplay
    if (!isCompleted) {
      const courseLessons = lessons.filter(l => l.courseId === courseId).sort((a,b) => a.order - b.order);
      const currentIndex = courseLessons.findIndex(l => l.id === lesson.id);
      if (currentIndex !== -1 && currentIndex + 1 < courseLessons.length) {
        setTimeout(() => {
          setCurrentLesson(courseLessons[currentIndex + 1]);
          setLessonSubTab('content');
          setAiChatHistory([]);
        }, 1000);
      }
    }
  };

  // Helper selectors
  const isLessonCompleted = (lessonId: string) => {
    return progress.some(p => p.studentId === currentUser.id && p.lessonId === lessonId && p.completed);
  };

  const isLessonLocked = (lessonId: string, courseId: string) => {
    const courseLessons = lessons.filter(l => l.courseId === courseId).sort((a,b) => a.order - b.order);
    const idx = courseLessons.findIndex(l => l.id === lessonId);
    if (idx <= 0) return false;
    const prev = courseLessons[idx - 1];
    return !isLessonCompleted(prev.id);
  };

  const isLessonFavorited = (lessonId: string) => {
    return progress.some(p => p.studentId === currentUser.id && p.lessonId === lessonId && p.favorited);
  };

  const getCourseCompletionPercentage = (courseId: string) => {
    const courseLessons = lessons.filter(l => l.courseId === courseId);
    if (courseLessons.length === 0) return 0;
    const completedCount = courseLessons.filter(l => isLessonCompleted(l.id)).length;
    return Math.round((completedCount / courseLessons.length) * 100);
  };

  // Move watermark around randomly in Protected ebook viewer to prevent screenshots
  useEffect(() => {
    if (selectedApostila) {
      const interval = setInterval(() => {
        const top = Math.floor(Math.random() * 80) + 5; // percentage
        const left = Math.floor(Math.random() * 70) + 5; // percentage
        setWatermarkPos({ top, left });
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedApostila]);

  // Handle AI Tutor questions
  const askAiTutor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuery.trim() || !currentLesson) return;

    const userQuery = aiQuery;
    setAiQuery('');
    setAiChatHistory(prev => [...prev, { role: 'user', text: userQuery }]);
    setAiLoading(true);

    try {
      const res = await fetch('/api/v1/gemini/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonTitle: currentLesson.title,
          lessonText: currentLesson.textContent || '',
          query: userQuery
        })
      });
      const data = await res.json();
      setAiChatHistory(prev => [...prev, { role: 'model', text: data.answer }]);
    } catch (err) {
      console.error('Erro no Tutor de IA:', err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!currentLesson) return;
    setAiSummaryLoading(true);
    try {
      const res = await fetch('/api/v1/gemini/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonTitle: currentLesson.title,
          lessonText: currentLesson.textContent || ''
        })
      });
      const data = await res.json();
      setAiSummary(data.summary || '');
    } catch (err) {
      console.error('Erro ao gerar resumo de IA:', err);
    } finally {
      setAiSummaryLoading(false);
    }
  };

  const handleSuggestExercises = async () => {
    if (!currentLesson) return;
    setAiExercisesLoading(true);
    try {
      const res = await fetch('/api/v1/gemini/exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonTitle: currentLesson.title,
          lessonText: currentLesson.textContent || ''
        })
      });
      const data = await res.json();
      setAiExercises(data.exercises || '');
    } catch (err) {
      console.error('Erro ao sugerir exercícios de IA:', err);
    } finally {
      setAiExercisesLoading(false);
    }
  };

  const handleGenerateMaterial = async () => {
    if (!currentLesson) return;
    setAiMaterialLoading(true);
    try {
      const res = await fetch('/api/v1/gemini/material', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonTitle: currentLesson.title,
          lessonText: currentLesson.textContent || ''
        })
      });
      const data = await res.json();
      setAiMaterial(data.material || '');
    } catch (err) {
      console.error('Erro ao gerar material de IA:', err);
    } finally {
      setAiMaterialLoading(false);
    }
  };

  const handleRequestCorrection = async () => {
    if (!currentLesson || !aiCorrectionInput.trim()) return;
    setAiCorrectionLoading(true);
    try {
      const res = await fetch('/api/v1/gemini/correction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonTitle: currentLesson.title,
          lessonText: currentLesson.textContent || '',
          question: aiCorrectionQuestion,
          userAnswer: aiCorrectionInput
        })
      });
      const data = await res.json();
      setAiCorrection(data.correction || '');
    } catch (err) {
      console.error('Erro ao corrigir resposta de IA:', err);
    } finally {
      setAiCorrectionLoading(false);
    }
  };

  const handleGenerateCustomQuiz = async () => {
    if (!currentLesson) return;
    setAiCustomQuizLoading(true);
    setAiCustomQuizSelected(null);
    setAiCustomQuizChecked(false);
    setAiCustomQuizIsCorrect(null);
    try {
      const res = await fetch('/api/v1/gemini/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonTitle: currentLesson.title,
          lessonDescription: currentLesson.description,
          lessonText: currentLesson.textContent || ''
        })
      });
      const data = await res.json();
      if (data.questions && data.questions.length > 0) {
        setAiCustomQuiz(data.questions[0]);
      }
    } catch (err) {
      console.error('Erro ao gerar quiz personalizado de IA:', err);
    } finally {
      setAiCustomQuizLoading(false);
    }
  };

  // Post Lesson Comment
  const handlePostComment = (parentCommentId: string | null = null) => {
    const text = parentCommentId ? replyText : newComment;
    if (!text.trim() || !currentLesson) return;

    const payload = {
      lessonId: currentLesson.id,
      courseId: currentLesson.courseId,
      userName: currentUser.name,
      userEmail: currentUser.email,
      userRole: currentUser.role,
      comment: text,
      parentCommentId
    };

    onAddComment(payload);

    if (parentCommentId) {
      setReplyText('');
      setActiveReplyBox(null);
    } else {
      setNewComment('');
    }
  };

  // Issue Cert
  const handleIssueCert = (course: Course) => {
    onIssueCertificate({
      studentId: currentUser.id,
      studentName: currentUser.name,
      courseId: course.id,
      courseTitle: course.title
    });
  };

  // Verify code
  const verifyCertificateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!certificateToVerify.trim()) return;

    try {
      const res = await fetch(`/api/v1/certificates/validate/${certificateToVerify.trim()}`);
      const data = await res.json();
      setVerificationResult(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectAnswer = (questionId: string, index: number) => {
    setSelectedAnswers({ ...selectedAnswers, [questionId]: index });
  };

  const handleCheckQuiz = (questionId: string, correctAnswerIndex: number) => {
    const selected = selectedAnswers[questionId];
    setQuizResults({
      ...quizResults,
      [questionId]: selected === correctAnswerIndex
    });
  };

  // 1. MAIN PORTAL LIBRARY RENDER
  if (!selectedCourse && !selectedApostila) {
    return (
      <div className="space-y-8" id="student-portal-library">
        {/* Navigation sub-tabs */}
        <div className="flex border-b border-brand-wood/10 gap-6">
          <button
            onClick={() => { setActiveTab('my_products'); setVerificationResult(null); }}
            className={`pb-3 text-xs uppercase tracking-widest font-sans font-bold transition-all relative ${
              activeTab === 'my_products' ? 'text-brand-wood' : 'text-brand-clay hover:text-brand-wood'
            }`}
          >
            Minha Biblioteca
            {activeTab === 'my_products' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-wood" />}
          </button>
          <button
            onClick={() => { setActiveTab('my_certificates'); setVerificationResult(null); }}
            className={`pb-3 text-xs uppercase tracking-widest font-sans font-bold transition-all relative ${
              activeTab === 'my_certificates' ? 'text-brand-wood' : 'text-brand-clay hover:text-brand-wood'
            }`}
          >
            Meus Certificados
            {activeTab === 'my_certificates' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-wood" />}
          </button>
          <button
            onClick={() => { setActiveTab('my_receipts'); setVerificationResult(null); }}
            className={`pb-3 text-xs uppercase tracking-widest font-sans font-bold transition-all relative ${
              activeTab === 'my_receipts' ? 'text-brand-wood' : 'text-brand-clay hover:text-brand-wood'
            }`}
          >
            Histórico de Compras
            {activeTab === 'my_receipts' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-wood" />}
          </button>
        </div>

        {activeTab === 'my_products' && (
          <div className="space-y-12">
            {/* Top dashboard quick resume section (Favorites and History) */}
            {(() => {
              // 1. Favorites
              const favoriteProgressList = progress.filter(p => p.studentId === currentUser.id && p.favorited);
              const favoriteLessons = lessons.filter(l => favoriteProgressList.some(f => f.lessonId === l.id));

              // 2. Recently Accessed History
              const historyProgressList = progress
                .filter(p => p.studentId === currentUser.id && p.lastAccessed)
                .sort((a, b) => new Date(b.lastAccessed!).getTime() - new Date(a.lastAccessed!).getTime())
                .slice(0, 4);

              const historyItems = historyProgressList.map(hp => {
                const lesson = lessons.find(l => l.id === hp.lessonId);
                const course = courses.find(c => c.id === hp.courseId);
                return { lesson, course, progress: hp };
              }).filter(item => item.lesson && item.course) as { lesson: Lesson; course: Course; progress: StudentProgress }[];

              if (favoriteLessons.length === 0 && historyItems.length === 0) return null;

              return (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 border-b border-brand-wood/10 pb-8" id="quick-resume-dashboard">
                  {/* History section */}
                  {historyItems.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-xs font-sans font-bold text-brand-wood uppercase tracking-widest flex items-center gap-2">
                        <History className="w-4 h-4 text-brand-clay" /> Histórico de Aulas Recentes
                      </h3>
                      <div className="space-y-3">
                        {historyItems.map(({ lesson, course, progress: hp }) => {
                          const hasLastPos = hp.lastPosition && hp.lastPosition > 0;
                          return (
                            <div 
                              key={lesson.id}
                              className="bg-white border border-brand-wood/10 rounded-2xl p-4 flex justify-between items-center hover:shadow-md transition-all gap-4"
                            >
                              <div className="space-y-1">
                                <span className="text-[9px] bg-brand-clay/10 text-brand-clay font-sans font-bold px-2 py-0.5 rounded-full uppercase">
                                  {course.title}
                                </span>
                                <h4 className="font-serif font-bold text-brand-ink text-xs leading-tight">{lesson.title}</h4>
                                {hasLastPos && (
                                  <p className="text-[10px] text-brand-clay font-mono">
                                    Retomar em: {formatTime(hp.lastPosition!)}
                                  </p>
                                )}
                              </div>
                              <button
                                onClick={() => {
                                  setSelectedCourse(course);
                                  setCurrentLesson(lesson);
                                }}
                                className="bg-brand-paper hover:bg-brand-wood hover:text-[#FDFCFB] text-brand-wood font-sans font-bold text-[9px] uppercase tracking-widest px-4 py-2 rounded-full border border-brand-wood/15 transition-all shadow-sm flex items-center gap-1 flex-shrink-0 cursor-pointer"
                              >
                                <Play className="w-2.5 h-2.5 fill-current" /> Retomar
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Favorites section */}
                  {favoriteLessons.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-xs font-sans font-bold text-brand-wood uppercase tracking-widest flex items-center gap-2">
                        <BookmarkCheck className="w-4 h-4 text-brand-clay" /> Minhas Aulas Favoritas
                      </h3>
                      <div className="space-y-3">
                        {favoriteLessons.slice(0, 4).map(lesson => {
                          const course = courses.find(c => c.id === lesson.courseId);
                          if (!course) return null;
                          return (
                            <div 
                              key={lesson.id}
                              className="bg-white border border-brand-wood/10 rounded-2xl p-4 flex justify-between items-center hover:shadow-md transition-all gap-4"
                            >
                              <div className="space-y-1">
                                <span className="text-[9px] bg-brand-clay/10 text-brand-clay font-sans font-bold px-2 py-0.5 rounded-full uppercase">
                                  {course.title}
                                </span>
                                <h4 className="font-serif font-bold text-brand-ink text-xs leading-tight">{lesson.title}</h4>
                              </div>
                              <button
                                onClick={() => {
                                  setSelectedCourse(course);
                                  setCurrentLesson(lesson);
                                }}
                                className="bg-brand-wood hover:bg-brand-clay text-[#FDFCFB] font-sans font-bold text-[9px] uppercase tracking-widest px-4 py-2 rounded-full transition-all shadow-md flex items-center gap-1 flex-shrink-0 cursor-pointer"
                              >
                                <Play className="w-2.5 h-2.5 fill-white" /> Estudar
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

              {/* Courses section */}
            <div className="space-y-6">
              <h2 className="text-xl font-serif font-bold text-brand-ink flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-brand-wood" /> Cursos Online Adquiridos
              </h2>

              {myCourses.length === 0 ? (
                <div className="p-8 bg-brand-paper rounded-3xl border border-brand-wood/10 text-center text-brand-clay font-sans text-sm">
                  Você ainda não adquiriu nenhum curso. Navegue no catálogo para começar!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {myCourses.map(course => {
                    const pct = getCourseCompletionPercentage(course.id);
                    return (
                      <div 
                        key={course.id}
                        className="bg-white border border-brand-wood/5 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                      >
                        <div className="flex gap-4">
                          <img 
                            src={getDirectDriveUrl(course.coverUrl)} 
                            alt={course.title}
                            referrerPolicy="no-referrer"
                            className="w-16 h-16 object-cover rounded-2xl border border-brand-wood/5 flex-shrink-0"
                          />
                          <div className="space-y-1">
                            <span className="text-[9px] bg-brand-wood/10 text-brand-wood font-sans font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                              Acesso Vitalício
                            </span>
                            <h3 className="font-serif font-bold text-brand-ink text-base line-clamp-1">
                              {course.title}
                            </h3>
                            <p className="text-xs text-brand-clay line-clamp-2">{course.description}</p>
                          </div>
                        </div>

                        {/* Progress */}
                        <div className="space-y-1.5 pt-2">
                          <div className="flex justify-between text-xs font-semibold text-brand-clay">
                            <span>Progresso Teórico-Prático</span>
                            <span>{pct}% Concluído</span>
                          </div>
                          <div className="w-full bg-brand-paper rounded-full h-2 overflow-hidden border border-brand-wood/15">
                            <div className="bg-brand-wood h-full transition-all duration-500" style={{ width: `${pct}%` }} />
                          </div>
                        </div>

                        <div className="flex justify-between items-center gap-2 pt-3 border-t border-brand-wood/5">
                          {pct === 100 ? (
                            <span className="text-brand-wood font-bold text-xs flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4 text-brand-wood" /> Concluído!
                            </span>
                          ) : (
                            <span className="text-brand-clay font-medium text-xs">
                              {lessons.filter(l => l.courseId === course.id && isLessonCompleted(l.id)).length} de {lessons.filter(l => l.courseId === course.id).length} aulas
                            </span>
                          )}
                          <button
                            onClick={() => {
                              setSelectedCourse(course);
                              const courseLessons = lessons.filter(l => l.courseId === course.id).sort((a,b) => a.order - b.order);
                              
                              // Find the last accessed lesson or first incomplete lesson
                              const lastAccessedProgress = progress
                                .filter(p => p.studentId === currentUser.id && p.courseId === course.id && p.lastAccessed)
                                .sort((a, b) => new Date(b.lastAccessed!).getTime() - new Date(a.lastAccessed!).getTime())[0];

                              let targetLesson = courseLessons[0];
                              if (lastAccessedProgress) {
                                const matchingLesson = courseLessons.find(l => l.id === lastAccessedProgress.lessonId);
                                if (matchingLesson) {
                                  targetLesson = matchingLesson;
                                }
                              } else {
                                const firstIncomplete = courseLessons.find(l => !isLessonCompleted(l.id));
                                if (firstIncomplete) {
                                  targetLesson = firstIncomplete;
                                }
                              }
                              if (targetLesson) {
                                setCurrentLesson(targetLesson);
                              }
                            }}
                            className="bg-brand-wood hover:bg-brand-clay text-[#FDFCFB] font-sans font-medium text-[10px] uppercase tracking-widest px-4 py-2 rounded-full shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <Play className="w-3 h-3 fill-white" /> Estudar Agora
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Apostilas section */}
            <div className="space-y-6">
              <h2 className="text-xl font-serif font-bold text-brand-ink flex items-center gap-2">
                <FileText className="w-5 h-5 text-brand-wood" /> Apostilas Digitais & Manuais Técnicos
              </h2>

              {myApostilas.length === 0 ? (
                <div className="p-8 bg-brand-paper rounded-3xl border border-brand-wood/10 text-center text-brand-clay font-sans text-sm">
                  Você não adquiriu nenhuma apostila digital protegida ainda.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {myApostilas.map(book => (
                    <div 
                      key={book.id}
                      className="bg-white border border-brand-wood/5 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex justify-between items-center"
                    >
                      <div className="flex gap-4 items-center">
                        <img 
                          src={getDirectDriveUrl(book.coverUrl)} 
                          alt={book.title}
                          referrerPolicy="no-referrer"
                          className="w-12 h-16 object-cover rounded-xl border border-brand-wood/10 flex-shrink-0"
                        />
                        <div className="space-y-1">
                          <h3 className="font-serif font-bold text-brand-ink text-sm line-clamp-1">{book.title}</h3>
                          <p className="text-xs text-brand-clay">{book.chapters.length} Capítulos Escritos</p>
                          <span className="text-[8px] tracking-wider inline-flex items-center gap-1 text-brand-wood font-bold bg-brand-clay/10 px-2 py-0.5 rounded-full uppercase">
                            Leitura Protegida
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedApostila(book);
                          setActiveChapterIndex(0);
                        }}
                        className="bg-brand-wood hover:bg-brand-clay text-[#FDFCFB] font-sans font-medium text-[10px] uppercase tracking-widest px-4 py-2.5 rounded-full transition-all shadow-md flex items-center gap-1.5"
                      >
                        <BookOpen className="w-3.5 h-3.5" /> Abrir Leitor
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'my_certificates' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* List and creation of certificates */}
            <div className="lg:col-span-7 space-y-4">
              <h2 className="text-xl font-serif font-bold text-brand-ink">Emissão de Certificados</h2>
              <p className="text-xs text-brand-clay font-sans">Conclua 100% das aulas práticas de qualquer treinamento para obter seu certificado assinado pelo mestre-escultor.</p>

              {myCourses.length === 0 ? (
                <div className="p-8 bg-brand-paper rounded-3xl border border-brand-wood/10 text-center text-brand-clay text-sm">Sem cursos vinculados.</div>
              ) : (
                <div className="space-y-4">
                  {myCourses.map(course => {
                    const pct = getCourseCompletionPercentage(course.id);
                    const issued = certificates.find(c => c.courseId === course.id);

                    return (
                      <div key={course.id} className="bg-white border border-brand-wood/10 p-5 rounded-3xl flex justify-between items-center shadow-sm">
                        <div className="space-y-1">
                          <h4 className="font-serif font-bold text-brand-ink text-sm">{course.title}</h4>
                          <span className="text-xs text-brand-clay">Progresso: {pct}%</span>
                        </div>

                        {issued ? (
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-[10px] uppercase bg-brand-wood/10 text-brand-wood border border-brand-wood/20 font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                              <Award className="w-3.5 h-3.5" /> Emitido
                            </span>
                            <span className="text-[9px] font-mono text-brand-clay">Cod: {issued.validationCode}</span>
                          </div>
                        ) : pct === 100 ? (
                          <button
                            onClick={() => handleIssueCert(course)}
                            className="bg-brand-wood hover:bg-brand-clay text-white text-[10px] uppercase tracking-widest font-bold px-4 py-2 rounded-full transition-all flex items-center gap-1.5"
                          >
                            <Award className="w-4 h-4" /> Emitir Certificado
                          </button>
                        ) : (
                          <span className="text-[10px] text-brand-clay font-sans italic bg-brand-paper px-3 py-1.5 rounded-full border border-brand-wood/5">
                            Requer 100%
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Validation Panel */}
            <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-brand-wood/10 shadow-sm space-y-4">
              <h3 className="text-base font-serif font-bold text-brand-ink">Validar Certificado</h3>
              <p className="text-xs text-brand-clay leading-relaxed">Qualquer instituição ou cliente interessado pode checar a legitimidade técnica de seu portfólio através do código identificador único.</p>

              <form onSubmit={verifyCertificateCode} className="space-y-3">
                <input 
                  type="text" 
                  placeholder="Código do Certificado (Ex: CERT-ESC-123456)" 
                  value={certificateToVerify}
                  onChange={e => setCertificateToVerify(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs rounded-full border border-brand-wood/20 font-mono uppercase focus:outline-none focus:ring-1 focus:ring-brand-wood/30 bg-brand-paper/50"
                />
                <button 
                  type="submit" 
                  className="w-full py-2.5 bg-brand-wood hover:bg-brand-clay text-white rounded-full text-xs font-bold uppercase tracking-widest font-sans"
                >
                  Verificar Autenticidade
                </button>
              </form>

              {verificationResult && (
                <div className={`p-4 rounded-2xl border text-xs ${
                  verificationResult.valid 
                    ? 'bg-brand-paper border-brand-wood/20 text-brand-ink' 
                    : 'bg-red-50 border-red-200 text-red-900'
                }`}>
                  {verificationResult.valid ? (
                    <div className="space-y-1 font-sans">
                      <p className="font-bold text-brand-wood flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-brand-wood" /> Certificado Autêntico!
                      </p>
                      <p className="pt-1.5 text-[11px] text-brand-clay"><strong>Aluno:</strong> {verificationResult.certificate.studentName}</p>
                      <p className="text-[11px] text-brand-clay"><strong>Curso:</strong> {verificationResult.certificate.courseTitle}</p>
                      <p className="text-[11px] text-brand-clay"><strong>Emissão:</strong> {new Date(verificationResult.certificate.issuedAt).toLocaleDateString()}</p>
                    </div>
                  ) : (
                    <p className="font-bold flex items-center gap-1">
                      Código de certificado inválido ou inexistente.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'my_receipts' && (
          <div className="bg-white rounded-3xl border border-brand-wood/10 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-brand-wood/5">
              <h3 className="font-serif font-bold text-brand-ink text-base">Histórico de Matrículas</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-sans">
                <thead>
                  <tr className="bg-brand-paper text-brand-clay uppercase font-bold tracking-wider text-[10px] border-b border-brand-wood/5">
                    <th className="p-4">Código / Data</th>
                    <th className="p-4">Produto Digital</th>
                    <th className="p-4">Método</th>
                    <th className="p-4">Valor Pago</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-wood/5">
                  {sales.filter(s => s.studentEmail === currentUser.email).map(sale => (
                    <tr key={sale.id} className="hover:bg-brand-paper/50">
                      <td className="p-4">
                        <span className="font-mono font-semibold block text-brand-ink">{sale.id}</span>
                        <span className="text-brand-clay text-[10px]">{new Date(sale.createdAt).toLocaleDateString()}</span>
                      </td>
                      <td className="p-4 font-serif font-semibold text-brand-ink">{sale.productTitle}</td>
                      <td className="p-4 font-semibold uppercase text-brand-clay">{sale.paymentMethod}</td>
                      <td className="p-4 font-bold text-brand-wood">R$ {sale.pricePaid},00</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                          sale.paymentStatus === 'approved' 
                            ? 'bg-brand-wood/10 text-brand-wood' 
                            : 'bg-brand-clay/10 text-brand-clay'
                        }`}>
                          {sale.paymentStatus === 'approved' ? 'Aprovado' : 'Aguardando'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {sales.filter(s => s.studentEmail === currentUser.email).length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-brand-clay">Nenhuma transação registrada nesta conta.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. COURSE VIEWER (LMS PLATFORM CLASSROOM)
  if (selectedCourse && currentLesson) {
    const courseLessons = lessons.filter(l => l.courseId === selectedCourse.id).sort((a,b) => a.order - b.order);
    const courseModules = modules.filter(m => m.courseId === selectedCourse.id).sort((a,b) => a.order - b.order);
    const completedPct = getCourseCompletionPercentage(selectedCourse.id);
    const currentIndex = courseLessons.findIndex(l => l.id === currentLesson.id);
    const prevLesson = currentIndex > 0 ? courseLessons[currentIndex - 1] : null;
    const nextLesson = currentIndex !== -1 && currentIndex + 1 < courseLessons.length ? courseLessons[currentIndex + 1] : null;

    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="course-classroom">
        {/* Left Lesson Accordion Sidebar */}
        <div className="lg:col-span-4 bg-white border border-brand-wood/10 rounded-3xl shadow-sm p-5 h-[calc(100vh-140px)] overflow-y-auto space-y-5">
          <div className="space-y-3.5 border-b border-brand-wood/5 pb-4">
            <button 
              onClick={() => { setSelectedCourse(null); setCurrentLesson(null); }}
              className="text-xs text-brand-wood hover:underline font-bold flex items-center gap-1 font-sans"
            >
              ← Biblioteca de Conteúdo
            </button>
            <h3 className="font-serif font-bold text-brand-ink text-base leading-snug">{selectedCourse.title}</h3>
            
            {/* Completion indicator */}
            <div className="space-y-1">
              <div className="flex justify-between text-[9px] font-bold text-brand-clay uppercase tracking-widest">
                <span>Progresso Próprio</span>
                <span>{completedPct}%</span>
              </div>
              <div className="w-full bg-brand-paper h-1.5 rounded-full overflow-hidden border border-brand-wood/10">
                <div className="bg-brand-wood h-full transition-all" style={{ width: `${completedPct}%` }} />
              </div>
            </div>
          </div>

          {/* Module Loop */}
          <div className="space-y-4">
            {courseModules.map((mod, modIdx) => {
              const modLessons = courseLessons.filter(l => l.moduleId === mod.id);
              return (
                <div key={mod.id} className="space-y-2">
                  <div className="bg-brand-paper px-3 py-2 rounded-2xl border border-brand-wood/5">
                    <span className="text-[9px] font-bold text-brand-clay block uppercase tracking-widest">Módulo {modIdx + 1}</span>
                    <h4 className="font-serif font-bold text-brand-ink text-xs leading-tight">{mod.title}</h4>
                  </div>

                  <div className="space-y-1.5 pl-1">
                    {modLessons.map(les => {
                      const active = les.id === currentLesson.id;
                      const completed = isLessonCompleted(les.id);
                      const locked = isLessonLocked(les.id, selectedCourse.id);
                      return (
                        <div 
                          key={les.id}
                          onClick={() => {
                            if (locked) {
                              setToastMessage({ 
                                text: `A aula "${les.title}" está bloqueada. Conclua as aulas anteriores primeiro para desbloquear automaticamente!` 
                              });
                              return;
                            }
                            setCurrentLesson(les);
                            setLessonSubTab('content');
                            setAiChatHistory([]);
                          }}
                          className={`flex items-center justify-between p-2.5 rounded-2xl text-xs transition-all border ${
                            locked 
                              ? 'bg-brand-paper/40 border-transparent text-brand-clay/40 cursor-not-allowed opacity-50'
                              : active 
                                ? 'bg-brand-paper border-brand-wood/20 text-brand-wood font-bold shadow-sm cursor-pointer' 
                                : 'bg-white border-transparent text-brand-clay hover:bg-brand-paper hover:text-brand-wood cursor-pointer'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            {locked ? (
                              <div className="w-5 h-5 rounded-full border border-brand-wood/10 flex items-center justify-center bg-brand-paper/50 text-brand-clay/40 flex-shrink-0">
                                <Lock className="w-2.5 h-2.5" />
                              </div>
                            ) : (
                              <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleComplete(les.id, selectedCourse.id, !completed);
                                }}
                                className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all flex-shrink-0 ${
                                  completed 
                                    ? 'bg-brand-wood border-brand-wood text-white' 
                                    : 'border-brand-wood/20 hover:border-brand-wood bg-white'
                                }`}
                              >
                                {completed && <span className="text-[9px]">✓</span>}
                              </button>
                            )}
                            <span className="truncate">{les.title}</span>
                          </div>

                          <div className="flex items-center gap-1 text-brand-clay text-[10px]">
                            {locked ? (
                              <span className="text-[8px] uppercase tracking-wider bg-brand-paper border border-brand-wood/10 px-1.5 py-0.5 rounded text-brand-clay/50 font-bold">Bloqueada</span>
                            ) : (
                              <>
                                {les.videoUrl && <Play className="w-2.5 h-2.5 fill-brand-clay/30" />}
                                <span>{les.duration || '10m'}</span>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Classroom Workspace */}
        <div className="lg:col-span-8 space-y-6">
              {/* Custom Video Player */}
              {currentLesson.videoUrl ? (
                <div 
                  ref={playerContainerRef} 
                  className="bg-[#0D0B0A] rounded-3xl overflow-hidden aspect-video border border-brand-wood/15 relative group shadow-2xl select-none"
                >
                  <video 
                    ref={videoRef}
                    src={currentLesson.videoUrl} 
                    className="w-full h-full object-contain"
                    poster={getDirectDriveUrl(selectedCourse.coverUrl)}
                    onTimeUpdate={handleTimeUpdate}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => { setIsPlaying(false); handlePauseOrUnload(); }}
                    onEnded={handleVideoEnded}
                    onClick={togglePlay}
                  />
                  
                  {/* Custom controls overlay panel */}
                  <div className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-black/50 flex flex-col justify-between p-5 transition-opacity duration-300 ${isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}>
                    {/* Top HUD */}
                    <div className="flex justify-between items-center">
                      <div className="bg-[#1A1A1A]/90 backdrop-blur-md px-3.5 py-1.5 rounded-full text-[9px] text-[#DFD3C3] font-sans font-bold uppercase tracking-widest flex items-center gap-1.5 border border-brand-wood/20 shadow-md">
                        <Sparkles className="w-3 h-3 text-brand-clay animate-pulse" /> Conexão Segura
                      </div>
                      
                      <span className="text-[10px] bg-brand-wood text-white font-sans font-bold px-2.5 py-1 rounded-full border border-white/10 shadow-sm">
                        {playbackSpeed}x
                      </span>
                    </div>

                    {/* Centered Large Play Button (when paused) */}
                    {!isPlaying && (
                      <button 
                        onClick={togglePlay} 
                        className="absolute inset-0 m-auto w-16 h-16 bg-brand-wood hover:bg-brand-clay text-[#FDFCFB] rounded-full flex items-center justify-center shadow-2xl transition-all scale-100 hover:scale-110 border border-white/10"
                      >
                        <Play className="w-6 h-6 fill-white ml-1" />
                      </button>
                    )}

                    {/* Bottom HUD Control Panel */}
                    <div className="space-y-4 pt-4">
                      {/* Seek Slider bar */}
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-[#DFD3C3] font-mono select-none">{formatTime(currentTime)}</span>
                        <input 
                          type="range" 
                          min={0} 
                          max={duration || 100} 
                          step={0.1}
                          value={currentTime} 
                          onChange={handleTimelineChange}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 accent-brand-clay bg-white/20 hover:bg-white/30 rounded-lg h-1.5 cursor-pointer appearance-none transition-all outline-none"
                        />
                        <span className="text-[10px] text-[#DFD3C3] font-mono select-none">{formatTime(duration)}</span>
                      </div>

                      {/* Control buttons group */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {/* Play/Pause */}
                          <button 
                            onClick={(e) => { e.stopPropagation(); togglePlay(); }} 
                            className="text-[#DFD3C3] hover:text-[#FDFCFB] transition-colors cursor-pointer" 
                            title={isPlaying ? "Pausar" : "Reproduzir"}
                          >
                            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                          </button>

                          {/* Skip backward 10s */}
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (videoRef.current) {
                                videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
                              }
                            }} 
                            className="text-[#DFD3C3] hover:text-[#FDFCFB] transition-colors cursor-pointer" 
                            title="Voltar 10 segundos"
                          >
                            <RotateCcw className="w-4.5 h-4.5" />
                          </button>

                          {/* Volume controls */}
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <button onClick={toggleMute} className="text-[#DFD3C3] hover:text-[#FDFCFB] transition-colors cursor-pointer">
                              {isMuted ? <VolumeX className="w-4.5 h-4.5" /> : <Volume2 className="w-4.5 h-4.5" />}
                            </button>
                            <input 
                              type="range" 
                              min={0} 
                              max={1} 
                              step={0.05}
                              value={isMuted ? 0 : volume}
                              onChange={handleVolumeChange}
                              className="w-16 accent-brand-clay bg-white/20 h-1 rounded cursor-pointer transition-all outline-none"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
                          {/* Speed dropdown Selector */}
                          <div className="relative group/speed">
                            <button className="text-[10px] font-bold text-[#DFD3C3] hover:text-[#FDFCFB] bg-white/10 hover:bg-white/20 border border-white/10 rounded-full px-3 py-1 tracking-wider uppercase transition-all">
                              Velocidade ({playbackSpeed}x)
                            </button>
                            <div className="absolute bottom-full right-0 mb-2 hidden group-hover/speed:flex flex-col bg-[#1A1A1A]/95 backdrop-blur-md rounded-xl border border-brand-wood/20 p-1 w-24 shadow-2xl z-50">
                              {[0.5, 1, 1.25, 1.5, 2].map(speed => (
                                <button 
                                  key={speed} 
                                  onClick={() => changeSpeed(speed)} 
                                  className={`text-[10px] font-sans font-bold py-1.5 px-2 rounded-lg text-left transition-colors ${playbackSpeed === speed ? 'bg-brand-wood text-white' : 'text-[#DFD3C3] hover:bg-white/10'}`}
                                >
                                  {speed}x
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Picture in Picture */}
                          <button onClick={togglePiP} className="text-[#DFD3C3] hover:text-[#FDFCFB] transition-colors cursor-pointer" title="Picture-in-Picture">
                            <ExternalLink className="w-4 h-4" />
                          </button>

                          {/* Fullscreen */}
                          <button onClick={toggleFullscreen} className="text-[#DFD3C3] hover:text-[#FDFCFB] transition-colors cursor-pointer" title="Tela Cheia">
                            {isFullscreen ? <Minimize className="w-4.5 h-4.5" /> : <Maximize className="w-4.5 h-4.5" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Float Toast messages overlay inside video player container */}
                  {toastMessage && (
                    <div className="absolute bottom-16 right-4 left-4 sm:left-auto sm:w-80 bg-brand-wood text-[#FDFCFB] p-3.5 rounded-2xl border border-brand-clay/30 flex flex-col gap-2 shadow-2xl z-50 animate-bounce">
                      <div className="text-[11px] font-sans font-medium leading-relaxed">
                        {toastMessage.text}
                      </div>
                      {toastMessage.actionText && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); toastMessage.onAction?.(); }}
                          className="self-end text-[9px] font-sans font-bold uppercase tracking-widest bg-brand-paper text-brand-wood px-3 py-1.5 rounded-full hover:bg-brand-clay hover:text-white transition-all shadow"
                        >
                          {toastMessage.actionText}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-gradient-to-br from-[#4A3222] to-[#2F1F15] text-[#DFD3C3] rounded-3xl p-8 text-center space-y-3.5 border border-brand-wood/20">
                  <FileText className="w-10 h-10 text-brand-clay mx-auto" />
                  <h4 className="font-serif font-bold text-lg">Suporte Teórico e Prático por Escrito</h4>
                  <p className="text-[#DFD3C3]/80 text-xs max-w-md mx-auto">Esta aula contém materiais detalhados, desenhos anatômicos e arquivos complementares logo abaixo para leitura offline.</p>
                </div>
              )}

              {/* Classroom Back/Forward Navigation Panel */}
              <div className="flex justify-between items-center bg-brand-paper/55 rounded-2xl p-3 border border-brand-wood/10 shadow-sm">
                <button
                  disabled={!prevLesson}
                  onClick={() => {
                    if (prevLesson) {
                      setCurrentLesson(prevLesson);
                      setLessonSubTab('content');
                      setAiChatHistory([]);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-sans font-bold uppercase tracking-widest transition-all ${
                    prevLesson 
                      ? 'bg-white hover:bg-brand-paper text-brand-clay border border-brand-wood/15 hover:text-brand-wood cursor-pointer shadow-sm' 
                      : 'text-brand-clay/30 bg-transparent border-transparent cursor-not-allowed opacity-40'
                  }`}
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Aula Anterior
                </button>

                <span className="text-[10px] font-mono text-brand-clay font-bold uppercase tracking-widest bg-brand-wood/5 px-3 py-1 rounded-full border border-brand-wood/5">
                  Aula {currentIndex + 1} de {courseLessons.length}
                </span>

                <button
                  disabled={!nextLesson || isLessonLocked(nextLesson.id, selectedCourse.id)}
                  onClick={() => {
                    if (nextLesson) {
                      setCurrentLesson(nextLesson);
                      setLessonSubTab('content');
                      setAiChatHistory([]);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-sans font-bold uppercase tracking-widest transition-all ${
                    nextLesson && !isLessonLocked(nextLesson.id, selectedCourse.id)
                      ? 'bg-brand-wood hover:bg-brand-clay text-white shadow-sm cursor-pointer' 
                      : 'text-brand-clay/30 bg-transparent border-transparent cursor-not-allowed opacity-40'
                  }`}
                >
                  Próxima Aula <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

          {/* Lesson Metadata Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-brand-wood/10 pb-4">
            <div>
              <h1 className="text-2xl font-serif font-bold text-brand-ink leading-tight">{currentLesson.title}</h1>
              <p className="text-xs text-brand-clay mt-1 font-sans">{currentLesson.description}</p>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              {/* Favorite toggle */}
              <button
                onClick={() => onToggleFavorite(currentLesson.id, selectedCourse.id, !isLessonFavorited(currentLesson.id))}
                className={`p-2.5 rounded-full border transition-all ${
                  isLessonFavorited(currentLesson.id)
                    ? 'bg-brand-paper border-brand-wood/20 text-brand-wood'
                    : 'bg-white border-brand-wood/10 text-brand-clay hover:text-brand-wood'
                }`}
                title="Favoritar aula"
              >
                {isLessonFavorited(currentLesson.id) ? (
                  <BookmarkCheck className="w-4.5 h-4.5" />
                ) : (
                  <Bookmark className="w-4.5 h-4.5" />
                )}
              </button>

              <button
                onClick={() => handleCompleteAndNext(currentLesson, selectedCourse.id)}
                className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full text-[10px] font-sans font-medium uppercase tracking-widest transition-all shadow-sm ${
                  isLessonCompleted(currentLesson.id)
                    ? 'bg-brand-clay/10 text-brand-wood border border-brand-clay/20'
                    : 'bg-brand-wood hover:bg-brand-clay text-white'
                }`}
              >
                {isLessonCompleted(currentLesson.id) ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-brand-wood" /> Concluída
                  </>
                ) : (
                  'Marcar como Concluída'
                )}
              </button>
            </div>
          </div>

          {/* Sub-tabs workspace selection */}
          <div className="flex border-b border-brand-wood/10 gap-6">
            <button
              onClick={() => setLessonSubTab('content')}
              className={`pb-2.5 text-xs font-bold uppercase tracking-widest transition-all relative ${
                lessonSubTab === 'content' ? 'text-brand-wood' : 'text-brand-clay hover:text-brand-wood'
              }`}
            >
              Material & Recursos
              {lessonSubTab === 'content' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-wood" />}
            </button>
            {currentLesson.quiz && currentLesson.quiz.length > 0 && (
              <button
                onClick={() => setLessonSubTab('quiz')}
                className={`pb-2.5 text-xs font-bold uppercase tracking-widest transition-all relative ${
                  lessonSubTab === 'quiz' ? 'text-brand-wood' : 'text-brand-clay hover:text-brand-wood'
                }`}
              >
                Atividades ({currentLesson.quiz.length})
                {lessonSubTab === 'quiz' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-wood" />}
              </button>
            )}
            <button
              onClick={() => setLessonSubTab('ai_tutor')}
              className={`pb-2.5 text-xs font-bold uppercase tracking-widest transition-all relative flex items-center gap-1.5 ${
                lessonSubTab === 'ai_tutor' ? 'text-brand-wood' : 'text-brand-clay hover:text-brand-wood'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-brand-wood fill-brand-clay/20" /> Mentor de IA
              {lessonSubTab === 'ai_tutor' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-wood" />}
            </button>
            <button
              onClick={() => setLessonSubTab('discussion')}
              className={`pb-2.5 text-xs font-bold uppercase tracking-widest transition-all relative ${
                lessonSubTab === 'discussion' ? 'text-brand-wood' : 'text-brand-clay hover:text-brand-wood'
              }`}
            >
              Mesa de Discussão ({comments.filter(c => c.lessonId === currentLesson.id).length})
              {lessonSubTab === 'discussion' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-wood" />}
            </button>
            <button
              onClick={() => setLessonSubTab('practical_work')}
              className={`pb-2.5 text-xs font-bold uppercase tracking-widest transition-all relative flex items-center gap-1.5 ${
                lessonSubTab === 'practical_work' ? 'text-brand-wood' : 'text-brand-clay hover:text-brand-wood'
              }`}
            >
              <Camera className="w-3.5 h-3.5" /> Exercícios Práticos ({supportTickets.filter(t => t.lessonId === currentLesson.id && t.type === 'practical_work').length})
              {lessonSubTab === 'practical_work' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-wood" />}
            </button>
          </div>

          {/* Sub-tab views render */}
          {lessonSubTab === 'content' && (
            <div className="space-y-6">
              {currentLesson.textContent && (
                <div className="markdown-body bg-brand-paper p-8 rounded-3xl border border-brand-wood/10 shadow-sm font-sans font-light">
                  <Markdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      img: ({ src, ...props }) => (
                        <img 
                          src={getDirectDriveUrl(src)} 
                          {...props} 
                          referrerPolicy="no-referrer" 
                          className="max-w-full my-4 rounded-2xl border border-brand-wood/10 shadow-sm mx-auto" 
                        />
                      )
                    }}
                  >
                    {cleanCitations(currentLesson.textContent)}
                  </Markdown>
                </div>
              )}

              {/* Attachments Section */}
              {((currentLesson.materials && currentLesson.materials.length > 0) || 
                (currentLesson.downloadFiles && currentLesson.downloadFiles.length > 0)) && (
                <div className="bg-brand-paper rounded-3xl p-6 border border-brand-wood/10 space-y-4">
                  <h4 className="text-[10px] font-bold text-brand-wood uppercase tracking-widest">Documentação Técnica & Projetos</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentLesson.materials?.map(mat => (
                      <div key={mat.id} className="bg-white p-4 rounded-2xl border border-brand-wood/5 flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="w-4 h-4 text-brand-wood" />
                          <span className="font-semibold text-brand-ink truncate">{mat.name}</span>
                          <span className="text-brand-clay font-mono text-[9px]">({mat.size})</span>
                        </div>
                        <a href={mat.url} target="_blank" rel="noreferrer" className="text-brand-wood hover:underline flex items-center gap-0.5 font-bold">
                          Acessar <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    ))}
                    {currentLesson.downloadFiles?.map(mat => (
                      <div key={mat.id} className="bg-white p-4 rounded-2xl border border-brand-wood/5 flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2 truncate">
                          <Download className="w-4 h-4 text-brand-clay" />
                          <span className="font-semibold text-brand-ink truncate">{mat.name}</span>
                          <span className="text-brand-clay font-mono text-[9px]">({mat.size})</span>
                        </div>
                        <a href={mat.url} download className="text-brand-wood hover:underline flex items-center gap-0.5 font-bold">
                          Download <Download className="w-3 h-3" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {lessonSubTab === 'quiz' && currentLesson.quiz && (
            <div className="bg-white p-6 rounded-3xl border border-brand-wood/10 shadow-sm space-y-6">
              <h3 className="font-serif font-bold text-brand-ink text-sm">Exercício de Fixação do Módulo</h3>

              {currentLesson.quiz.map((q, idx) => {
                const selected = selectedAnswers[q.id];
                const checked = quizResults[q.id] !== undefined;
                const isCorrect = quizResults[q.id];

                return (
                  <div key={q.id} className="space-y-4">
                    <p className="text-[10px] font-bold text-brand-clay uppercase tracking-widest">Desafio Técnico {idx + 1}</p>
                    <p className="text-sm font-serif font-bold text-brand-ink">{q.question}</p>

                    <div className="space-y-2">
                      {q.options.map((opt, i) => {
                        const isSelected = selected === i;
                        return (
                          <div
                            key={i}
                            onClick={() => !checked && handleSelectAnswer(q.id, i)}
                            className={`p-3.5 rounded-2xl text-xs border cursor-pointer transition-all flex items-center justify-between ${
                              checked 
                                ? i === q.correctAnswerIndex
                                  ? 'bg-brand-paper border-brand-wood/40 text-brand-wood font-bold'
                                  : isSelected
                                    ? 'bg-red-50 border-red-200 text-red-900'
                                    : 'bg-white border-brand-wood/5 text-brand-clay/50'
                                : isSelected
                                  ? 'border-brand-wood bg-brand-paper text-brand-wood font-bold'
                                  : 'border-brand-wood/10 text-brand-clay hover:bg-brand-paper'
                            }`}
                          >
                            <span>{opt}</span>
                            {checked && i === q.correctAnswerIndex && <span className="text-brand-wood font-bold">Correto</span>}
                          </div>
                        );
                      })}
                    </div>

                    {!checked ? (
                      <button
                        onClick={() => selected !== undefined && handleCheckQuiz(q.id, q.correctAnswerIndex)}
                        disabled={selected === undefined}
                        className="bg-brand-wood hover:bg-brand-clay text-[#FDFCFB] font-bold text-[10px] uppercase tracking-widest px-4 py-2.5 rounded-full transition-all disabled:opacity-40"
                      >
                        Validar Resposta
                      </button>
                    ) : (
                      <div className={`p-4 rounded-2xl border flex justify-between items-center text-xs ${
                        isCorrect ? 'bg-brand-paper border-brand-wood/20 text-brand-ink font-bold' : 'bg-red-50 border-red-200 text-red-900'
                      }`}>
                        <span>{isCorrect ? 'Excelente! Resposta perfeitamente exata.' : 'Alternativa equivocada. Revise a aula e tente novamente.'}</span>
                        <button
                          onClick={() => {
                            const newSelected = { ...selectedAnswers };
                            delete newSelected[q.id];
                            const newResults = { ...quizResults };
                            delete newResults[q.id];
                            setSelectedAnswers(newSelected);
                            setQuizResults(newResults);
                          }}
                          className="text-brand-wood font-bold hover:underline"
                        >
                          Tentar Novamente
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {lessonSubTab === 'ai_tutor' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-auto lg:h-[650px]" id="student-ai-studio">
              {/* Left Column: AI Studio Tools Panel */}
              <div className="lg:col-span-7 bg-brand-paper/40 p-5 rounded-3xl border border-brand-wood/10 overflow-y-auto space-y-6 flex flex-col h-[650px] shadow-inner">
                <div>
                  <h3 className="font-serif font-bold text-brand-ink text-base flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-brand-wood animate-pulse" /> Estúdio de Aprendizado IA
                  </h3>
                  <p className="text-[11px] text-brand-clay font-sans mt-1">
                    Ferramentas cognitivas do mestre Andrew Lemos integradas com a inteligência do Gemini.
                  </p>
                </div>

                {/* Sub-section 1: Generative Learning Resources */}
                <div className="space-y-3 bg-white p-4 rounded-2xl border border-brand-wood/5 shadow-sm">
                  <h4 className="text-[10px] font-sans font-bold text-brand-wood uppercase tracking-widest">
                    Geradores de Conteúdo Acadêmico
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={handleGenerateSummary}
                      disabled={aiSummaryLoading}
                      className="bg-brand-paper hover:bg-brand-wood hover:text-white text-brand-wood font-sans font-bold text-[9px] uppercase tracking-wider py-2.5 px-2 rounded-xl border border-brand-wood/10 transition-all cursor-pointer flex flex-col items-center gap-1 text-center justify-center disabled:opacity-50"
                    >
                      <FileText className="w-4 h-4" />
                      {aiSummaryLoading ? 'Gerando...' : 'Resumo da Aula'}
                    </button>
                    <button
                      onClick={handleSuggestExercises}
                      disabled={aiExercisesLoading}
                      className="bg-brand-paper hover:bg-brand-wood hover:text-white text-brand-wood font-sans font-bold text-[9px] uppercase tracking-wider py-2.5 px-2 rounded-xl border border-brand-wood/10 transition-all cursor-pointer flex flex-col items-center gap-1 text-center justify-center disabled:opacity-50"
                    >
                      <Award className="w-4 h-4" />
                      {aiExercisesLoading ? 'Sugerindo...' : 'Exercícios Extras'}
                    </button>
                    <button
                      onClick={handleGenerateMaterial}
                      disabled={aiMaterialLoading}
                      className="bg-brand-paper hover:bg-brand-wood hover:text-white text-brand-wood font-sans font-bold text-[9px] uppercase tracking-wider py-2.5 px-2 rounded-xl border border-brand-wood/10 transition-all cursor-pointer flex flex-col items-center gap-1 text-center justify-center disabled:opacity-50"
                    >
                      <BookOpen className="w-4 h-4" />
                      {aiMaterialLoading ? 'Gerando...' : 'Material Extra'}
                    </button>
                  </div>

                  {/* Rendering the active academic resource */}
                  {(aiSummary || aiExercises || aiMaterial || aiSummaryLoading || aiExercisesLoading || aiMaterialLoading) && (
                    <div className="mt-3 p-4 bg-brand-paper/50 rounded-xl border border-brand-wood/15 max-h-[220px] overflow-y-auto text-xs leading-relaxed font-sans text-brand-ink">
                      {aiSummaryLoading && <div className="text-center py-4 text-brand-clay animate-pulse">Sintetizando resumo conceitual...</div>}
                      {aiExercisesLoading && <div className="text-center py-4 text-brand-clay animate-pulse">Estruturando sugestões de treino prático...</div>}
                      {aiMaterialLoading && <div className="text-center py-4 text-brand-clay animate-pulse">Compilando glossário e referências técnicas...</div>}

                      {!aiSummaryLoading && aiSummary && !aiExercisesLoading && !aiMaterialLoading && (
                        <div className="markdown-body">
                          <Markdown>{aiSummary}</Markdown>
                          <button
                            onClick={() => setAiSummary('')}
                            className="mt-3 text-[9px] font-bold text-brand-clay hover:text-brand-wood uppercase tracking-wider block ml-auto"
                          >
                            Limpar Resumo
                          </button>
                        </div>
                      )}

                      {!aiExercisesLoading && aiExercises && !aiSummaryLoading && !aiMaterialLoading && (
                        <div className="markdown-body">
                          <Markdown>{aiExercises}</Markdown>
                          <button
                            onClick={() => setAiExercises('')}
                            className="mt-3 text-[9px] font-bold text-brand-clay hover:text-brand-wood uppercase tracking-wider block ml-auto"
                          >
                            Limpar Exercícios
                          </button>
                        </div>
                      )}

                      {!aiMaterialLoading && aiMaterial && !aiSummaryLoading && !aiExercisesLoading && (
                        <div className="markdown-body">
                          <Markdown>{aiMaterial}</Markdown>
                          <button
                            onClick={() => setAiMaterial('')}
                            className="mt-3 text-[9px] font-bold text-brand-clay hover:text-brand-wood uppercase tracking-wider block ml-auto"
                          >
                            Limpar Material
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Sub-section 2: Automatic Exercise Correction */}
                <div className="space-y-3 bg-white p-4 rounded-2xl border border-brand-wood/5 shadow-sm">
                  <h4 className="text-[10px] font-sans font-bold text-brand-wood uppercase tracking-widest">
                    Corretor de Exercícios Práticos & Teóricos
                  </h4>
                  <div className="space-y-2">
                    <div className="p-2.5 bg-brand-paper rounded-xl border border-brand-wood/5">
                      <span className="text-[8px] font-bold uppercase tracking-wider text-brand-wood block">Questão para Resposta:</span>
                      <span className="text-xs font-serif font-bold text-brand-ink italic">"{aiCorrectionQuestion}"</span>
                    </div>
                    <textarea
                      value={aiCorrectionInput}
                      onChange={(e) => setAiCorrectionInput(e.target.value)}
                      placeholder="Redija aqui sua resposta técnica ou reflexiva para receber correção detalhada e nota..."
                      className="w-full p-3 text-xs bg-brand-paper/10 border border-brand-wood/15 rounded-xl text-brand-ink focus:outline-none focus:ring-1 focus:ring-brand-wood focus:bg-white transition-all h-[75px]"
                    />
                    <button
                      onClick={handleRequestCorrection}
                      disabled={!aiCorrectionInput.trim() || aiCorrectionLoading}
                      className="w-full bg-brand-wood hover:bg-brand-clay text-white font-sans font-bold text-[9px] uppercase tracking-widest py-2 rounded-xl transition-all shadow disabled:opacity-40 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {aiCorrectionLoading ? 'Avaliando Resposta...' : 'Solicitar Correção do Mestre IA'}
                    </button>
                  </div>

                  {/* Rendering Correction Feedback */}
                  {(aiCorrection || aiCorrectionLoading) && (
                    <div className="mt-3 p-4 bg-brand-paper/55 rounded-xl border border-brand-wood/15 text-xs font-sans leading-relaxed text-brand-ink max-h-[180px] overflow-y-auto">
                      {aiCorrectionLoading ? (
                        <div className="text-center py-4 text-brand-clay animate-pulse">Mestre Andrew está analisando os argumentos técnicos...</div>
                      ) : (
                        <div className="markdown-body">
                          <Markdown>{aiCorrection}</Markdown>
                          <button
                            onClick={() => {
                              setAiCorrection('');
                              setAiCorrectionInput('');
                            }}
                            className="mt-3 text-[9px] font-bold text-brand-clay hover:text-brand-wood uppercase tracking-wider block ml-auto"
                          >
                            Nova Tentativa
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Sub-section 3: Customized Quiz Generation */}
                <div className="space-y-3 bg-white p-4 rounded-2xl border border-brand-wood/5 shadow-sm">
                  <div className="flex justify-between items-center">
                    <h4 className="text-[10px] font-sans font-bold text-brand-wood uppercase tracking-widest">
                      Gerador de Quiz Personalizado
                    </h4>
                    <button
                      onClick={handleGenerateCustomQuiz}
                      disabled={aiCustomQuizLoading}
                      className="text-[9px] font-bold text-brand-wood hover:underline uppercase tracking-wider flex items-center gap-1 disabled:opacity-50"
                    >
                      {aiCustomQuizLoading ? 'Gerando...' : aiCustomQuiz ? 'Gerar Outro' : 'Criar Desafio'}
                    </button>
                  </div>

                  {aiCustomQuizLoading && <div className="text-center py-4 text-xs text-brand-clay animate-pulse">Formulando quiz inédito...</div>}

                  {!aiCustomQuizLoading && aiCustomQuiz && (
                    <div className="p-3 bg-brand-paper/30 border border-brand-wood/10 rounded-xl space-y-3">
                      <p className="text-xs font-serif font-bold text-brand-ink">{aiCustomQuiz.question}</p>
                      <div className="space-y-1.5">
                        {aiCustomQuiz.options.map((opt: string, i: number) => {
                          const isSelected = aiCustomQuizSelected === i;
                          const showCorrect = aiCustomQuizChecked && i === aiCustomQuiz.correctAnswerIndex;
                          const showWrong = aiCustomQuizChecked && isSelected && i !== aiCustomQuiz.correctAnswerIndex;

                          return (
                            <div
                              key={i}
                              onClick={() => !aiCustomQuizChecked && setAiCustomQuizSelected(i)}
                              className={`p-2.5 rounded-xl text-xs border cursor-pointer transition-all flex items-center justify-between ${
                                aiCustomQuizChecked
                                  ? showCorrect
                                    ? 'bg-brand-paper border-brand-wood text-brand-wood font-bold'
                                    : showWrong
                                      ? 'bg-red-50 border-red-200 text-red-900'
                                      : 'bg-white border-brand-wood/5 text-brand-clay/40'
                                  : isSelected
                                    ? 'border-brand-wood bg-brand-paper text-brand-wood font-semibold'
                                    : 'border-brand-wood/10 text-brand-clay bg-white hover:bg-brand-paper/50'
                              }`}
                            >
                              <span>{opt}</span>
                              {aiCustomQuizChecked && showCorrect && <span className="text-[9px] bg-brand-wood text-white px-1.5 py-0.5 rounded-full font-bold">Correto</span>}
                              {aiCustomQuizChecked && showWrong && <span className="text-[9px] bg-red-600 text-white px-1.5 py-0.5 rounded-full font-bold">Incorreto</span>}
                            </div>
                          );
                        })}
                      </div>

                      {!aiCustomQuizChecked ? (
                        <button
                          onClick={() => {
                            if (aiCustomQuizSelected !== null) {
                              setAiCustomQuizChecked(true);
                              setAiCustomQuizIsCorrect(aiCustomQuizSelected === aiCustomQuiz.correctAnswerIndex);
                            }
                          }}
                          disabled={aiCustomQuizSelected === null}
                          className="bg-brand-wood hover:bg-brand-clay text-white font-sans font-bold text-[9px] uppercase tracking-widest px-4 py-2 rounded-xl transition-all disabled:opacity-40"
                        >
                          Validar Desafio
                        </button>
                      ) : (
                        <div className="flex justify-between items-center text-[10px] pt-1">
                          <span className={aiCustomQuizIsCorrect ? 'text-brand-wood font-bold' : 'text-red-700 font-bold'}>
                            {aiCustomQuizIsCorrect ? 'Incrível! Você dominou o assunto.' : 'Ops! Estude o material complementar.'}
                          </span>
                          <button
                            onClick={() => {
                              setAiCustomQuizSelected(null);
                              setAiCustomQuizChecked(false);
                              setAiCustomQuizIsCorrect(null);
                            }}
                            className="text-brand-clay hover:text-brand-wood font-bold uppercase tracking-wider text-[9px]"
                          >
                            Limpar
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Live Chat with AI Tutor */}
              <div className="lg:col-span-5 bg-white rounded-3xl border border-brand-wood/10 shadow-sm overflow-hidden flex flex-col h-[650px]">
                {/* Chat Header */}
                <div className="p-4 bg-gradient-to-r from-[#4A3222] to-[#2F1F15] text-[#DFD3C3] border-b border-brand-wood/10 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-brand-clay fill-brand-clay/30" />
                    <div>
                      <h4 className="font-serif font-bold text-xs">Tutor de IA Integrado</h4>
                      <span className="text-[9px] text-[#DFD3C3]/70">Canal direto de explicação de dúvidas</span>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 bg-brand-wood/20 border border-brand-wood/30 text-[#DFD3C3] font-mono text-[9px] uppercase font-bold rounded-full">
                    Gemini API
                  </span>
                </div>

                {/* Chat Message Workspace */}
                <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-brand-paper/30 animate-fade-in">
                  {aiChatHistory.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                      <HelpCircle className="w-8 h-8 text-brand-clay animate-bounce" />
                      <p className="text-xs font-serif font-bold text-brand-ink">Explicação de Dúvidas Técnicas</p>
                      <p className="text-[11px] text-brand-clay max-w-xs leading-relaxed font-sans">
                        Pergunte ao Tutor sobre ferramentas de entalhe, madeiras indicadas, acabamento ou qualquer detalhe teórico desta aula.
                      </p>
                    </div>
                  )}

                  {aiChatHistory.map((chat, i) => (
                    <div
                      key={i}
                      className={`flex ${chat.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`p-3 rounded-2xl text-xs max-w-[85%] leading-relaxed ${
                        chat.role === 'user'
                          ? 'bg-brand-wood text-white rounded-tr-none shadow-sm'
                          : 'bg-white text-brand-ink border border-brand-wood/10 rounded-tl-none shadow-sm markdown-body shadow-inner p-4 font-sans'
                      }`}>
                        {chat.role === 'user' ? (
                          chat.text
                        ) : (
                          <Markdown>{chat.text}</Markdown>
                        )}
                      </div>
                    </div>
                  ))}

                  {aiLoading && (
                    <div className="flex justify-start">
                      <div className="p-4 rounded-2xl bg-white border border-brand-wood/10 rounded-tl-none text-xs text-brand-clay flex items-center gap-1.5 font-medium shadow-sm">
                        <span className="w-2 h-2 bg-brand-wood rounded-full animate-ping" /> Formulando explicação detalhada...
                      </div>
                    </div>
                  )}
                </div>

                {/* Live Chat Form */}
                <form onSubmit={askAiTutor} className="p-3 border-t border-brand-wood/10 bg-brand-paper flex gap-2">
                  <input
                    type="text"
                    value={aiQuery}
                    onChange={e => setAiQuery(e.target.value)}
                    placeholder="Tire suas dúvidas técnicas aqui..."
                    className="flex-1 px-4 py-2.5 text-xs bg-white rounded-full border border-brand-wood/20 focus:outline-none focus:ring-1 focus:ring-brand-wood shadow-sm text-brand-ink"
                  />
                  <button
                    type="submit"
                    disabled={!aiQuery.trim() || aiLoading}
                    className="bg-brand-wood hover:bg-brand-clay text-white p-2.5 rounded-full transition-all disabled:opacity-40 shadow-md cursor-pointer flex-shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          )}

          {lessonSubTab === 'discussion' && (
            <div className="bg-white p-6 rounded-3xl border border-brand-wood/10 shadow-sm space-y-6">
              <h3 className="font-serif font-bold text-brand-ink text-sm">Mesa de Debates & Feedbacks</h3>

              {/* Add New Comment Box */}
              <div className="space-y-2">
                <textarea
                  placeholder="Faça uma observação técnica ou tire suas dúvidas com outros artesãos..."
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  className="w-full p-4 text-xs rounded-2xl border border-brand-wood/20 focus:outline-none focus:ring-1 focus:ring-brand-wood text-brand-ink bg-brand-paper/20"
                  rows={3}
                />
                <div className="flex justify-end">
                  <button
                    onClick={() => handlePostComment(null)}
                    disabled={!newComment.trim()}
                    className="bg-brand-wood hover:bg-brand-clay text-white text-[11px] font-sans font-medium uppercase tracking-widest px-4 py-2 rounded-full disabled:opacity-40 shadow-sm"
                  >
                    Postar Comentário
                  </button>
                </div>
              </div>

              {/* Comments loop */}
              <div className="space-y-5 pt-4 border-t border-brand-wood/10">
                {comments.filter(c => c.lessonId === currentLesson.id).map(comment => (
                  <div key={comment.id} className="space-y-3.5 p-4 bg-brand-paper/30 rounded-2xl border border-brand-wood/5">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2.5">
                        <img 
                          src={getDirectDriveUrl(comment.avatarUrl) || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop"} 
                          alt={comment.userName} 
                          className="w-7 h-7 rounded-full object-cover border border-brand-wood/10"
                        />
                        <div>
                          <span className="text-xs font-bold text-brand-ink">{comment.userName}</span>
                          <span className={`ml-1.5 px-2 py-0.5 rounded-full text-[8px] font-bold uppercase ${
                            comment.userRole === 'admin' ? 'bg-brand-wood/10 text-brand-wood' : 'bg-brand-clay/10 text-brand-clay'
                          }`}>
                            {comment.userRole === 'admin' ? 'Escultor' : 'Artesão'}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] text-brand-clay font-medium">
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <p className="text-xs text-brand-ink leading-relaxed pl-1">{comment.comment}</p>

                    {/* Replies */}
                    {comment.replies && comment.replies.map(rep => (
                      <div key={rep.id} className="ml-6 p-3 bg-white border border-brand-wood/10 rounded-xl space-y-2">
                        <div className="flex justify-between items-center text-[10px]">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-brand-ink">{rep.userName}</span>
                            <span className="px-1.5 py-0.5 bg-brand-wood/10 text-[8px] font-bold text-brand-wood uppercase rounded-full">Escultor</span>
                          </div>
                          <span className="text-brand-clay">{new Date(rep.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs text-brand-clay leading-relaxed">{rep.comment}</p>
                      </div>
                    ))}

                    {/* Reply triggering */}
                    <div className="pt-1.5">
                      {activeReplyBox === comment.id ? (
                        <div className="space-y-2 mt-2">
                          <input
                            type="text"
                            placeholder="Escreva sua resposta..."
                            value={replyText}
                            onChange={e => setReplyText(e.target.value)}
                            className="w-full px-3 py-2 text-xs border border-brand-wood/20 rounded-full focus:outline-none"
                          />
                          <div className="flex justify-end gap-2 text-[10px]">
                            <button onClick={() => setActiveReplyBox(null)} className="text-brand-clay hover:underline">Cancelar</button>
                            <button onClick={() => handlePostComment(comment.id)} className="bg-brand-wood text-white px-3 py-1 rounded-full font-bold">Enviar</button>
                          </div>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setActiveReplyBox(comment.id)}
                          className="text-[10px] text-brand-wood hover:underline font-bold flex items-center gap-1 pl-1"
                        >
                          Responder
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {comments.filter(c => c.lessonId === currentLesson.id).length === 0 && (
                  <p className="text-xs text-brand-clay italic text-center py-4">Nenhuma contribuição técnica feita ainda. Compartilhe sua experiência!</p>
                )}
              </div>
            </div>
          )}

          {lessonSubTab === 'practical_work' && (
            <div className="space-y-6 font-sans">
              <div className="bg-brand-wood/5 border border-brand-wood/10 rounded-3xl p-5 md:p-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between animate-in fade-in duration-200">
                <div className="space-y-1 max-w-2xl">
                  <h4 className="font-serif font-bold text-sm text-brand-ink flex items-center gap-2">
                    <Camera className="w-4 h-4 text-brand-clay" /> Oficina de Exercícios Práticos
                  </h4>
                  <p className="text-xs text-brand-clay leading-relaxed">
                    Envie fotos das suas peças esculpidas, colheres, entalhes ou do seu processo de lixamento/acabamento.
                    O <strong>Professor Andrew Lemos</strong> avaliará sua técnica, dará parabéns pela evolução e fornecerá dicas de aprimoramento!
                  </p>
                </div>
              </div>

              {/* SUCCESS MESSAGE */}
              {practicalSuccessMsg && (
                <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-2xl flex items-center gap-2.5 text-xs font-medium animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span>{practicalSuccessMsg}</span>
                </div>
              )}

              {/* NEW SUBMISSION FORM */}
              <div className="bg-white border border-brand-wood/10 rounded-3xl p-6 shadow-sm space-y-5">
                <h5 className="text-xs font-bold text-brand-ink uppercase tracking-wider">Submeter Novo Trabalho Prático</h5>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-brand-clay uppercase tracking-wider block">Relatório ou Dúvida sobre o Exercício</label>
                  <textarea
                    placeholder="Fale um pouco sobre o seu projeto: que madeira usou, quais goivas/facas aplicou, que acabamento escolheu e quais foram suas maiores dificuldades..."
                    value={practicalQuery}
                    onChange={e => setPracticalQuery(e.target.value)}
                    className="w-full p-4 bg-brand-paper/50 border border-brand-wood/15 rounded-2xl focus:outline-none focus:ring-1 focus:ring-brand-wood text-brand-ink text-xs"
                    rows={4}
                  />
                </div>

                {/* IMAGE UPLOAD SIMULATOR OR URL INPUT */}
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-brand-clay uppercase tracking-wider block">Foto do seu Exercício/Trabalho</label>
                  
                  <FileUploader
                    allowedTypes="image"
                    maxSizeMB={5}
                    currentUrl={practicalImage}
                    onUploadSuccess={(url) => setPracticalImage(url)}
                    onDeleteSuccess={() => setPracticalImage('')}
                  />

                  {/* TEXT URL FALLBACK */}
                  <div className="flex gap-2 items-center pt-2">
                    <div className="h-px bg-brand-wood/10 flex-1"></div>
                    <span className="text-[10px] text-brand-clay uppercase tracking-widest font-bold">Ou insira o link da foto</span>
                    <div className="h-px bg-brand-wood/10 flex-1"></div>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Cole aqui a URL da foto (Unsplash, Google Drive público, Imgur...)"
                      value={practicalImage}
                      onChange={e => setPracticalImage(e.target.value)}
                      className="flex-1 p-2.5 bg-brand-paper/50 border border-brand-wood/15 rounded-xl text-brand-ink text-xs focus:outline-none focus:border-brand-wood"
                    />
                  </div>

                      {/* Presets row */}
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[9px] font-sans font-bold text-brand-clay uppercase tracking-wider block">Fotos de Demonstração para Testar:</span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[
                            { name: "Prato Entalhado", url: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=600&auto=format&fit=crop" },
                            { name: "Colher Feita à Mão", url: "https://images.unsplash.com/photo-1581428982868-e410dd047a90?q=80&w=600&auto=format&fit=crop" },
                            { name: "Escultura Abstrata", url: "https://images.unsplash.com/photo-1507208773393-40090c1b30b6?q=80&w=600&auto=format&fit=crop" },
                            { name: "Lixamento de Mesa", url: "https://images.unsplash.com/photo-1610555356070-d0efb6505f21?q=80&w=600&auto=format&fit=crop" }
                          ].map((preset, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setPracticalImage(preset.url)}
                              className="bg-brand-paper/50 border border-brand-wood/10 hover:border-brand-wood/30 p-2 rounded-lg flex items-center gap-1.5 text-left transition-all group"
                            >
                              <img src={preset.url} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0 border border-brand-wood/5" />
                              <span className="text-[10px] text-brand-clay group-hover:text-brand-wood font-medium truncate">{preset.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    disabled={!practicalQuery.trim() || !practicalImage || isUploadingPractical}
                    onClick={async () => {
                      try {
                        const payload = {
                          studentId: currentUser.id,
                          studentName: currentUser.name,
                          studentEmail: currentUser.email,
                          courseId: selectedCourse?.id || '',
                          lessonId: currentLesson.id,
                          lessonTitle: currentLesson.title,
                          queryText: practicalQuery,
                          imageUrl: practicalImage,
                          type: 'practical_work'
                        };
                        await onSubmitTicket(payload);
                        setPracticalQuery('');
                        setPracticalImage('');
                        setPracticalSuccessMsg("Seu trabalho prático foi enviado com sucesso! O Professor Andrew Lemos foi notificado e dará o retorno técnico em breve.");
                        setTimeout(() => setPracticalSuccessMsg(''), 8000);
                      } catch (err) {
                        console.error("Erro ao enviar exercício prático:", err);
                      }
                    }}
                    className="bg-brand-wood hover:bg-brand-clay text-white text-[10px] font-sans font-medium uppercase tracking-widest px-6 py-3 rounded-full shadow-sm hover:shadow-md transition-all flex items-center gap-2 disabled:opacity-40"
                  >
                    <Send className="w-3.5 h-3.5" /> Enviar para Avaliação do Professor
                  </button>
                </div>
              </div>

              {/* SUBMISSIONS LIST HISTORY */}
              <div className="space-y-4 pt-2">
                <h5 className="text-xs font-bold text-brand-ink uppercase tracking-wider">Histórico de Exercícios Enviados nesta Aula</h5>
                
                <div className="space-y-4">
                  {supportTickets
                    .filter(t => t.lessonId === currentLesson.id && (t.type === 'practical_work' || t.imageUrl))
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map(sub => {
                      const hasReply = !!sub.answerText;
                      return (
                        <div key={sub.id} className="bg-white border border-brand-wood/10 rounded-3xl overflow-hidden shadow-sm flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-brand-wood/10">
                          {/* Image column */}
                          <div className="md:w-1/3 bg-brand-paper/30 p-4 flex flex-col justify-center items-center">
                            {sub.imageUrl ? (
                              <div className="relative group w-full h-44 rounded-2xl overflow-hidden border border-brand-wood/10 bg-white">
                                <img 
                                  src={getDirectDriveUrl(sub.imageUrl)} 
                                  alt="Trabalho Prático do Aluno" 
                                  className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                                />
                              </div>
                            ) : (
                              <div className="w-full h-44 rounded-2xl border border-brand-wood/10 bg-white flex flex-col items-center justify-center text-brand-clay">
                                <ImageIcon className="w-8 h-8 opacity-40 mb-1" />
                                <span className="text-[10px] uppercase font-sans tracking-wider">Sem foto anexada</span>
                              </div>
                            )}
                          </div>

                          {/* Message and response column */}
                          <div className="md:w-2/3 p-6 space-y-4 flex flex-col justify-between text-xs">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="bg-brand-clay/10 text-brand-wood border border-brand-clay/10 text-[9px] font-sans font-bold uppercase tracking-widest px-2.5 py-1 rounded-full flex items-center gap-1">
                                  <Camera className="w-3 h-3" /> Exercício Prático
                                </span>
                                <span className="text-[10px] text-brand-clay">{new Date(sub.createdAt).toLocaleDateString()}</span>
                              </div>

                              <div className="space-y-1">
                                <span className="font-bold text-[10px] text-brand-clay uppercase tracking-wider block">Seu Relatório de Execução:</span>
                                <p className="text-brand-ink leading-relaxed whitespace-pre-wrap italic">"{sub.queryText}"</p>
                              </div>
                            </div>

                            {/* Response block */}
                            {hasReply ? (
                              <div className="p-4 bg-yellow-50 border border-brand-wood/25 rounded-2xl space-y-2 mt-2">
                                <div className="flex items-center gap-1.5 text-brand-wood font-serif font-bold text-[10px] uppercase tracking-wider">
                                  <Award className="w-4 h-4 text-brand-clay fill-brand-clay/10" />
                                  <span>Retorno Técnico de Andrew Lemos:</span>
                                </div>
                                <p className="text-brand-ink leading-relaxed font-sans">{sub.answerText}</p>
                                <span className="text-[9px] text-brand-clay block pt-1 border-t border-brand-wood/5">Avaliado em {new Date(sub.answeredAt || '').toLocaleDateString()}</span>
                              </div>
                            ) : (
                              <div className="p-4 bg-brand-paper/50 border border-dashed border-brand-wood/20 rounded-2xl flex items-center gap-2 mt-2">
                                <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                                <span className="text-brand-clay font-medium font-sans text-[10px]">Aguardando feedback técnico e correção do Professor Andrew...</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                  {supportTickets.filter(t => t.lessonId === currentLesson.id && (t.type === 'practical_work' || t.imageUrl)).length === 0 && (
                    <div className="text-center py-8 bg-brand-paper/20 rounded-2xl border border-dashed border-brand-wood/10 text-xs italic text-brand-clay">
                      Você ainda não enviou nenhum exercício prático para esta aula. Comece agora compartilhando suas fotos!
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 3. PROTECTED EBOOK READER (Apostilas Digitais)
  if (selectedApostila) {
    const chapter = selectedApostila.chapters[activeChapterIndex];

    return (
      <div 
        className="max-w-5xl mx-auto space-y-4 select-none relative" 
        id="protected-ebook-reader"
        onContextMenu={(e) => e.preventDefault()} // Disable right-click anti-piracy
        style={{ userSelect: 'none', WebkitUserSelect: 'none', msUserSelect: 'none' }} // Disable select text
      >
        {/* Anti Screenshot Moving Watermark overlay */}
        <div 
          className="absolute font-black pointer-events-none text-brand-clay/10 text-xs md:text-sm tracking-widest z-50 transition-all duration-1000 rotate-12"
          style={{ top: `${watermarkPos.top}%`, left: `${watermarkPos.left}%` }}
        >
          {currentUser.name} | {currentUser.email} | ATELIÊ ANDREW LEMOS | MATERIAL DE APOSENTADORIA TÉCNICA
        </div>

        {/* Back and protective indicator header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-brand-ink text-white px-5 py-3.5 rounded-3xl border border-brand-wood/10 shadow-md">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setSelectedApostila(null); }}
              className="text-xs text-brand-clay hover:text-[#FDFCFB] font-bold font-sans"
            >
              ← Voltar Biblioteca
            </button>
            <div className="w-px h-4 bg-brand-wood/25" />
            <h2 className="font-serif font-bold text-sm truncate max-w-[300px] text-white">{selectedApostila.title}</h2>
          </div>

          <div className="flex items-center gap-2 bg-brand-clay/20 border border-brand-clay/30 text-[#DFD3C3] font-bold px-3 py-1 rounded-full text-[10px] uppercase tracking-wider animate-pulse">
            <Printer className="w-3.5 h-3.5" /> Leitor Criptografado Ativo
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Chapters Left Index Navigation */}
          <div className="lg:col-span-4 bg-white border border-brand-wood/10 rounded-3xl p-4 shadow-sm space-y-3">
            <span className="text-[10px] font-bold text-brand-clay uppercase tracking-widest block font-sans">Sumário da Obra</span>
            <div className="space-y-1.5">
              {selectedApostila.chapters.map((chap, i) => (
                <div
                  key={chap.id}
                  onClick={() => setActiveChapterIndex(i)}
                  className={`p-3 rounded-2xl text-xs font-semibold cursor-pointer transition-all border flex items-center justify-between ${
                    activeChapterIndex === i
                      ? 'border-brand-wood bg-brand-paper text-brand-wood font-bold'
                      : 'border-transparent text-brand-clay hover:bg-brand-paper'
                  }`}
                >
                  <span className="truncate">{chap.title}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-brand-clay" />
                </div>
              ))}
            </div>
          </div>

          {/* Chapters Content Center Reader (Custom protected visualizer mock) */}
          <div className="lg:col-span-8 bg-[#FDFCFB] border border-brand-wood/10 rounded-3xl shadow-md min-h-[500px] relative overflow-hidden flex flex-col justify-between">
            {/* Header copy warning */}
            <div className="bg-brand-clay/10 text-brand-wood text-[9px] font-sans font-bold uppercase tracking-widest p-2.5 text-center border-b border-brand-wood/5 flex items-center justify-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-brand-clay" /> Licença individualizada para {currentUser.email}. Reprodução proibida.
            </div>

            {/* Reading paper canvas area */}
            <div className="p-8 md:p-12 space-y-6 flex-1 bg-[radial-gradient(#8b5e3c_0.5px,transparent_0.5px)] [background-size:24px_24px] bg-opacity-5">
              <div className="max-w-2xl mx-auto space-y-6">
                <h3 className="text-xl md:text-2xl font-serif font-bold text-brand-ink border-b border-brand-wood/10 pb-3">{chapter.title}</h3>
                
                {/* Markdown ebook text wrapper */}
                <div className="markdown-body text-brand-ink text-sm md:text-base leading-relaxed whitespace-pre-wrap select-none font-sans font-light">
                  <Markdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      img: ({ src, ...props }) => (
                        <img 
                          src={getDirectDriveUrl(src)} 
                          {...props} 
                          referrerPolicy="no-referrer" 
                          className="max-w-full my-4 rounded-2xl border border-brand-wood/10 shadow-sm mx-auto" 
                        />
                      )
                    }}
                  >
                    {cleanCitations(chapter.content)}
                  </Markdown>
                </div>
              </div>
            </div>

            {/* Bottom Chapter Navigator */}
            <div className="p-4 bg-brand-paper border-t border-brand-wood/5 flex justify-between items-center text-xs">
              <button
                disabled={activeChapterIndex === 0}
                onClick={() => setActiveChapterIndex(activeChapterIndex - 1)}
                className="bg-white border border-brand-wood/10 hover:bg-brand-paper text-brand-clay px-4 py-2 rounded-full font-bold transition-all disabled:opacity-40"
              >
                Anterior
              </button>
              <span className="text-brand-clay font-bold">Capítulo {activeChapterIndex + 1} de {selectedApostila.chapters.length}</span>
              <button
                disabled={activeChapterIndex === selectedApostila.chapters.length - 1}
                onClick={() => setActiveChapterIndex(activeChapterIndex + 1)}
                className="bg-brand-wood hover:bg-brand-clay text-white px-4 py-2 rounded-full font-bold transition-all disabled:opacity-40"
              >
                Próximo
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
