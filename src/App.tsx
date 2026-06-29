import React, { useState, useEffect } from 'react';
import { Course, Module, Lesson, Apostila, Sale, Coupon, User, StudentProgress, SupportTicket, SupportComment, Certificate } from './types';
import VisitorCatalog from './components/VisitorCatalog';
import Checkout from './components/Checkout';
import StudentPortal from './components/StudentPortal';
import AdminPanel from './components/AdminPanel';
import AuthModal from './components/AuthModal';
import { auth, signOut, onAuthStateChanged } from './utils/firebase';
import { getDirectDriveUrl } from './utils/image';
import { cleanCitations } from './utils/text';
import { 
  Sparkles, ShieldCheck, HelpCircle, BookOpen, UserCheck, 
  Crown, LogOut, ChevronRight, Eye, Play, CheckCircle2, RefreshCw, Key, Download
} from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function App() {
  // Database States
  const [courses, setCourses] = useState<Course[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [apostilas, setApostilas] = useState<Apostila[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [progress, setProgress] = useState<StudentProgress[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [comments, setComments] = useState<SupportComment[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);

  // Auth / Role switcher simulator
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentRole, setCurrentRole] = useState<'visitor' | 'student' | 'admin'>('visitor');

  // Checkout flows
  const [checkoutProduct, setCheckoutProduct] = useState<Course | Apostila | null>(null);
  const [checkoutType, setCheckoutType] = useState<'course' | 'apostila'>('course');

  // Previewing Free lesson campaign
  const [freePreviewLesson, setFreePreviewLesson] = useState<Lesson | null>(null);
  const [freePreviewCourse, setFreePreviewCourse] = useState<Course | null>(null);

  // Loading flag
  const [loading, setLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Synchronize authenticated Firebase users with Express database
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setLoading(true);
        try {
          // Fetch fresh list of users first to see if they already exist
          const resUsers = await fetch('/api/users');
          const dataUsers: User[] = await resUsers.json();
          setUsers(dataUsers);

          const existingUser = dataUsers.find(u => u.email.toLowerCase() === firebaseUser.email?.toLowerCase());

          // Post to sync/create profile
          const syncRes = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: firebaseUser.uid,
              name: firebaseUser.displayName || existingUser?.name || firebaseUser.email?.split('@')[0] || "Aluno",
              email: firebaseUser.email || "",
              avatarUrl: firebaseUser.photoURL || existingUser?.avatarUrl || "",
              role: firebaseUser.email?.toLowerCase() === 'andrewfmlemos@gmail.com' ? 'admin' : (existingUser?.role || 'student')
            })
          });

          if (syncRes.ok) {
            const syncData = await syncRes.json();
            const loggedInUser: User = syncData.user;
            setCurrentUser(loggedInUser);
            setCurrentRole(loggedInUser.role);
          }
        } catch (err) {
          console.error('Erro ao sincronizar usuário:', err);
        } finally {
          setLoading(false);
        }
      } else {
        setCurrentUser(null);
        setCurrentRole('visitor');
      }
    });

    return () => unsubscribe();
  }, []);

  // 1. FETCH ALL DATA FROM BACKEND REST API
  const fetchData = async () => {
    try {
      const [
        resCourses, resModules, resLessons, resApostilas, 
        resSales, resCoupons, resUsers, resProgress, 
        resSupport, resComments, resCertificates
      ] = await Promise.all([
        fetch('/api/courses'),
        fetch('/api/modules'),
        fetch('/api/lessons'),
        fetch('/api/apostilas'),
        fetch('/api/sales'),
        fetch('/api/coupons'),
        fetch('/api/users'),
        fetch('/api/progress'),
        fetch('/api/support'),
        fetch('/api/comments'),
        fetch('/api/certificates')
      ]);

      const [
        dataCourses, dataModules, dataLessons, dataApostilas,
        dataSales, dataCoupons, dataUsers, dataProgress,
        dataSupport, dataComments, dataCertificates
      ] = await Promise.all([
        resCourses.json(),
        resModules.json(),
        resLessons.json(),
        resApostilas.json(),
        resSales.json(),
        resCoupons.json(),
        resUsers.json(),
        resProgress.json(),
        resSupport.json(),
        resComments.json(),
        resCertificates.json()
      ]);

      setCourses(dataCourses);
      setModules(dataModules);
      setLessons(dataLessons);
      setApostilas(dataApostilas);
      setSales(dataSales);
      setCoupons(dataCoupons);
      setUsers(dataUsers);
      setProgress(dataProgress);
      setSupportTickets(dataSupport);
      setComments(dataComments);
      setCertificates(dataCertificates);
    } catch (err) {
      console.error('Erro ao buscar dados do Express:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 2. BACKEND MUTATIONS HELPERS (CRUD OPERATIONS SINK)

  // 2A. Courses Manager mutations
  const handleAddCourse = async (coursePayload: Course) => {
    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(coursePayload)
      });
      if (res.ok) await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCourse = async (id: string) => {
    if (!window.confirm('Tem certeza de que deseja remover este curso e todos os seus módulos/aulas?')) return;
    try {
      const res = await fetch(`/api/courses/${id}`, { method: 'DELETE' });
      if (res.ok) await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // 2B. Modules Manager mutations
  const handleAddModule = async (modPayload: Module) => {
    try {
      const res = await fetch('/api/modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(modPayload)
      });
      if (res.ok) await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteModule = async (id: string) => {
    if (!window.confirm('Excluir este módulo removerá permanentemente todas as suas aulas associadas. Continuar?')) return;
    try {
      const res = await fetch(`/api/modules/${id}`, { method: 'DELETE' });
      if (res.ok) await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // 2C. Lessons Manager mutations
  const handleAddLesson = async (lessonPayload: Lesson) => {
    try {
      const res = await fetch('/api/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lessonPayload)
      });
      if (res.ok) await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteLesson = async (id: string) => {
    if (!window.confirm('Tem certeza de que deseja remover esta aula?')) return;
    try {
      const res = await fetch(`/api/lessons/${id}`, { method: 'DELETE' });
      if (res.ok) await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // 2D. Apostila (ebook) Manager mutations
  const handleAddApostila = async (bookPayload: Apostila) => {
    try {
      const res = await fetch('/api/apostilas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookPayload)
      });
      if (res.ok) await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteApostila = async (id: string) => {
    if (!window.confirm('Excluir esta apostila?')) return;
    try {
      const res = await fetch(`/api/apostilas/${id}`, { method: 'DELETE' });
      if (res.ok) await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // 2E. Approve manual pending sale
  const handleApproveSale = async (id: string) => {
    try {
      const res = await fetch(`/api/sales/${id}/approve`, { method: 'POST' });
      if (res.ok) {
        await fetchData();
        alert('Pagamento aprovado ficticiamente! O aluno já tem acesso total aos materiais.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 2F. Coupon creation
  const handleAddCoupon = async (couponPayload: Coupon) => {
    try {
      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(couponPayload)
      });
      if (res.ok) await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    try {
      const res = await fetch(`/api/coupons/${id}`, { method: 'DELETE' });
      if (res.ok) await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // 2G. Mark student progress completed/favorited
  const handleToggleComplete = async (lessonId: string, courseId: string, completed: boolean) => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: currentUser.id,
          lessonId,
          courseId,
          completed,
          completedAt: completed ? new Date().toISOString() : null
        })
      });
      if (res.ok) await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleFavorite = async (lessonId: string, courseId: string, favorited: boolean) => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: currentUser.id,
          lessonId,
          courseId,
          favorited
        })
      });
      if (res.ok) await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // 2H. Submit Help desk support ticket
  const handleSubmitTicket = async (ticketPayload: any) => {
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticketPayload)
      });
      if (res.ok) await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAnswerTicket = async (id: string, answerText: string) => {
    try {
      const res = await fetch(`/api/support/${id}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answerText })
      });
      if (res.ok) await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // 2I. Submit lesson comment discussions
  const handleAddComment = async (commentPayload: any) => {
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(commentPayload)
      });
      if (res.ok) await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // 2J. Issue course Certificate
  const handleIssueCertificate = async (certPayload: any) => {
    try {
      const res = await fetch('/api/certificates/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(certPayload)
      });
      if (res.ok) {
        await fetchData();
        alert('Certificado oficial premium de conclusão emitido e autenticado com sucesso!');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 3. MAIN RENDER SWITCHER

  return (
    <div className="min-h-screen bg-brand-paper flex flex-col font-sans text-brand-ink antialiased selection:bg-brand-wood selection:text-white" id="main-app-shell">
      
      {/* 2. MAIN HEADER BAR */}
      <header className="glass border-b border-brand-wood/10 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          <div 
            onClick={() => {
              setCheckoutProduct(null);
              setFreePreviewLesson(null);
            }}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center bg-white shadow-md border border-brand-clay/10 group-hover:scale-105 transition-all duration-300">
              <img 
                src={getDirectDriveUrl("https://drive.google.com/file/d/1BEZWW-yg4axZKVhIo_Y9GlRgeGQ3xeqi/view?usp=sharing")} 
                alt="Logo Andrew Lemos" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <span className="font-serif font-semibold text-base text-brand-ink tracking-tight block leading-tight">Academia de Artes</span>
              <span className="font-serif font-semibold text-base text-brand-ink tracking-tight block leading-tight">Andrew Lemos</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Direct download links - ONLY visible and accessible to the admin/producer */}
            {currentUser?.role === 'admin' && (
              <div className="flex items-center gap-2">
                <a 
                  href="/api/download-project" 
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-full font-sans font-bold text-[11px] tracking-wide transition-all border border-amber-200 cursor-pointer shadow-sm shadow-amber-500/5"
                  id="btn-download-targz"
                  title="Baixar projeto completo como TAR.GZ (extraia com tar -xzf)"
                >
                  <Download className="w-3 h-3" />
                  <span>Exportar TAR.GZ</span>
                </a>
                <a 
                  href="/api/download-zip" 
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded-full font-sans font-bold text-[11px] tracking-wide transition-all border border-emerald-200 cursor-pointer shadow-sm shadow-emerald-500/5"
                  id="btn-download-zip"
                  title="Baixar projeto completo como ZIP (extraia com unzip)"
                >
                  <Download className="w-3 h-3" />
                  <span>Exportar ZIP</span>
                </a>
              </div>
            )}

            {currentUser ? (
              <div className="flex items-center gap-3">
                <img 
                  src={getDirectDriveUrl(currentUser.avatarUrl) || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop"} 
                  alt={currentUser.name} 
                  referrerPolicy="no-referrer"
                  className="w-9 h-9 rounded-full object-cover border border-brand-wood/20 shadow-sm"
                />
                <div className="hidden sm:block text-right">
                  <span className="font-serif font-bold text-xs text-brand-ink block leading-tight">{currentUser.name}</span>
                  <span className={`text-[9px] font-sans font-bold uppercase ${
                    currentUser.role === 'admin' ? 'text-brand-wood' : 'text-brand-clay'
                  }`}>
                    {currentUser.role === 'admin' ? 'Professor / Produtor' : 'Membro da Academia'}
                  </span>
                </div>
                {auth.currentUser && (
                  <button
                    onClick={() => signOut(auth)}
                    className="p-2 text-brand-clay hover:text-red-600 rounded-full hover:bg-red-50 transition-all ml-1 cursor-pointer"
                    title="Sair da Conta"
                    id="btn-logout"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="hidden sm:inline-block text-[10px] text-brand-clay font-sans font-bold uppercase tracking-wider bg-white/60 px-3 py-1.5 rounded-full border border-brand-clay/10">
                  Acesso Visitante
                </span>
                <button
                  onClick={() => setAuthModalOpen(true)}
                  className="bg-brand-wood hover:bg-brand-clay text-white px-4 py-2 rounded-full font-sans font-semibold text-xs tracking-wide transition-all shadow-md shadow-brand-wood/10 flex items-center gap-1.5 cursor-pointer"
                  id="btn-login-header"
                >
                  <Key className="w-3.5 h-3.5" />
                  Entrar
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 3. MAIN WORKSPACE / CONTENT VIEWER */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-96 space-y-4">
            <RefreshCw className="w-8 h-8 text-brand-wood animate-spin" />
            <p className="text-xs text-brand-clay font-bold uppercase tracking-widest">Sintonizando ateliê orgânico...</p>
          </div>
        ) : (
          <>
            {/* PUBLIC VISITORS VIEW / PUBLIC CATALOG */}
            {currentRole === 'visitor' && (
              <>
                {checkoutProduct ? (
                  <Checkout 
                    product={checkoutProduct}
                    productType={checkoutType}
                    currentUser={currentUser || users.find(u => u.role === 'student') || users[0]}
                    coupons={coupons}
                    onCancel={() => setCheckoutProduct(null)}
                    onPaymentSuccess={() => {
                      setCheckoutProduct(null);
                      setCurrentRole('student');
                    }}
                  />
                ) : freePreviewLesson && freePreviewCourse ? (
                  /* RENDER LESSON CAMPAIGN FREE PREVIEW VIEW FOR Public Visitors */
                  <div className="space-y-6" id="visitor-free-preview">
                    <div className="flex justify-between items-center border-b border-brand-wood/10 pb-4 flex-wrap gap-3">
                      <div>
                        <span className="inline-flex items-center gap-1 bg-brand-clay/10 text-brand-wood border border-brand-clay/20 px-3 py-1 rounded-full text-[10px] font-sans font-bold uppercase tracking-widest animate-pulse">
                          Demonstração Gratuita
                        </span>
                        <h1 className="text-2xl md:text-3xl font-serif font-bold text-brand-ink mt-2">{freePreviewLesson.title}</h1>
                        <p className="text-xs text-brand-clay mt-1">Este módulo faz parte do curso: <strong className="font-serif">{freePreviewCourse.title}</strong></p>
                      </div>
                      <button
                        onClick={() => {
                          setCheckoutProduct(freePreviewCourse);
                          setCheckoutType('course');
                        }}
                        className="bg-brand-wood text-white px-6 py-3 rounded-full font-sans font-medium text-xs hover:bg-brand-clay transition-all flex items-center justify-center gap-2 group shadow-lg shadow-brand-wood/20 whitespace-nowrap"
                      >
                        Matricular no Curso Completo <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                      <div className="lg:col-span-8 space-y-6">
                        <div className="bg-brand-ink rounded-3xl overflow-hidden aspect-video border border-brand-wood/10 shadow-lg relative">
                          <video 
                            src={freePreviewLesson.videoUrl} 
                            controls 
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="bg-white p-6 rounded-3xl border border-brand-wood/5 shadow-sm space-y-4">
                          <h3 className="font-serif font-bold text-brand-ink text-base">Resumo Teórico da Aula</h3>
                          <div className="markdown-body">
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
                              {cleanCitations(freePreviewLesson.textContent)}
                            </Markdown>
                          </div>
                        </div>
                      </div>

                      <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-brand-wood/5 shadow-sm space-y-4 h-fit">
                        <h4 className="font-serif font-semibold text-brand-ink text-sm">Aulas Demonstrativas</h4>
                        <div className="space-y-2">
                          {lessons.filter(l => freePreviewCourse.freeModules.includes(l.moduleId)).map((les, idx) => (
                            <div 
                              key={les.id}
                              onClick={() => setFreePreviewLesson(les)}
                              className={`p-3 rounded-2xl border cursor-pointer text-xs transition-all flex items-center justify-between ${
                                les.id === freePreviewLesson.id 
                                  ? 'border-brand-wood bg-brand-paper text-brand-wood font-semibold' 
                                  : 'border-brand-wood/5 text-brand-clay hover:bg-brand-paper'
                              }`}
                            >
                              <span>{idx + 1}. {les.title}</span>
                              <span className="text-[10px] text-brand-clay/60">{les.duration || '15m'}</span>
                            </div>
                          ))}
                        </div>

                        <button 
                          onClick={() => { setFreePreviewLesson(null); setFreePreviewCourse(null); }}
                          className="w-full py-3 bg-brand-paper hover:bg-brand-wood/5 text-brand-wood border border-brand-wood/20 rounded-full text-xs font-semibold uppercase tracking-wider transition-all"
                        >
                          Voltar ao Catálogo
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <VisitorCatalog 
                    courses={courses}
                    modules={modules}
                    lessons={lessons}
                    apostilas={apostilas}
                    onSelectCourse={(course) => {
                      setCheckoutProduct(course);
                      setCheckoutType('course');
                    }}
                    onSelectApostila={(book) => {
                      setCheckoutProduct(book);
                      setCheckoutType('apostila');
                    }}
                    onStartFreeLesson={(lesson, course) => {
                      setFreePreviewLesson(lesson);
                      setFreePreviewCourse(course);
                    }}
                  />
                )}
              </>
            )}

            {/* SECURE REGISTERED STUDENT PORTAL VIEW */}
            {currentRole === 'student' && currentUser && (
              <StudentPortal 
                currentUser={currentUser}
                courses={courses}
                modules={modules}
                lessons={lessons}
                apostilas={apostilas}
                progress={progress}
                onToggleComplete={handleToggleComplete}
                onToggleFavorite={handleToggleFavorite}
                comments={comments}
                onAddComment={handleAddComment}
                certificates={certificates}
                onIssueCertificate={handleIssueCertificate}
                sales={sales}
                supportTickets={supportTickets}
                onSubmitTicket={handleSubmitTicket}
              />
            )}

            {/* CREATOR/ADMIN PARENT WORKSPACE */}
            {currentRole === 'admin' && currentUser && (
              <AdminPanel 
                courses={courses}
                modules={modules}
                lessons={lessons}
                apostilas={apostilas}
                sales={sales}
                coupons={coupons}
                users={users}
                supportTickets={supportTickets}
                onAddCourse={handleAddCourse}
                onDeleteCourse={handleDeleteCourse}
                onAddModule={handleAddModule}
                onDeleteModule={handleDeleteModule}
                onAddLesson={handleAddLesson}
                onDeleteLesson={handleDeleteLesson}
                onAddApostila={handleAddApostila}
                onDeleteApostila={handleDeleteApostila}
                onApproveSale={handleApproveSale}
                onAddCoupon={handleAddCoupon}
                onDeleteCoupon={handleDeleteCoupon}
                onAnswerTicket={handleAnswerTicket}
              />
            )}
          </>
        )}
      </main>

      {/* 4. FOOTER */}
      <footer className="bg-white border-t border-brand-wood/10 py-8 mt-12 text-center text-xs text-brand-clay font-sans">
        <p className="font-serif text-sm font-semibold text-brand-ink">Academia de Artes Andrew Lemos</p>
        <p className="mt-1">© 2026. Cursos e apostilas de artes plásticas de visualização protegida. Todos os direitos reservados.</p>
        <p className="mt-2 text-[10px] text-brand-clay/60 uppercase tracking-widest font-mono">Infoprodutos de visualização protegida</p>
      </footer>

      {/* Auth Modal overlay */}
      <AuthModal 
        isOpen={authModalOpen} 
        onClose={() => setAuthModalOpen(false)} 
        onSuccess={() => fetchData()} 
      />
    </div>
  );
}
