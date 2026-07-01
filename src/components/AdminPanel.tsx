import React, { useState } from 'react';
import { Course, Module, Lesson, Apostila, Sale, Coupon, User, SupportTicket } from '../types';
import { 
  LayoutDashboard, BookOpen, FileText, Users, ShoppingCart, Ticket, 
  HelpCircle, Sparkles, Plus, Trash2, Edit3, DollarSign, Award, CheckCircle2, 
  ArrowUpRight, AlertCircle, RefreshCw, Star, Loader2, Send, Eye, X, ChevronRight, ShieldAlert,
  MessageSquare, Shield, Lock, Unlock, Clock, UserCheck, UserX
} from 'lucide-react';
import { getDirectDriveUrl } from '../utils/image';
import { cleanCitations } from '../utils/text';
import { FileUploader } from './FileUploader';
import { apiFetch } from '../utils/firebase';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const fetch = apiFetch;


interface AdminPanelProps {
  courses: Course[];
  modules: Module[];
  lessons: Lesson[];
  apostilas: Apostila[];
  sales: Sale[];
  coupons: Coupon[];
  users: User[];
  supportTickets: SupportTicket[];
  comments?: any[];
  certificates?: any[];
  currentUser?: User;
  onAddCourse: (course: Course) => void;
  onDeleteCourse: (id: string) => void;
  onAddModule: (mod: Module) => void;
  onDeleteModule: (id: string) => void;
  onAddLesson: (lesson: Lesson) => void;
  onDeleteLesson: (id: string) => void;
  onAddApostila: (book: Apostila) => void;
  onDeleteApostila: (id: string) => void;
  onApproveSale: (id: string) => void;
  onAddCoupon: (coupon: Coupon) => void;
  onDeleteCoupon: (id: string) => void;
  onAnswerTicket: (id: string, answerText: string) => void;
  onUpdateUser: (id: string, userPayload: any) => void;
  onDeleteUser: (id: string) => void;
  onUpdateSale: (id: string, salePayload: any) => void;
  onCreateSale: (salePayload: any) => void;
  onDeleteSale: (id: string) => void;
  onDeleteComment: (id: string) => void;
  onDeleteCertificate: (id: string) => void;
  onIssueCertificate: (certPayload: any) => void;
  onAddComment: (commentPayload: any) => void;
}

export default function AdminPanel({
  courses,
  modules,
  lessons,
  apostilas,
  sales,
  coupons,
  users,
  supportTickets,
  comments = [],
  certificates = [],
  currentUser,
  onAddCourse,
  onDeleteCourse,
  onAddModule,
  onDeleteModule,
  onAddLesson,
  onDeleteLesson,
  onAddApostila,
  onDeleteApostila,
  onApproveSale,
  onAddCoupon,
  onDeleteCoupon,
  onAnswerTicket,
  onUpdateUser,
  onDeleteUser,
  onUpdateSale,
  onCreateSale,
  onDeleteSale,
  onDeleteComment,
  onDeleteCertificate,
  onIssueCertificate,
  onAddComment
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'courses' | 'ebooks' | 'sales' | 'coupons' | 'tickets' | 'users' | 'comments' | 'certificates'>('dashboard');

  // Creation/Edit states
  const [editingCourse, setEditingCourse] = useState<Partial<Course> | null>(null);
  const [editingModule, setEditingModule] = useState<Partial<Module> | null>(null);
  const [editingLesson, setEditingLesson] = useState<Partial<Lesson> | null>(null);
  const [editingApostila, setEditingApostila] = useState<Partial<Apostila> | null>(null);
  const [editingCoupon, setEditingCoupon] = useState<Partial<Coupon> | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingSale, setEditingSale] = useState<Partial<Sale> | null>(null);
  const [issuingCertificate, setIssuingCertificate] = useState<{ studentId: string; studentName: string; studentEmail: string; courseId: string; courseTitle: string } | null>(null);
  const [replyingCommentId, setReplyingCommentId] = useState<string | null>(null);
  const [commentReplyText, setCommentReplyText] = useState('');

  // Ebook Preview states
  const [previewingApostila, setPreviewingApostila] = useState<Apostila | null>(null);
  const [previewChapterIndex, setPreviewChapterIndex] = useState<number>(0);

  // Active viewing targets
  const [selectedCourseForContent, setSelectedCourseForContent] = useState<Course | null>(null);
  const [selectedModuleForLessons, setSelectedModuleForLessons] = useState<Module | null>(null);

  // Ticket replying states
  const [answeringTicketId, setAnsweringTicketId] = useState<string | null>(null);
  const [ticketReplyText, setTicketReplyText] = useState('');
  const [aiDraftLoading, setAiDraftLoading] = useState(false);

  // AI Quiz Generation status
  const [aiQuizLoading, setAiQuizLoading] = useState(false);

  // Stats Calculations
  const totalRevenue = sales.filter(s => s.paymentStatus === 'approved').reduce((acc, s) => acc + s.pricePaid, 0);
  const approvedSalesCount = sales.filter(s => s.paymentStatus === 'approved').length;
  const pendingSalesCount = sales.filter(s => s.paymentStatus === 'pending').length;
  const activeStudentsCount = users.filter(u => u.role === 'student').length;
  const openTicketsCount = supportTickets.filter(t => !t.answerText).length;

  // AI Draft support responder using Gemini API backend
  const handleGenerateAiSupportDraft = async (ticket: SupportTicket) => {
    setAiDraftLoading(true);
    try {
      const res = await fetch('/api/v1/gemini/answer-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketQueryText: ticket.queryText,
          lessonTitle: ticket.lessonTitle,
          isPractical: ticket.type === 'practical_work' || !!ticket.imageUrl,
          imageUrl: ticket.imageUrl
        })
      });
      const data = await res.json();
      if (data.draft) {
        setTicketReplyText(data.draft);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAiDraftLoading(false);
    }
  };

  // AI Quiz question generator using Gemini API backend
  const handleGenerateAiQuiz = async () => {
    if (!editingLesson || !editingLesson.title || !editingLesson.description) return;
    setAiQuizLoading(true);

    try {
      const res = await fetch('/api/v1/gemini/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonTitle: editingLesson.title,
          lessonDescription: editingLesson.description,
          lessonText: editingLesson.textContent || ''
        })
      });
      const data = await res.json();
      if (data.questions && data.questions.length > 0) {
        const generated = data.questions[0];
        const prevQuiz = editingLesson.quiz || [];
        setEditingLesson({
          ...editingLesson,
          quiz: [...prevQuiz, generated]
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAiQuizLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="admin-panel-main">
      {/* Left Sidebar Navigation */}
      <div className="lg:col-span-3 bg-white border border-brand-wood/10 rounded-3xl p-5 shadow-sm h-fit space-y-3">
        <span className="text-[10px] font-sans font-bold text-brand-clay uppercase tracking-widest px-3 block">Mestre da Academia</span>
        
        <div className="space-y-1.5 flex flex-col">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-full text-[10px] font-sans font-medium uppercase tracking-widest transition-all ${
              activeTab === 'dashboard'
                ? 'bg-brand-wood text-[#FDFCFB] shadow-md shadow-brand-wood/25'
                : 'text-brand-clay hover:bg-brand-paper hover:text-brand-wood'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" /> Geral & Métricas
          </button>

          <button
            onClick={() => setActiveTab('courses')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-full text-[10px] font-sans font-medium uppercase tracking-widest transition-all ${
              activeTab === 'courses'
                ? 'bg-brand-wood text-[#FDFCFB] shadow-md shadow-brand-wood/25'
                : 'text-brand-clay hover:bg-brand-paper hover:text-brand-wood'
            }`}
          >
            <BookOpen className="w-4 h-4" /> Meus Cursos
          </button>

          <button
            onClick={() => setActiveTab('ebooks')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-full text-[10px] font-sans font-medium uppercase tracking-widest transition-all ${
              activeTab === 'ebooks'
                ? 'bg-brand-wood text-[#FDFCFB] shadow-md shadow-brand-wood/25'
                : 'text-brand-clay hover:bg-brand-paper hover:text-brand-wood'
            }`}
          >
            <FileText className="w-4 h-4" /> Suas Apostilas
          </button>

          <button
            onClick={() => setActiveTab('sales')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-full text-[10px] font-sans font-medium uppercase tracking-widest transition-all ${
              activeTab === 'sales'
                ? 'bg-brand-wood text-[#FDFCFB] shadow-md shadow-brand-wood/25'
                : 'text-brand-clay hover:bg-brand-paper hover:text-brand-wood'
            }`}
          >
            <ShoppingCart className="w-4 h-4" /> Vendas & Alunos
            {pendingSalesCount > 0 && (
              <span className="ml-auto bg-brand-clay text-[#FDFCFB] font-bold px-2 py-0.5 rounded-full text-[9px]">{pendingSalesCount}</span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('coupons')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-full text-[10px] font-sans font-medium uppercase tracking-widest transition-all ${
              activeTab === 'coupons'
                ? 'bg-brand-wood text-[#FDFCFB] shadow-md shadow-brand-wood/25'
                : 'text-brand-clay hover:bg-brand-paper hover:text-brand-wood'
            }`}
          >
            <Ticket className="w-4 h-4" /> Cupons de Desconto
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-full text-[10px] font-sans font-medium uppercase tracking-widest transition-all ${
              activeTab === 'users'
                ? 'bg-brand-wood text-[#FDFCFB] shadow-md shadow-brand-wood/25'
                : 'text-brand-clay hover:bg-brand-paper hover:text-brand-wood'
            }`}
          >
            <Users className="w-4 h-4" /> Usuários & Permissões
          </button>

          <button
            onClick={() => setActiveTab('comments')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-full text-[10px] font-sans font-medium uppercase tracking-widest transition-all ${
              activeTab === 'comments'
                ? 'bg-brand-wood text-[#FDFCFB] shadow-md shadow-brand-wood/25'
                : 'text-brand-clay hover:bg-brand-paper hover:text-brand-wood'
            }`}
          >
            <MessageSquare className="w-4 h-4" /> Comentários
          </button>

          <button
            onClick={() => setActiveTab('certificates')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-full text-[10px] font-sans font-medium uppercase tracking-widest transition-all ${
              activeTab === 'certificates'
                ? 'bg-brand-wood text-[#FDFCFB] shadow-md shadow-brand-wood/25'
                : 'text-brand-clay hover:bg-brand-paper hover:text-brand-wood'
            }`}
          >
            <Award className="w-4 h-4" /> Certificados
          </button>

          <button
            onClick={() => setActiveTab('tickets')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-full text-[10px] font-sans font-medium uppercase tracking-widest transition-all ${
              activeTab === 'tickets'
                ? 'bg-brand-wood text-[#FDFCFB] shadow-md shadow-brand-wood/25'
                : 'text-brand-clay hover:bg-brand-paper hover:text-brand-wood'
            }`}
          >
            <HelpCircle className="w-4 h-4" /> Suporte & Tickets
            {openTicketsCount > 0 && (
              <span className="ml-auto bg-brand-clay/20 text-brand-wood font-bold px-2 py-0.5 rounded-full text-[9px]">{openTicketsCount}</span>
            )}
          </button>
        </div>
      </div>

      {/* Right Workspaces Content area */}
      <div className="lg:col-span-9 space-y-6">
        {/* TAB 1: DASHBOARD AND ANALYTICS */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6" id="dashboard-tab">
            <h2 className="text-xl font-serif font-bold text-brand-ink">Resumo de Atividades & Academia</h2>

            {/* Metrics cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-brand-paper border border-brand-wood/10 p-5 rounded-3xl shadow-sm space-y-1.5">
                <span className="text-[9px] text-brand-clay font-bold uppercase tracking-widest block font-sans">Faturamento</span>
                <div className="flex justify-between items-center">
                  <span className="text-xl font-serif font-bold text-brand-ink">R$ {totalRevenue},00</span>
                  <div className="p-2 bg-brand-wood/10 text-brand-wood rounded-full"><DollarSign className="w-4 h-4" /></div>
                </div>
              </div>

              <div className="bg-brand-paper border border-brand-wood/10 p-5 rounded-3xl shadow-sm space-y-1.5">
                <span className="text-[9px] text-brand-clay font-bold uppercase tracking-widest block font-sans">Alunos Próprios</span>
                <div className="flex justify-between items-center">
                  <span className="text-xl font-serif font-bold text-brand-ink">{activeStudentsCount}</span>
                  <div className="p-2 bg-brand-wood/10 text-brand-wood rounded-full"><Users className="w-4 h-4" /></div>
                </div>
              </div>

              <div className="bg-brand-paper border border-brand-wood/10 p-5 rounded-3xl shadow-sm space-y-1.5">
                <span className="text-[9px] text-brand-clay font-bold uppercase tracking-widest block font-sans">Matrículas</span>
                <div className="flex justify-between items-center">
                  <span className="text-xl font-serif font-bold text-brand-ink">{approvedSalesCount}</span>
                  <div className="p-2 bg-brand-wood/10 text-brand-wood rounded-full"><CheckCircle2 className="w-4 h-4" /></div>
                </div>
              </div>

              <div className="bg-brand-paper border border-brand-wood/10 p-5 rounded-3xl shadow-sm space-y-1.5">
                <span className="text-[9px] text-brand-clay font-bold uppercase tracking-widest block font-sans">Suportes</span>
                <div className="flex justify-between items-center">
                  <span className="text-xl font-serif font-bold text-brand-ink">{openTicketsCount}</span>
                  <div className="p-2 bg-brand-wood/10 text-brand-wood rounded-full"><HelpCircle className="w-4 h-4" /></div>
                </div>
              </div>
            </div>

            {/* Custom Visual Growth bar chart */}
            <div className="bg-white p-6 rounded-3xl border border-brand-wood/10 shadow-sm space-y-4">
              <h3 className="font-serif font-bold text-brand-ink text-sm">Cronograma de Vendas Recentes</h3>
              <div className="h-44 flex items-end gap-6 pt-4 border-b border-brand-wood/5">
                <div className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full bg-brand-paper rounded-t-2xl h-12 relative group hover:bg-brand-clay/10 transition-all border border-brand-wood/5">
                    <div className="absolute inset-x-0 bottom-0 bg-brand-clay/40 rounded-t-xl h-4 flex items-center justify-center">
                      <span className="absolute -top-7 text-[9px] bg-brand-ink text-white px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-all font-mono">R$ 150</span>
                    </div>
                  </div>
                  <span className="text-[9px] font-sans font-bold text-brand-clay uppercase tracking-widest">Abril</span>
                </div>
                <div className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full bg-brand-paper rounded-t-2xl h-24 relative group hover:bg-brand-clay/10 transition-all border border-brand-wood/5">
                    <div className="absolute inset-x-0 bottom-0 bg-brand-clay/50 rounded-t-xl h-10 flex items-center justify-center">
                      <span className="absolute -top-7 text-[9px] bg-brand-ink text-white px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-all font-mono">R$ 380</span>
                    </div>
                  </div>
                  <span className="text-[9px] font-sans font-bold text-brand-clay uppercase tracking-widest">Maio</span>
                </div>
                <div className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full bg-brand-clay/10 rounded-t-2xl h-36 relative group hover:bg-brand-clay/20 transition-all border border-brand-wood/10">
                    <div className="absolute inset-x-0 bottom-0 bg-brand-wood rounded-t-xl h-28 flex items-center justify-center">
                      <span className="absolute -top-7 text-[9px] bg-brand-ink text-white px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-all font-mono">R$ {totalRevenue || 1200}</span>
                    </div>
                  </div>
                  <span className="text-[9px] font-sans font-black text-brand-wood uppercase tracking-widest">Junho</span>
                </div>
              </div>
            </div>

            {/* Recent list transactions */}
            <div className="bg-white rounded-3xl border border-brand-wood/10 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-brand-wood/5 flex justify-between items-center bg-brand-paper/50">
                <h3 className="font-serif font-bold text-brand-ink text-sm">Transações de Alunos Recentes</h3>
                <span className="text-[9px] bg-brand-wood/10 text-brand-wood px-2.5 py-1 rounded-full font-bold uppercase tracking-wider font-sans">Histórico de Liberações</span>
              </div>
              <div className="divide-y divide-brand-wood/5">
                {sales.slice().reverse().map(sale => (
                  <div key={sale.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs font-sans">
                    <div>
                      <span className="font-bold text-brand-ink block">{sale.studentName} ({sale.studentEmail})</span>
                      <span className="text-brand-clay text-[10px]">Item: {sale.productTitle}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-brand-wood font-mono">R$ {sale.pricePaid},00</span>
                      <span className={`px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wider ${
                        sale.paymentStatus === 'approved' ? 'bg-brand-wood/10 text-brand-wood' : 'bg-brand-clay/10 text-brand-clay'
                      }`}>
                        {sale.paymentStatus === 'approved' ? 'Aprovado' : 'Aguardando'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: COURSE, MODULE, LESSON MANAGEMENT */}
        {activeTab === 'courses' && (
          <div className="space-y-6" id="courses-tab">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-serif font-bold text-brand-ink">Gerenciamento de Cursos</h2>
              <button
                onClick={() => setEditingCourse({ id: '', title: '', description: '', coverUrl: '', price: 197, category: 'Artesanato', freeModules: [], status: 'ativo' })}
                className="inline-flex items-center gap-1.5 bg-brand-wood hover:bg-brand-clay text-[#FDFCFB] text-[10px] font-sans font-medium uppercase tracking-widest px-5 py-2.5 rounded-full transition-all shadow-md"
              >
                <Plus className="w-4 h-4" /> Novo Curso
              </button>
            </div>

            {/* Editing/Creation course form */}
            {editingCourse && (
              <div className="bg-brand-paper p-6 rounded-3xl border border-brand-wood/10 space-y-4">
                <h3 className="font-serif font-bold text-brand-ink text-sm">{editingCourse.id ? 'Modificar Curso' : 'Entalhar Novo Curso'}</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                  <div className="space-y-1">
                    <label className="font-bold text-brand-clay uppercase tracking-wider text-[9px]">Título do Curso</label>
                    <input 
                      type="text" 
                      value={editingCourse.title || ''}
                      onChange={e => setEditingCourse({ ...editingCourse, title: e.target.value })}
                      className="w-full p-2.5 bg-white border border-brand-wood/15 rounded-xl text-brand-ink"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-brand-clay uppercase tracking-wider text-[9px]">Preço (R$)</label>
                    <input 
                      type="number" 
                      value={editingCourse.price || 0}
                      onChange={e => setEditingCourse({ ...editingCourse, price: Number(e.target.value) })}
                      className="w-full p-2.5 bg-white border border-brand-wood/15 rounded-xl text-brand-ink"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-brand-clay uppercase tracking-wider text-[9px]">Categoria</label>
                    <input 
                      type="text" 
                      value={editingCourse.category || ''}
                      onChange={e => setEditingCourse({ ...editingCourse, category: e.target.value })}
                      className="w-full p-2.5 bg-white border border-brand-wood/15 rounded-xl text-brand-ink"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-brand-clay uppercase tracking-wider text-[9px]">Imagem de Capa do Curso</label>
                    <FileUploader
                      allowedTypes="image"
                      maxSizeMB={5}
                      currentUrl={editingCourse.coverUrl || ''}
                      onUploadSuccess={(url) => setEditingCourse({ ...editingCourse, coverUrl: url })}
                      onDeleteSuccess={() => setEditingCourse({ ...editingCourse, coverUrl: '' })}
                    />
                    <input 
                      type="text" 
                      value={editingCourse.coverUrl || ''}
                      onChange={e => setEditingCourse({ ...editingCourse, coverUrl: e.target.value })}
                      placeholder="Ou cole uma URL externa da capa..."
                      className="w-full p-2 bg-brand-paper border border-brand-wood/15 rounded-lg text-xs text-brand-ink mt-1"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <label className="font-bold text-brand-clay uppercase tracking-wider text-[9px]">Descrição Curta</label>
                    <textarea 
                      value={editingCourse.description || ''}
                      onChange={e => setEditingCourse({ ...editingCourse, description: e.target.value })}
                      className="w-full p-2.5 bg-white border border-brand-wood/15 rounded-xl text-brand-ink"
                      rows={2}
                    />
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <label className="font-bold text-brand-clay uppercase tracking-wider text-[9px]">Descrição Detalhada / Ementa Completa</label>
                    <textarea 
                      value={editingCourse.longDescription || ''}
                      onChange={e => setEditingCourse({ ...editingCourse, longDescription: e.target.value })}
                      className="w-full p-2.5 bg-white border border-brand-wood/15 rounded-xl text-brand-ink"
                      rows={3}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 text-[10px] uppercase font-sans tracking-widest font-medium">
                  <button onClick={() => setEditingCourse(null)} className="px-4 py-2 bg-white border border-brand-wood/10 rounded-full">Cancelar</button>
                  <button 
                    onClick={() => { onAddCourse(editingCourse as Course); setEditingCourse(null); }}
                    className="px-4 py-2 bg-brand-wood hover:bg-brand-clay text-white rounded-full"
                  >
                    Salvar Curso
                  </button>
                </div>
              </div>
            )}

            {/* Courses list */}
            <div className="grid grid-cols-1 gap-4">
              {courses.map(course => {
                const totalModCount = modules.filter(m => m.courseId === course.id).length;
                return (
                  <div key={course.id} className="bg-white border border-brand-wood/10 rounded-3xl p-6 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="flex gap-4 items-center">
                        <img 
                          src={getDirectDriveUrl(course.coverUrl)} 
                          alt={course.title}
                          referrerPolicy="no-referrer"
                          className="w-14 h-14 object-cover rounded-2xl border border-brand-wood/5"
                        />
                        <div>
                          <h3 className="font-serif font-bold text-brand-ink text-base leading-snug flex items-center gap-2 flex-wrap">
                            {course.title}
                            {course.status === 'breve' && (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-sans font-bold uppercase tracking-wider rounded-md border border-amber-200">
                                Em Breve
                              </span>
                            )}
                            {course.status === 'desativado' && (
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[9px] font-sans font-bold uppercase tracking-wider rounded-md border border-gray-200">
                                Desativado
                              </span>
                            )}
                            {(course.status === 'ativo' || !course.status) && (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-sans font-bold uppercase tracking-wider rounded-md border border-emerald-200">
                                Ativo
                              </span>
                            )}
                          </h3>
                          <span className="text-[10px] text-brand-clay font-sans font-medium">{course.category} • R$ {course.price},00 • {totalModCount} módulos</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* Status Quick Selector */}
                        <div className="flex items-center gap-1.5 bg-brand-paper px-3 py-1.5 rounded-full border border-brand-wood/10 h-9">
                          <span className="text-[9px] font-sans font-extrabold text-brand-clay uppercase tracking-wider">Status:</span>
                          <select
                            value={course.status || 'ativo'}
                            onChange={e => onAddCourse({ ...course, status: e.target.value as 'ativo' | 'breve' | 'desativado' })}
                            className={`bg-transparent text-[10px] font-sans font-black uppercase tracking-wider border-none outline-none cursor-pointer focus:ring-0 p-0 pr-1 ${
                              course.status === 'breve' ? 'text-amber-800' :
                              course.status === 'desativado' ? 'text-gray-500' : 'text-emerald-800'
                            }`}
                          >
                            <option value="ativo" className="text-emerald-800 bg-white font-sans font-semibold">Ativo</option>
                            <option value="breve" className="text-amber-800 bg-white font-sans font-semibold">Em Breve</option>
                            <option value="desativado" className="text-gray-600 bg-white font-sans font-semibold">Desativado</option>
                          </select>
                        </div>

                        <button
                          onClick={() => setSelectedCourseForContent(course)}
                          className="border border-brand-wood text-brand-wood hover:bg-brand-wood hover:text-white font-sans font-medium text-[9px] uppercase tracking-widest px-4 py-2 rounded-full transition-all h-9 flex items-center"
                        >
                          Grade Curricular
                        </button>
                        <button
                          onClick={() => setEditingCourse(course)}
                          className="bg-brand-paper hover:bg-brand-clay/10 text-brand-wood p-2 rounded-full border border-brand-wood/10 h-9 w-9 flex items-center justify-center"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteCourse(course.id)}
                          className="bg-red-50 hover:bg-red-100 text-red-600 p-2 rounded-full border border-red-100 h-9 w-9 flex items-center justify-center"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Manage Curriculum Accordion (Expanded view per course) */}
                    {selectedCourseForContent && selectedCourseForContent.id === course.id && (
                      <div className="p-5 bg-brand-paper rounded-3xl border border-brand-wood/10 space-y-4 text-xs font-sans">
                        <div className="flex justify-between items-center border-b border-brand-wood/10 pb-3">
                          <h4 className="font-serif font-bold text-brand-ink text-sm">Módulos do Curso</h4>
                          <button
                            onClick={() => setEditingModule({ id: '', courseId: course.id, title: '', description: '', order: totalModCount + 1 })}
                            className="bg-brand-wood hover:bg-brand-clay text-white text-[9px] uppercase font-sans tracking-widest px-3 py-1.5 rounded-full flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> Adicionar Módulo
                          </button>
                        </div>

                        {/* Edit Module form */}
                        {editingModule && editingModule.courseId === course.id && (
                          <div className="bg-white p-4 rounded-2xl border border-brand-wood/10 space-y-3">
                            <h5 className="font-serif font-bold text-brand-ink">{editingModule.id ? 'Editar Módulo' : 'Novo Módulo'}</h5>
                            <div className="grid grid-cols-2 gap-3 text-[10px]">
                              <div className="space-y-1">
                                <label className="font-bold text-brand-clay uppercase">Título do Módulo</label>
                                <input 
                                  type="text" 
                                  value={editingModule.title || ''}
                                  onChange={e => setEditingModule({ ...editingModule, title: e.target.value })}
                                  className="w-full p-2 bg-brand-paper/50 border border-brand-wood/15 rounded-lg text-xs text-brand-ink"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="font-bold text-brand-clay uppercase">Ordem</label>
                                <input 
                                  type="number" 
                                  value={editingModule.order || 1}
                                  onChange={e => setEditingModule({ ...editingModule, order: Number(e.target.value) })}
                                  className="w-full p-2 bg-brand-paper/50 border border-brand-wood/15 rounded-lg text-xs text-brand-ink"
                                />
                              </div>
                              <div className="col-span-2 space-y-1">
                                <label className="font-bold text-brand-clay uppercase">Descrição Curta</label>
                                <input 
                                  type="text" 
                                  value={editingModule.description || ''}
                                  onChange={e => setEditingModule({ ...editingModule, description: e.target.value })}
                                  className="w-full p-2 bg-brand-paper/50 border border-brand-wood/15 rounded-lg text-xs text-brand-ink"
                                />
                              </div>
                            </div>
                            
                            <div className="flex justify-end gap-2 text-[9px] uppercase tracking-wider font-semibold">
                              <button onClick={() => setEditingModule(null)} className="px-3 py-1.5 bg-brand-paper rounded-full border border-brand-wood/5">Cancelar</button>
                              <button
                                onClick={() => { onAddModule(editingModule as Module); setEditingModule(null); }}
                                className="px-3 py-1.5 bg-brand-wood text-white rounded-full"
                              >
                                Salvar Módulo
                              </button>
                            </div>
                          </div>
                        )}

                        {/* List of Modules */}
                        <div className="space-y-3">
                          {modules.filter(m => m.courseId === course.id).sort((a,b) => a.order - b.order).map(mod => {
                            const modLessons = lessons.filter(l => l.moduleId === mod.id);
                            const isFree = course.freeModules.includes(mod.id);

                            return (
                              <div key={mod.id} className="bg-white p-4 rounded-2xl border border-brand-wood/5 space-y-3">
                                <div className="flex justify-between items-center">
                                  <div>
                                    <h5 className="font-serif font-bold text-brand-ink text-sm">{mod.title}</h5>
                                    <p className="text-[10px] text-brand-clay">{modLessons.length} aulas • {mod.description}</p>
                                  </div>

                                  <div className="flex gap-2 items-center">
                                    <button
                                      onClick={() => {
                                        let updatedFree = [...(course.freeModules || [])];
                                        if (isFree) {
                                          updatedFree = updatedFree.filter(id => id !== mod.id);
                                        } else {
                                          updatedFree.push(mod.id);
                                        }
                                        onAddCourse({ ...course, freeModules: updatedFree });
                                      }}
                                      className={`px-3 py-1 rounded-full font-bold text-[8px] uppercase border tracking-wider flex items-center gap-1 ${
                                        isFree 
                                          ? 'bg-brand-wood/10 border-brand-wood/20 text-brand-wood'
                                          : 'bg-brand-paper border-brand-wood/10 text-brand-clay hover:text-brand-wood'
                                      }`}
                                    >
                                      {isFree ? 'Demonstração: Ativo' : 'Ativar Demonstração'}
                                    </button>
                                    <button
                                      onClick={() => setSelectedModuleForLessons(selectedModuleForLessons?.id === mod.id ? null : mod)}
                                      className="bg-brand-wood text-white px-3 py-1 rounded-full font-bold text-[9px] uppercase tracking-wider"
                                    >
                                      Aulas
                                    </button>
                                    <button onClick={() => setEditingModule(mod)} className="text-brand-clay hover:text-brand-wood"><Edit3 className="w-3.5 h-3.5" /></button>
                                    <button onClick={() => onDeleteModule(mod.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-3.5 h-3.5" /></button>
                                  </div>
                                </div>

                                {/* TAB 2B: LESSONS LEVEL (ACCORDION PER MODULE) */}
                                {selectedModuleForLessons && selectedModuleForLessons.id === mod.id && (
                                  <div className="p-3 bg-brand-paper rounded-2xl border border-brand-wood/5 space-y-3">
                                    <div className="flex justify-between items-center">
                                      <span className="font-bold text-brand-wood text-[10px] uppercase tracking-wider">Aulas Registradas</span>
                                      <button
                                        onClick={() => setEditingLesson({ 
                                          id: '', 
                                          moduleId: mod.id, 
                                          courseId: course.id, 
                                          title: '', 
                                          description: '', 
                                          order: modLessons.length + 1, 
                                          videoUrl: '', 
                                          textContent: '',
                                          quiz: [],
                                          materials: [],
                                          downloadFiles: []
                                        })}
                                        className="bg-brand-wood text-white font-bold px-2.5 py-1 rounded-full text-[9px] uppercase tracking-wider"
                                      >
                                        Nova Aula
                                      </button>
                                    </div>

                                    {/* Edit / New Lesson details form */}
                                    {editingLesson && editingLesson.moduleId === mod.id && (
                                      <div className="bg-white p-4 rounded-xl border border-brand-wood/10 space-y-4">
                                        <h5 className="font-serif font-bold text-brand-ink">{editingLesson.id ? 'Modificar Detalhes da Aula' : 'Criar Nova Aula'}</h5>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[10px]">
                                          <div className="space-y-1">
                                            <label className="font-bold text-brand-clay">Título da Aula</label>
                                            <input 
                                              type="text" 
                                              value={editingLesson.title || ''}
                                              onChange={e => setEditingLesson({ ...editingLesson, title: e.target.value })}
                                              className="w-full p-2 bg-brand-paper border border-brand-wood/15 rounded-lg text-xs text-brand-ink"
                                            />
                                          </div>
                                          <div className="space-y-1">
                                            <label className="font-bold text-brand-clay">Vídeo da Aula (MP4 / WEBM)</label>
                                            <FileUploader
                                              allowedTypes="video"
                                              maxSizeMB={100}
                                              currentUrl={editingLesson.videoUrl || ''}
                                              onUploadSuccess={(url) => setEditingLesson({ ...editingLesson, videoUrl: url })}
                                              onDeleteSuccess={() => setEditingLesson({ ...editingLesson, videoUrl: '' })}
                                            />
                                            <input 
                                              type="text" 
                                              value={editingLesson.videoUrl || ''}
                                              onChange={e => setEditingLesson({ ...editingLesson, videoUrl: e.target.value })}
                                              placeholder="Ou cole uma URL externa do vídeo..."
                                              className="w-full p-2 bg-brand-paper border border-brand-wood/15 rounded-lg text-xs text-brand-ink mt-1"
                                            />
                                          </div>
                                          <div className="space-y-1">
                                            <label className="font-bold text-brand-clay">Duração (Ex: 15 min)</label>
                                            <input 
                                              type="text" 
                                              value={editingLesson.duration || ''}
                                              onChange={e => setEditingLesson({ ...editingLesson, duration: e.target.value })}
                                              className="w-full p-2 bg-brand-paper border border-brand-wood/15 rounded-lg text-xs text-brand-ink"
                                            />
                                          </div>
                                          <div className="space-y-1">
                                            <label className="font-bold text-brand-clay">Ordem</label>
                                            <input 
                                              type="number" 
                                              value={editingLesson.order || 1}
                                              onChange={e => setEditingLesson({ ...editingLesson, order: Number(e.target.value) })}
                                              className="w-full p-2 bg-brand-paper border border-brand-wood/15 rounded-lg text-xs text-brand-ink"
                                            />
                                          </div>
                                          <div className="col-span-2 space-y-1">
                                            <label className="font-bold text-brand-clay">Descrição Curta</label>
                                            <input 
                                              type="text" 
                                              value={editingLesson.description || ''}
                                              onChange={e => setEditingLesson({ ...editingLesson, description: e.target.value })}
                                              className="w-full p-2 bg-brand-paper border border-brand-wood/15 rounded-lg text-xs text-brand-ink"
                                            />
                                          </div>
                                          <div className="col-span-2 space-y-1">
                                            <div className="flex justify-between items-center">
                                              <label className="font-bold text-brand-clay text-xs">Conteúdo Teórico (Markdown)</label>
                                              <span className="text-[9px] text-brand-wood font-bold uppercase tracking-wider bg-brand-clay/10 px-2 py-0.5 rounded-full">Suporta Markdown</span>
                                            </div>
                                            <textarea 
                                              value={editingLesson.textContent || ''}
                                              onChange={e => setEditingLesson({ ...editingLesson, textContent: e.target.value })}
                                              className="w-full p-3 bg-brand-paper border border-brand-wood/15 rounded-xl text-xs text-brand-ink focus:outline-none focus:ring-1 focus:ring-brand-wood font-mono leading-relaxed"
                                              placeholder="# Título da Seção&#10;&#10;Escreva ou cole o conteúdo teórico aqui...&#10;&#10;- Item 1&#10;- Item 2&#10;&#10;Use **negrito** ou *itálico* livremente."
                                              rows={8}
                                            />
                                            {editingLesson.textContent && (
                                              <div className="mt-2 bg-brand-paper border border-brand-wood/10 rounded-2xl p-4 space-y-2">
                                                <div className="text-[9px] font-sans font-bold text-brand-clay uppercase tracking-widest border-b border-brand-wood/5 pb-1">
                                                  Pré-visualização do Formato
                                                </div>
                                                <div className="markdown-body text-xs leading-relaxed max-h-56 overflow-y-auto bg-white p-4 rounded-xl border border-brand-wood/5">
                                                  <Markdown 
                                                    remarkPlugins={[remarkGfm]}
                                                    components={{
                                                      img: ({ src, ...props }) => (
                                                        <img 
                                                          src={getDirectDriveUrl(src)} 
                                                          {...props} 
                                                          referrerPolicy="no-referrer" 
                                                          className="max-w-full my-4 rounded-xl border border-brand-wood/10 shadow-sm mx-auto" 
                                                        />
                                                      )
                                                    }}
                                                  >
                                                    {cleanCitations(editingLesson.textContent)}
                                                  </Markdown>
                                                </div>
                                              </div>
                                            )}
                                          </div>

                                          {/* PDF Materials / Apostilas Section */}
                                          <div className="col-span-2 border-t border-brand-wood/10 pt-3 space-y-2">
                                            <label className="font-bold text-brand-clay text-xs block">Materiais de Apoio / Apostilas PDF</label>
                                            
                                            {editingLesson.materials && editingLesson.materials.length > 0 && (
                                              <div className="space-y-1.5 mb-2">
                                                {editingLesson.materials.map((mat) => (
                                                  <div key={mat.id} className="bg-brand-paper p-2 rounded-xl border border-brand-wood/5 flex justify-between items-center text-xs">
                                                    <div className="flex items-center gap-1.5 truncate">
                                                      <FileText className="w-3.5 h-3.5 text-brand-wood" />
                                                      <span className="font-semibold text-brand-ink truncate text-[11px]">{mat.name}</span>
                                                      <span className="text-brand-clay text-[9px]">({mat.size})</span>
                                                    </div>
                                                    <button
                                                      type="button"
                                                      onClick={() => {
                                                        const updatedMaterials = (editingLesson.materials || []).filter(m => m.id !== mat.id);
                                                        setEditingLesson({ ...editingLesson, materials: updatedMaterials });
                                                      }}
                                                      className="text-red-500 hover:text-red-700 p-1"
                                                    >
                                                      <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                  </div>
                                                ))}
                                              </div>
                                            )}

                                            <FileUploader
                                              allowedTypes="pdf"
                                              maxSizeMB={15}
                                              label="Enviar Novo Arquivo de Apoio (PDF)"
                                              onUploadSuccess={(url, name, size) => {
                                                const newMaterial = {
                                                  id: `mat-${Date.now()}`,
                                                  name,
                                                  url,
                                                  size
                                                };
                                                const currentMaterials = editingLesson.materials || [];
                                                setEditingLesson({
                                                  ...editingLesson,
                                                  materials: [...currentMaterials, newMaterial]
                                                });
                                              }}
                                            />
                                          </div>
                                        </div>

                                        {/* Gemini AI Quiz Auto-generator block */}
                                        <div className="bg-gradient-to-br from-[#4A3222] to-[#2F1F15] text-[#DFD3C3] p-4 rounded-2xl border border-brand-wood/20 space-y-3">
                                          <div className="flex justify-between items-center flex-wrap gap-2">
                                            <div className="flex items-center gap-2">
                                              <Sparkles className="w-5 h-5 text-brand-clay fill-brand-clay/30" />
                                              <div>
                                                <h5 className="font-serif font-bold text-xs">Gerador de Exercícios com Gemini</h5>
                                                <p className="text-[9px] text-[#DFD3C3]/70">Cria perguntas contextuais sobre as aulas</p>
                                              </div>
                                            </div>
                                            <button
                                              type="button"
                                              disabled={aiQuizLoading || !editingLesson.title || !editingLesson.description}
                                              onClick={handleGenerateAiQuiz}
                                              className="bg-brand-wood hover:bg-brand-clay text-white font-sans text-[9px] uppercase tracking-widest px-3 py-1.5 rounded-full flex items-center gap-1 shadow-sm"
                                            >
                                              {aiQuizLoading ? (
                                                <>
                                                  <Loader2 className="w-3 h-3 animate-spin" /> Esculpindo...
                                                </>
                                              ) : (
                                                'Gerar Exercício'
                                              )}
                                            </button>
                                          </div>

                                          {editingLesson.quiz && editingLesson.quiz.length > 0 && (
                                            <div className="bg-[#1A1A1A]/50 p-3 rounded-xl border border-brand-wood/15 space-y-2 text-xs">
                                              <span className="text-[9px] text-brand-clay font-bold uppercase tracking-wider block">Exercício Criado</span>
                                              <p className="text-[11px] font-bold text-white">{editingLesson.quiz[0].question}</p>
                                              <ul className="text-[10px] text-[#DFD3C3]/80 space-y-1 list-disc list-inside pl-1">
                                                {editingLesson.quiz[0].options.map((o, k) => (
                                                  <li key={k} className={k === editingLesson.quiz?.[0]?.correctAnswerIndex ? 'text-brand-clay font-semibold' : ''}>{o}</li>
                                                ))}
                                              </ul>
                                            </div>
                                          )}
                                        </div>

                                        <div className="flex justify-end gap-2 text-[9px] uppercase tracking-wider font-semibold">
                                          <button onClick={() => setEditingLesson(null)} className="px-3 py-1.5 bg-brand-paper rounded-full border border-brand-wood/5">Cancelar</button>
                                          <button
                                            onClick={() => { onAddLesson(editingLesson as Lesson); setEditingLesson(null); }}
                                            className="px-3 py-1.5 bg-brand-wood text-white rounded-full"
                                          >
                                            Salvar Aula
                                          </button>
                                        </div>
                                      </div>
                                    )}

                                    {/* Lessons row */}
                                    <div className="space-y-1.5">
                                      {modLessons.sort((a,b) => a.order - b.order).map(les => (
                                        <div key={les.id} className="bg-white p-3 rounded-xl border border-brand-wood/5 flex justify-between items-center text-[11px]">
                                          <span className="font-bold text-brand-ink">{les.order}. {les.title}</span>
                                          <div className="flex gap-2">
                                            <button onClick={() => setEditingLesson(les)} className="text-brand-clay hover:text-brand-wood"><Edit3 className="w-3.5 h-3.5" /></button>
                                            <button onClick={() => onDeleteLesson(les.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-3.5 h-3.5" /></button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: APOSTILAS MANAGER */}
        {activeTab === 'ebooks' && (
          <div className="space-y-6" id="ebooks-tab">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-serif font-bold text-brand-ink">Gerenciamento de Apostilas</h2>
              <button
                onClick={() => setEditingApostila({ id: '', title: '', description: '', coverUrl: '', price: 49, chapters: [] })}
                className="inline-flex items-center gap-1.5 bg-brand-wood hover:bg-brand-clay text-white text-[10px] font-sans font-medium uppercase tracking-widest px-5 py-2.5 rounded-full shadow-md transition-all"
              >
                <Plus className="w-4 h-4" /> Nova Apostila
              </button>
            </div>

            {/* Edit / New ebook form */}
            {editingApostila && (
              <div className="bg-brand-paper p-6 rounded-3xl border border-brand-wood/10 space-y-4">
                <h3 className="font-serif font-bold text-brand-ink text-sm">{editingApostila.id ? 'Editar Apostila' : 'Escrever Nova Apostila'}</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                  <div className="space-y-1">
                    <label className="font-bold text-brand-clay uppercase tracking-wider text-[9px]">Título da Apostila</label>
                    <input 
                      type="text" 
                      value={editingApostila.title || ''}
                      onChange={e => setEditingApostila({ ...editingApostila, title: e.target.value })}
                      className="w-full p-2.5 bg-white border border-brand-wood/15 rounded-xl text-brand-ink"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-brand-clay uppercase tracking-wider text-[9px]">Preço (R$)</label>
                    <input 
                      type="number" 
                      value={editingApostila.price || 0}
                      onChange={e => setEditingApostila({ ...editingApostila, price: Number(e.target.value) })}
                      className="w-full p-2.5 bg-white border border-brand-wood/15 rounded-xl text-brand-ink"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-brand-clay uppercase tracking-wider text-[9px]">Imagem de Capa da Apostila</label>
                    <FileUploader
                      allowedTypes="image"
                      maxSizeMB={5}
                      currentUrl={editingApostila.coverUrl || ''}
                      onUploadSuccess={(url) => setEditingApostila({ ...editingApostila, coverUrl: url })}
                      onDeleteSuccess={() => setEditingApostila({ ...editingApostila, coverUrl: '' })}
                    />
                    <input 
                      type="text" 
                      value={editingApostila.coverUrl || ''}
                      onChange={e => setEditingApostila({ ...editingApostila, coverUrl: e.target.value })}
                      placeholder="Ou cole uma URL externa da capa..."
                      className="w-full p-2 bg-brand-paper border border-brand-wood/15 rounded-lg text-xs text-brand-ink mt-1"
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="font-bold text-brand-clay uppercase tracking-wider text-[9px]">Descrição Curta</label>
                    <input 
                      type="text" 
                      value={editingApostila.description || ''}
                      onChange={e => setEditingApostila({ ...editingApostila, description: e.target.value })}
                      className="w-full p-2.5 bg-white border border-brand-wood/15 rounded-xl text-brand-ink"
                    />
                  </div>
                </div>

                {/* Edit ebook Chapters editor block */}
                <div className="border-t border-brand-wood/10 pt-4 space-y-3 font-sans">
                  <h4 className="font-serif font-bold text-brand-ink text-xs">Capítulos e Páginas Escritas</h4>
                  <div className="space-y-3">
                    {editingApostila.chapters?.map((chap, cIdx) => (
                      <div key={chap.id || cIdx} className="bg-white p-4 rounded-2xl border border-brand-wood/10 space-y-2 text-xs">
                        <div className="flex justify-between items-center gap-3">
                          <input 
                            type="text" 
                            placeholder="Título do Capítulo" 
                            value={chap.title}
                            onChange={e => {
                              const list = [...(editingApostila.chapters || [])];
                              list[cIdx].title = e.target.value;
                              setEditingApostila({ ...editingApostila, chapters: list });
                            }}
                            className="font-serif font-bold p-1 border-b border-brand-wood/10 text-brand-ink text-xs flex-1 focus:outline-none"
                          />
                          <button 
                            onClick={() => {
                              const list = (editingApostila.chapters || []).filter((_, idx) => idx !== cIdx);
                              setEditingApostila({ ...editingApostila, chapters: list });
                            }}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <textarea
                          placeholder="Conteúdo escrito em formato HTML ou Texto Livre..."
                          value={chap.content}
                          onChange={e => {
                            const list = [...(editingApostila.chapters || [])];
                            list[cIdx].content = e.target.value;
                            setEditingApostila({ ...editingApostila, chapters: list });
                          }}
                          className="w-full p-2.5 bg-brand-paper/50 border border-brand-wood/15 rounded-xl text-brand-ink text-[11px] font-mono"
                          rows={4}
                        />
                        <div className="text-[10px] text-brand-clay flex flex-wrap gap-2 justify-between mt-1 px-1">
                          <span>💡 <strong>Inserir Imagem:</strong> Use <code>![Nome](Link da Imagem)</code> para colocar fotos no texto.</span>
                          <span className="text-brand-wood/80 font-medium font-sans">Suporta links normais ou compartilhados do Google Drive!</span>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const list = [...(editingApostila.chapters || [])];
                        list.push({ id: `ch_${Date.now()}`, title: `Capítulo ${list.length + 1}`, content: '<p>Novo conteúdo escrito...</p>' });
                        setEditingApostila({ ...editingApostila, chapters: list });
                      }}
                      className="bg-brand-wood/10 hover:bg-brand-wood/20 text-brand-wood text-[9px] uppercase tracking-wider px-3.5 py-2 rounded-full font-bold transition-all"
                    >
                      + Novo Capítulo
                    </button>
                  </div>
                </div>

                <div className="flex justify-end gap-2 text-[10px] uppercase font-sans tracking-widest font-medium">
                  <button onClick={() => setEditingApostila(null)} className="px-4 py-2 bg-white border border-brand-wood/10 rounded-full">Cancelar</button>
                  <button
                    type="button"
                    onClick={() => { 
                      setPreviewingApostila({
                        id: editingApostila.id || 'preview_id',
                        title: editingApostila.title || 'Apostila Sem Título',
                        description: editingApostila.description || '',
                        coverUrl: editingApostila.coverUrl || '',
                        price: editingApostila.price || 0,
                        chapters: editingApostila.chapters || []
                      }); 
                      setPreviewChapterIndex(0); 
                    }}
                    className="px-4 py-2 bg-brand-clay/10 text-brand-wood border border-brand-wood/10 hover:bg-brand-clay/20 transition-all rounded-full flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" /> Pré-visualizar
                  </button>
                  <button
                    onClick={() => { onAddApostila(editingApostila as Apostila); setEditingApostila(null); }}
                    className="px-4 py-2 bg-brand-wood text-white rounded-full"
                  >
                    Salvar Apostila
                  </button>
                </div>
              </div>
            )}

            {/* Apostilas Rows */}
            <div className="grid grid-cols-1 gap-4">
              {apostilas.map(book => (
                <div key={book.id} className="bg-white border border-brand-wood/10 rounded-3xl p-5 shadow-sm flex flex-col md:flex-row gap-4 justify-between md:items-center">
                  <div className="flex gap-4 items-center">
                    <img 
                      src={getDirectDriveUrl(book.coverUrl)} 
                      alt={book.title}
                      referrerPolicy="no-referrer"
                      className="w-10 h-14 object-cover rounded-xl border border-brand-wood/5 flex-shrink-0"
                    />
                    <div>
                      <h3 className="font-serif font-bold text-brand-ink text-sm leading-snug flex items-center gap-2 flex-wrap">
                        {book.title}
                        {book.status === 'breve' && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[8px] font-sans font-bold uppercase tracking-wider rounded border border-amber-200">
                            Em Breve
                          </span>
                        )}
                        {book.status === 'desativado' && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[8px] font-sans font-bold uppercase tracking-wider rounded border border-gray-200">
                            Desativado
                          </span>
                        )}
                        {(book.status === 'ativo' || !book.status) && (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[8px] font-sans font-bold uppercase tracking-wider rounded border border-emerald-200">
                            Ativo
                          </span>
                        )}
                      </h3>
                      <span className="text-[10px] text-brand-clay font-sans block mt-1">{book.chapters.length} capítulos • R$ {book.price},00</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Status Quick Selector */}
                    <div className="flex items-center gap-1.5 bg-brand-paper px-3 py-1.5 rounded-full border border-brand-wood/10 h-9">
                      <span className="text-[9px] font-sans font-extrabold text-brand-clay uppercase tracking-wider">Status:</span>
                      <select
                        value={book.status || 'ativo'}
                        onChange={e => onAddApostila({ ...book, status: e.target.value as 'ativo' | 'breve' | 'desativado' })}
                        className={`bg-transparent text-[10px] font-sans font-black uppercase tracking-wider border-none outline-none cursor-pointer focus:ring-0 p-0 pr-1 ${
                          book.status === 'breve' ? 'text-amber-800' :
                          book.status === 'desativado' ? 'text-gray-500' : 'text-emerald-800'
                        }`}
                      >
                        <option value="ativo" className="text-emerald-800 bg-white font-sans font-semibold">Ativo</option>
                        <option value="breve" className="text-amber-800 bg-white font-sans font-semibold">Em Breve</option>
                        <option value="desativado" className="text-gray-600 bg-white font-sans font-semibold">Desativado</option>
                      </select>
                    </div>

                    <button 
                      onClick={() => { setPreviewingApostila(book); setPreviewChapterIndex(0); }} 
                      className="text-brand-wood hover:bg-brand-wood/10 p-2 rounded-full border border-brand-wood/15 flex items-center gap-1.5 text-xs font-bold px-3 transition-all h-9"
                      title="Visualizar Resultado Final"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Visualizar</span>
                    </button>
                    <button onClick={() => setEditingApostila(book)} className="text-brand-clay hover:bg-brand-paper p-2 rounded-full border border-brand-wood/5 h-9 w-9 flex items-center justify-center"><Edit3 className="w-4 h-4" /></button>
                    <button onClick={() => onDeleteApostila(book.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-full border border-red-100 h-9 w-9 flex items-center justify-center"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: SALES AND SIMULATED PAYMENTS */}
        {activeTab === 'sales' && (
          <div className="space-y-6" id="sales-tab">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-serif font-bold text-brand-ink">Matrículas & Inscrições</h2>
                <p className="text-xs text-brand-clay font-sans">Gerencie vendas da plataforma ou adicione matrículas manuais diretamente para alunos.</p>
              </div>
              <button
                onClick={() => setEditingSale({ id: '', studentName: '', studentEmail: '', productId: '', productTitle: '', productType: 'course', pricePaid: 0, paymentMethod: 'manual', paymentStatus: 'approved' })}
                className="inline-flex items-center gap-1.5 bg-brand-wood hover:bg-brand-clay text-white text-[10px] font-sans font-medium uppercase tracking-widest px-5 py-2.5 rounded-full shadow-md transition-all"
              >
                <Plus className="w-4 h-4" /> Matrícula Manual
              </button>
            </div>

            {/* Sale Edit/Create form */}
            {editingSale && (
              <div className="bg-brand-paper p-6 rounded-3xl border border-brand-wood/10 space-y-4">
                <h3 className="font-serif font-bold text-brand-ink text-xs">{editingSale.id ? 'Editar Registro de Matrícula' : 'Nova Matrícula Manual'}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-sans">
                  
                  {/* Select Student or enter email */}
                  <div className="space-y-1">
                    <label className="font-bold text-brand-clay uppercase tracking-wider text-[9px]">Selecionar Usuário / Aluno</label>
                    <select
                      value={editingSale.studentEmail || ''}
                      onChange={e => {
                        const sel = users.find(u => u.email === e.target.value);
                        if (sel) {
                          setEditingSale({
                            ...editingSale,
                            studentId: sel.id,
                            studentName: sel.name,
                            studentEmail: sel.email
                          });
                        } else {
                          setEditingSale({
                            ...editingSale,
                            studentEmail: e.target.value
                          });
                        }
                      }}
                      className="w-full p-2.5 bg-white border border-brand-wood/15 rounded-xl text-brand-ink"
                    >
                      <option value="">-- Escolha um Aluno Existente --</option>
                      {users.map(u => (
                        <option key={u.id} value={u.email}>{u.name} ({u.email})</option>
                      ))}
                    </select>
                  </div>

                  {/* Manual details if no student selected */}
                  <div className="space-y-1">
                    <label className="font-bold text-brand-clay uppercase tracking-wider text-[9px]">Nome do Aluno (Ficha Manual)</label>
                    <input 
                      type="text" 
                      placeholder="Nome completo do aluno"
                      value={editingSale.studentName || ''}
                      onChange={e => setEditingSale({ ...editingSale, studentName: e.target.value })}
                      className="w-full p-2.5 bg-white border border-brand-wood/15 rounded-xl text-brand-ink"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-brand-clay uppercase tracking-wider text-[9px]">E-mail do Aluno (Ficha Manual)</label>
                    <input 
                      type="email" 
                      placeholder="aluno@email.com"
                      value={editingSale.studentEmail || ''}
                      onChange={e => setEditingSale({ ...editingSale, studentEmail: e.target.value })}
                      className="w-full p-2.5 bg-white border border-brand-wood/15 rounded-xl text-brand-ink"
                    />
                  </div>

                  {/* Product Choice */}
                  <div className="space-y-1">
                    <label className="font-bold text-brand-clay uppercase tracking-wider text-[9px]">Produto para Liberar</label>
                    <select
                      value={editingSale.productId || ''}
                      onChange={e => {
                        const val = e.target.value;
                        const split = val.split(':');
                        const pId = split[1] || '';
                        const pType = split[0] || '';
                        let pTitle = '';
                        let pPrice = 0;

                        if (pType === 'course') {
                          const target = courses.find(c => c.id === pId);
                          pTitle = target?.title || '';
                          pPrice = target?.price || 0;
                        } else if (pType === 'ebook') {
                          const target = apostilas.find(a => a.id === pId);
                          pTitle = target?.title || '';
                          pPrice = target?.price || 0;
                        }

                        setEditingSale({
                          ...editingSale,
                          productId: pId,
                          productType: (pType === 'ebook' ? 'apostila' : 'course') as any,
                          productTitle: pTitle,
                          pricePaid: pPrice
                        });
                      }}
                      className="w-full p-2.5 bg-white border border-brand-wood/15 rounded-xl text-brand-ink"
                    >
                      <option value="">-- Escolha um Curso ou Apostila --</option>
                      <optgroup label="Cursos Livres">
                        {courses.map(c => (
                          <option key={c.id} value={`course:${c.id}`}>{c.title} (R$ {c.price})</option>
                        ))}
                      </optgroup>
                      <optgroup label="Apostilas / Ebooks">
                        {apostilas.map(a => (
                          <option key={a.id} value={`ebook:${a.id}`}>{a.title} (R$ {a.price})</option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-brand-clay uppercase tracking-wider text-[9px]">Valor Pago (R$)</label>
                    <input 
                      type="number" 
                      value={editingSale.pricePaid || 0}
                      onChange={e => setEditingSale({ ...editingSale, pricePaid: Number(e.target.value) })}
                      className="w-full p-2.5 bg-white border border-brand-wood/15 rounded-xl text-brand-ink"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-brand-clay uppercase tracking-wider text-[9px]">Forma de Pagamento</label>
                    <select
                      value={editingSale.paymentMethod || 'manual'}
                      onChange={e => setEditingSale({ ...editingSale, paymentMethod: e.target.value as any })}
                      className="w-full p-2.5 bg-white border border-brand-wood/15 rounded-xl text-brand-ink"
                    >
                      <option value="manual">Matrícula Gratuita / Cortesia</option>
                      <option value="pix">PIX</option>
                      <option value="credit_card">Cartão de Crédito</option>
                      <option value="boleto">Boleto Bancário</option>
                      <option value="mercadopago">Mercado Pago</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-brand-clay uppercase tracking-wider text-[9px]">Status do Pagamento</label>
                    <select
                      value={editingSale.paymentStatus || 'approved'}
                      onChange={e => setEditingSale({ ...editingSale, paymentStatus: e.target.value as 'approved' | 'pending' | 'failed' })}
                      className="w-full p-2.5 bg-white border border-brand-wood/15 rounded-xl text-brand-ink"
                    >
                      <option value="approved">Aprovado (Acesso Liberado)</option>
                      <option value="pending">Aguardando Pagamento</option>
                      <option value="failed">Cancelado / Recusado</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 text-[10px] uppercase font-sans tracking-widest font-medium pt-3">
                  <button onClick={() => setEditingSale(null)} className="px-4 py-2 bg-white border border-brand-wood/10 rounded-full">Cancelar</button>
                  <button
                    onClick={() => { 
                      if (!editingSale.studentEmail || !editingSale.productTitle) {
                        alert('Por favor, preencha o email do aluno e o produto!');
                        return;
                      }
                      if (editingSale.id) {
                        onUpdateSale(editingSale.id, editingSale);
                      } else {
                        onCreateSale({
                          ...editingSale,
                          id: 'manual_' + Date.now(),
                          createdAt: new Date().toISOString()
                        });
                      }
                      setEditingSale(null); 
                    }}
                    className="px-4 py-2 bg-brand-wood text-white rounded-full"
                  >
                    Salvar Inscrição
                  </button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-3xl border border-brand-wood/10 shadow-sm overflow-hidden">
              <div className="overflow-x-auto text-xs font-sans">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-brand-paper text-brand-clay font-bold uppercase tracking-wider text-[10px] border-b border-brand-wood/5">
                      <th className="p-4">Aluno / Pedido</th>
                      <th className="p-4">Item Adquirido</th>
                      <th className="p-4">Forma / Valor</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-wood/5">
                    {sales.map(sale => (
                      <tr key={sale.id} className="hover:bg-brand-paper/30">
                        <td className="p-4">
                          <span className="font-bold text-brand-ink block">{sale.studentName}</span>
                          <span className="text-brand-clay text-[10px] block font-mono">{sale.studentEmail}</span>
                          <span className="text-[9px] text-brand-clay block">{new Date(sale.createdAt).toLocaleDateString()}</span>
                        </td>
                        <td className="p-4">
                          <span className="font-serif font-semibold text-brand-ink block">{sale.productTitle}</span>
                          <span className="text-[9px] uppercase tracking-wider font-extrabold text-brand-clay">{sale.productType === 'apostila' ? '📖 Apostila' : '🎓 Curso'}</span>
                        </td>
                        <td className="p-4">
                          <span className="font-mono text-brand-clay block uppercase text-[10px]">{sale.paymentMethod}</span>
                          <span className="font-semibold text-brand-wood block text-sm">R$ {sale.pricePaid},00</span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                            sale.paymentStatus === 'approved' 
                              ? 'bg-brand-wood/10 text-brand-wood' 
                              : sale.paymentStatus === 'failed'
                              ? 'bg-red-50 text-red-600 border border-red-100'
                              : 'bg-brand-clay/10 text-brand-clay'
                          }`}>
                            {sale.paymentStatus === 'approved' ? 'Aprovado' : sale.paymentStatus === 'failed' ? 'Recusado' : 'Pendente'}
                          </span>
                        </td>
                        <td className="p-4 text-right space-x-2">
                          {sale.paymentStatus === 'pending' && (
                            <button
                              onClick={() => onApproveSale(sale.id)}
                              className="bg-brand-wood hover:bg-brand-clay text-white font-bold text-[9px] uppercase tracking-widest px-3 py-1.5 rounded-full"
                            >
                              Aprovar
                            </button>
                          )}
                          <button
                            onClick={() => setEditingSale(sale)}
                            className="text-brand-wood hover:text-brand-clay font-bold"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => onDeleteSale(sale.id)}
                            className="text-red-500 hover:text-red-700 font-bold"
                          >
                            Deletar
                          </button>
                        </td>
                      </tr>
                    ))}
                    {sales.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center p-8 text-brand-clay italic">Nenhuma matrícula registrada.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: COUPONS CONSOLE */}
        {activeTab === 'coupons' && (
          <div className="space-y-6" id="coupons-tab">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-serif font-bold text-brand-ink">Cupons de Desconto</h2>
              <button
                onClick={() => setEditingCoupon({ id: '', code: '', discountPercent: 10, active: true, expiresAt: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0] })}
                className="inline-flex items-center gap-1.5 bg-brand-wood hover:bg-brand-clay text-white text-[10px] font-sans font-medium uppercase tracking-widest px-5 py-2.5 rounded-full shadow-md transition-all"
              >
                <Plus className="w-4 h-4" /> Novo Cupom
              </button>
            </div>

            {/* Coupon Edit form */}
            {editingCoupon && (
              <div className="bg-brand-paper p-6 rounded-3xl border border-brand-wood/10 space-y-4">
                <h3 className="font-serif font-bold text-brand-ink text-xs">{editingCoupon.id ? 'Editar Cupom de Desconto' : 'Novo Cupom de Desconto'}</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-sans">
                  <div className="space-y-1">
                    <label className="font-bold text-brand-clay uppercase tracking-wider text-[9px]">Código do Cupom</label>
                    <input 
                      type="text" 
                      placeholder="EX: SCULPT30"
                      value={editingCoupon.code || ''}
                      onChange={e => setEditingCoupon({ ...editingCoupon, code: e.target.value.toUpperCase() })}
                      className="w-full p-2.5 bg-white border border-brand-wood/15 rounded-xl text-brand-ink"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-brand-clay uppercase tracking-wider text-[9px]">Porcentagem Desconto (%)</label>
                    <input 
                      type="number" 
                      value={editingCoupon.discountPercent || 10}
                      onChange={e => setEditingCoupon({ ...editingCoupon, discountPercent: Number(e.target.value) })}
                      className="w-full p-2.5 bg-white border border-brand-wood/15 rounded-xl text-brand-ink"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-brand-clay uppercase tracking-wider text-[9px]">Data de Expiração</label>
                    <input 
                      type="date" 
                      value={editingCoupon.expiresAt ? editingCoupon.expiresAt.split('T')[0] : ''}
                      onChange={e => setEditingCoupon({ ...editingCoupon, expiresAt: new Date(e.target.value).toISOString() })}
                      className="w-full p-2.5 bg-white border border-brand-wood/15 rounded-xl text-brand-ink"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-brand-clay uppercase tracking-wider text-[9px]">Status</label>
                    <select 
                      value={editingCoupon.active ? 'true' : 'false'}
                      onChange={e => setEditingCoupon({ ...editingCoupon, active: e.target.value === 'true' })}
                      className="w-full p-2.5 bg-white border border-brand-wood/15 rounded-xl text-brand-ink"
                    >
                      <option value="true">Ativo</option>
                      <option value="false">Inativo</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 text-[10px] uppercase font-sans tracking-widest font-medium">
                  <button onClick={() => setEditingCoupon(null)} className="px-4 py-2 bg-white border border-brand-wood/10 rounded-full">Cancelar</button>
                  <button
                    onClick={() => { onAddCoupon(editingCoupon as Coupon); setEditingCoupon(null); }}
                    className="px-4 py-2 bg-brand-wood text-white rounded-full"
                  >
                    Salvar Cupom
                  </button>
                </div>
              </div>
            )}

            {/* Coupons Table */}
            <div className="bg-white border border-brand-wood/10 rounded-3xl shadow-sm overflow-hidden text-xs font-sans">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-brand-paper text-brand-clay font-bold uppercase tracking-wider text-[10px] border-b border-brand-wood/5">
                    <th className="p-4">Código</th>
                    <th className="p-4">Desconto</th>
                    <th className="p-4">Validade</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-wood/5">
                  {coupons.map(cop => (
                    <tr key={cop.id} className="hover:bg-brand-paper/30">
                      <td className="p-4 font-mono font-bold text-brand-ink">{cop.code}</td>
                      <td className="p-4 font-semibold text-brand-wood">{cop.discountPercent}% OFF</td>
                      <td className="p-4 text-brand-clay">{cop.expiresAt ? new Date(cop.expiresAt).toLocaleDateString() : 'N/A'}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                          cop.active ? 'bg-brand-wood/10 text-[#FDFCFB]' : 'bg-red-100 text-red-800'
                        }`}>
                          {cop.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button 
                          onClick={() => setEditingCoupon(cop)}
                          className="text-brand-wood hover:text-brand-clay font-bold"
                        >
                          Editar
                        </button>
                        <button 
                          onClick={() => onDeleteCoupon(cop.id)}
                          className="text-red-500 hover:text-red-700 font-bold"
                        >
                          Remover
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: SUPPORT TICKETS & STUDENT HELPDESK */}
        {activeTab === 'tickets' && (
          <div className="space-y-6" id="tickets-tab">
            <h2 className="text-xl font-serif font-bold text-brand-ink">Suporte e Dúvidas Técnicas</h2>
            <p className="text-xs text-brand-clay font-sans">Responda aos questionamentos estruturados dos alunos sobre as aulas ou use a IA integrada para rascunhar as respostas.</p>

            <div className="space-y-4 font-sans">
              {supportTickets.map(ticket => {
                const isAnswered = !!ticket.answerText;
                const activeAnswering = answeringTicketId === ticket.id;

                return (
                  <div key={ticket.id} className="bg-white border border-brand-wood/10 rounded-3xl p-6 shadow-sm space-y-4 text-xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-bold text-brand-ink block">{ticket.studentName} ({ticket.studentEmail})</span>
                        <span className="text-brand-clay text-[10px]">Origem: <strong>{ticket.lessonTitle}</strong></span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wider ${
                          (ticket.type === 'practical_work' || !!ticket.imageUrl) ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-blue-50 text-blue-800 border border-blue-100'
                        }`}>
                          {(ticket.type === 'practical_work' || !!ticket.imageUrl) ? 'Exercício Prático 📸' : 'Dúvida Teórica ❓'}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wider ${
                          isAnswered ? 'bg-brand-wood/10 text-brand-wood' : 'bg-red-50 text-red-600 border border-red-100 animate-pulse'
                        }`}>
                          {isAnswered ? 'Respondido' : 'Pendente'}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-1 bg-brand-paper p-4 rounded-2xl border border-brand-wood/5 text-brand-ink leading-relaxed italic">
                        "{ticket.queryText}"
                      </div>
                      {ticket.imageUrl && (
                        <div className="md:w-48 flex-shrink-0">
                          <a 
                            href={getDirectDriveUrl(ticket.imageUrl)} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="block relative group rounded-xl overflow-hidden border border-brand-wood/15 bg-white shadow-sm"
                          >
                            <img 
                              src={getDirectDriveUrl(ticket.imageUrl)} 
                              alt="Trabalho Prático do Aluno" 
                              className="w-full h-32 object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="text-[9px] text-white font-sans uppercase font-bold tracking-wider bg-black/50 px-2.5 py-1 rounded-full">Ver em nova guia</span>
                            </div>
                          </a>
                        </div>
                      )}
                    </div>

                    {isAnswered && (
                      <div className="p-4 bg-brand-wood/5 rounded-2xl border border-brand-wood/10 space-y-1">
                        <span className="font-serif font-bold text-brand-wood text-[10px] uppercase block">Retorno do Mestre:</span>
                        <p className="text-brand-ink leading-relaxed">{ticket.answerText}</p>
                        <span className="text-[9px] text-brand-clay block pt-1.5 font-sans">Respondido em {new Date(ticket.answeredAt || '').toLocaleDateString()}</span>
                      </div>
                    )}

                    {!isAnswered && !activeAnswering && (
                      <button
                        onClick={() => { setAnsweringTicketId(ticket.id); setTicketReplyText(''); }}
                        className="bg-brand-wood hover:bg-brand-clay text-[#FDFCFB] text-[9px] font-sans font-medium uppercase tracking-widest px-4 py-2 rounded-full transition-all"
                      >
                        Responder Aluno
                      </button>
                    )}

                    {activeAnswering && (
                      <div className="space-y-4 border-t border-brand-wood/5 pt-4">
                        <div className="flex justify-between items-center">
                          <label className="font-bold text-brand-clay uppercase text-[9px] tracking-wider">Escrever Resposta Oficial</label>
                          
                          {/* Gemini Draft assistant trigger button */}
                          <button
                            type="button"
                            disabled={aiDraftLoading}
                            onClick={() => handleGenerateAiSupportDraft(ticket)}
                            className="bg-brand-clay/15 hover:bg-brand-clay/20 text-brand-wood font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-brand-clay/10 text-[9px] uppercase tracking-wider"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-brand-wood" /> 
                            {aiDraftLoading ? 'Formulando com Gemini...' : 'Rascunhar com IA'}
                          </button>
                        </div>

                        <textarea
                          placeholder="Digite aqui o retorno oficial ao aluno..."
                          value={ticketReplyText}
                          onChange={e => setTicketReplyText(e.target.value)}
                          className="w-full p-4 bg-brand-paper/50 border border-brand-wood/15 rounded-2xl focus:outline-none focus:ring-1 focus:ring-brand-wood text-brand-ink text-xs"
                          rows={4}
                        />

                        <div className="flex justify-end gap-2 text-[10px] uppercase tracking-widest font-medium">
                          <button 
                            onClick={() => setAnsweringTicketId(null)} 
                            className="px-4 py-2 bg-white border border-brand-wood/10 rounded-full"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => {
                              onAnswerTicket(ticket.id, ticketReplyText);
                              setAnsweringTicketId(null);
                            }}
                            disabled={!ticketReplyText.trim()}
                            className="px-4 py-2 bg-brand-wood text-white rounded-full disabled:opacity-40"
                          >
                            Enviar Resposta
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {supportTickets.length === 0 && (
                <p className="text-brand-clay italic text-center py-6 font-sans">Nenhum ticket de suporte em aberto.</p>
              )}
            </div>
          </div>
        )}

        {/* TAB 7: USERS & PERMISSIONS */}
        {activeTab === 'users' && (
          <div className="space-y-6" id="users-tab">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-serif font-bold text-brand-ink">Alunos, Administradores & Acessos</h2>
                <p className="text-xs text-brand-clay font-sans">Gerencie os usuários cadastrados, modifique níveis de permissão ou bloqueie acessos.</p>
              </div>
              <button
                onClick={() => setEditingUser({ id: '', name: '', email: '', role: 'student', status: 'active', avatarUrl: '', purchasedProducts: [] } as any)}
                className="inline-flex items-center gap-1.5 bg-brand-wood hover:bg-brand-clay text-white text-[10px] font-sans font-medium uppercase tracking-widest px-5 py-2.5 rounded-full shadow-md transition-all"
              >
                <Plus className="w-4 h-4" /> Novo Usuário
              </button>
            </div>

            {/* Editing/Creation Card */}
            {editingUser && (
              <div className="bg-brand-paper p-6 rounded-3xl border border-brand-wood/10 space-y-4">
                <h3 className="font-serif font-bold text-brand-ink text-xs">{editingUser.id ? 'Editar Informações & Permissões' : 'Criar Novo Perfil'}</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                  <div className="space-y-1">
                    <label className="font-bold text-brand-clay uppercase tracking-wider text-[9px]">Nome Completo</label>
                    <input 
                      type="text" 
                      value={editingUser.name || ''}
                      onChange={e => setEditingUser({ ...editingUser, name: e.target.value })}
                      className="w-full p-2.5 bg-white border border-brand-wood/15 rounded-xl text-brand-ink"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-brand-clay uppercase tracking-wider text-[9px]">Endereço de E-mail</label>
                    <input 
                      type="email" 
                      value={editingUser.email || ''}
                      onChange={e => setEditingUser({ ...editingUser, email: e.target.value })}
                      disabled={!!editingUser.id}
                      className="w-full p-2.5 bg-white border border-brand-wood/15 rounded-xl text-brand-ink disabled:bg-gray-100 disabled:text-gray-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-brand-clay uppercase tracking-wider text-[9px]">Nível de Acesso (Cargo)</label>
                    <select
                      value={editingUser.role || 'student'}
                      onChange={e => setEditingUser({ ...editingUser, role: e.target.value as 'student' | 'admin' })}
                      className="w-full p-2.5 bg-white border border-brand-wood/15 rounded-xl text-brand-ink"
                    >
                      <option value="student">Aluno / Estudante</option>
                      <option value="admin">Administrador / Mestre</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-brand-clay uppercase tracking-wider text-[9px]">Estado da Conta</label>
                    <select
                      value={(editingUser as any).status || 'active'}
                      onChange={e => setEditingUser({ ...editingUser, status: e.target.value as any } as any)}
                      className="w-full p-2.5 bg-white border border-brand-wood/15 rounded-xl text-brand-ink"
                    >
                      <option value="active">Ativo (Acesso Liberado)</option>
                      <option value="blocked">Bloqueado (Acesso Suspenso)</option>
                    </select>
                  </div>
                </div>

                {/* Course/Ebook Access checklist */}
                <div className="border-t border-brand-wood/10 pt-4 space-y-2 font-sans">
                  <span className="font-bold text-brand-clay uppercase tracking-wider text-[9px] block">Controle Individual de Acesso (Produtos Liberados)</span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto p-2 bg-white rounded-2xl border border-brand-wood/10 text-xs">
                    {/* Courses list */}
                    <div className="space-y-1.5">
                      <span className="font-serif font-extrabold text-[10px] text-brand-wood uppercase tracking-wider block border-b border-brand-wood/5 pb-1">Cursos</span>
                      {courses.map(c => {
                        const hasAccess = (editingUser.purchasedProducts || []).includes(c.id);
                        return (
                          <label key={c.id} className="flex items-center gap-2 py-1 hover:bg-brand-paper/50 rounded px-1.5 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={hasAccess}
                              onChange={e => {
                                const list = [...(editingUser.purchasedProducts || [])];
                                if (e.target.checked) {
                                  list.push(c.id);
                                } else {
                                  const idx = list.indexOf(c.id);
                                  if (idx !== -1) list.splice(idx, 1);
                                }
                                setEditingUser({ ...editingUser, purchasedProducts: list });
                              }}
                              className="rounded text-brand-wood focus:ring-brand-wood"
                            />
                            <span className="truncate text-brand-ink font-medium">{c.title}</span>
                          </label>
                        );
                      })}
                    </div>

                    {/* Apostilas list */}
                    <div className="space-y-1.5">
                      <span className="font-serif font-extrabold text-[10px] text-brand-wood uppercase tracking-wider block border-b border-brand-wood/5 pb-1">Apostilas</span>
                      {apostilas.map(a => {
                        const hasAccess = (editingUser.purchasedProducts || []).includes(a.id);
                        return (
                          <label key={a.id} className="flex items-center gap-2 py-1 hover:bg-brand-paper/50 rounded px-1.5 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={hasAccess}
                              onChange={e => {
                                const list = [...(editingUser.purchasedProducts || [])];
                                if (e.target.checked) {
                                  list.push(a.id);
                                } else {
                                  const idx = list.indexOf(a.id);
                                  if (idx !== -1) list.splice(idx, 1);
                                }
                                setEditingUser({ ...editingUser, purchasedProducts: list });
                              }}
                              className="rounded text-brand-wood focus:ring-brand-wood"
                            />
                            <span className="truncate text-brand-ink font-medium">{a.title}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 text-[10px] uppercase font-sans tracking-widest font-medium pt-3 border-t border-brand-wood/5">
                  <button onClick={() => setEditingUser(null)} className="px-4 py-2 bg-white border border-brand-wood/10 rounded-full">Cancelar</button>
                  <button
                    onClick={() => { 
                      if (!editingUser.name || !editingUser.email) {
                        alert('Preencha os campos obrigatórios!');
                        return;
                      }
                      if (editingUser.id) {
                        onUpdateUser(editingUser.id, editingUser);
                      } else {
                        // Create user with a dummy id for manual entries
                        const dummyId = 'usr_' + Date.now();
                        onUpdateUser(dummyId, { ...editingUser, id: dummyId });
                      }
                      setEditingUser(null);
                    }}
                    className="px-4 py-2 bg-brand-wood text-white rounded-full"
                  >
                    Salvar Perfil
                  </button>
                </div>
              </div>
            )}

            {/* Users Table list */}
            <div className="bg-white rounded-3xl border border-brand-wood/10 shadow-sm overflow-hidden text-xs font-sans">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-brand-paper text-brand-clay font-bold uppercase tracking-wider text-[10px] border-b border-brand-wood/5">
                      <th className="p-4">Ficha do Usuário</th>
                      <th className="p-4">Tipo de Conta</th>
                      <th className="p-4">Produtos Ativos</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-wood/5">
                    {users.map(u => {
                      const activeProductNames = [
                        ...courses.filter(c => (u.purchasedProducts || []).includes(c.id)).map(c => '🎓 ' + c.title),
                        ...apostilas.filter(a => (u.purchasedProducts || []).includes(a.id)).map(a => '📖 ' + a.title)
                      ];

                      return (
                        <tr key={u.id} className="hover:bg-brand-paper/30">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              {u.avatarUrl ? (
                                <img src={u.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover border border-brand-wood/10 flex-shrink-0" />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-brand-clay/10 text-brand-wood font-bold flex items-center justify-center flex-shrink-0 border border-brand-wood/5">
                                  {u.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <span className="font-bold text-brand-ink block">{u.name}</span>
                                <span className="text-[10px] font-mono text-brand-clay block">{u.email}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            {u.role === 'admin' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-brand-wood text-white border border-brand-wood/15">
                                <Shield className="w-3 h-3" /> Administrador
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-blue-50 text-blue-800 border border-blue-200">
                                Aluno
                              </span>
                            )}
                          </td>
                          <td className="p-4 max-w-xs">
                            {activeProductNames.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {activeProductNames.map((pName, idx) => (
                                  <span key={idx} className="bg-brand-paper px-2 py-0.5 rounded-md text-[9px] text-brand-ink border border-brand-wood/5 inline-block truncate max-w-[120px]" title={pName}>
                                    {pName}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[10px] italic text-brand-clay">Nenhum curso liberado</span>
                            )}
                          </td>
                          <td className="p-4">
                            {(u as any).status === 'blocked' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-red-100 text-red-800 border border-red-200">
                                <Lock className="w-2.5 h-2.5" /> Suspenso
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <Unlock className="w-2.5 h-2.5" /> Ativo
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-right space-x-2">
                            <button
                              onClick={() => setEditingUser(u)}
                              className="text-brand-wood hover:text-brand-clay font-bold"
                            >
                              Editar
                            </button>
                            {u.email !== 'andrewfmlemos@gmail.com' && (
                              <button
                                onClick={() => onDeleteUser(u.id)}
                                className="text-red-500 hover:text-red-700 font-bold"
                              >
                                Excluir
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 8: COMMENTS MODERATION */}
        {activeTab === 'comments' && (
          <div className="space-y-6" id="comments-tab">
            <div>
              <h2 className="text-xl font-serif font-bold text-brand-ink">Moderação de Comentários & Fórum</h2>
              <p className="text-xs text-brand-clay font-sans">Visualize e responda às dúvidas e comentários feitos pelos alunos em todas as aulas.</p>
            </div>

            <div className="space-y-4 font-sans text-xs">
              {comments.filter(c => !c.parentCommentId).map(comm => {
                const subReplies = comments.filter(r => r.parentCommentId === comm.id);
                const isReplying = replyingCommentId === comm.id;

                return (
                  <div key={comm.id} className="bg-white border border-brand-wood/10 rounded-3xl p-5 shadow-sm space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-brand-clay/10 text-brand-wood flex items-center justify-center font-bold">
                          {comm.studentName?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-bold text-brand-ink block">{comm.studentName} ({comm.studentEmail})</span>
                          <span className="text-[9px] text-brand-clay block">Em {new Date(comm.createdAt).toLocaleDateString()} • Aula ID: <code>{comm.lessonId}</code></span>
                        </div>
                      </div>
                      <button
                        onClick={() => onDeleteComment(comm.id)}
                        className="text-red-500 hover:bg-red-50 p-2 border border-red-100/10 rounded-full flex items-center justify-center"
                        title="Excluir Comentário Principal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="p-4 bg-brand-paper rounded-2xl text-brand-ink italic leading-relaxed border border-brand-wood/5">
                      "{comm.text}"
                    </div>

                    {/* Sub replies list */}
                    {subReplies.length > 0 && (
                      <div className="pl-6 border-l-2 border-brand-wood/20 space-y-3 pt-1">
                        {subReplies.map(rep => (
                          <div key={rep.id} className="bg-brand-paper/50 p-3.5 rounded-2xl border border-brand-wood/5 space-y-1.5">
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="font-bold text-brand-wood uppercase tracking-wider">{rep.studentName} {rep.studentEmail === 'andrewfmlemos@gmail.com' ? '👑 Mestre' : '• Resposta'}</span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-brand-clay">{new Date(rep.createdAt).toLocaleDateString()}</span>
                                <button
                                  onClick={() => onDeleteComment(rep.id)}
                                  className="text-red-500 hover:text-red-700 font-bold ml-1.5"
                                >
                                  Excluir
                                </button>
                              </div>
                            </div>
                            <p className="text-brand-ink leading-relaxed">{rep.text}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reply triggers */}
                    {!isReplying ? (
                      <button
                        onClick={() => { setReplyingCommentId(comm.id); setCommentReplyText(''); }}
                        className="text-[9px] font-sans font-bold uppercase tracking-widest text-brand-wood border border-brand-wood/15 hover:bg-brand-paper px-4 py-2 rounded-full transition-all"
                      >
                        Responder Comentário
                      </button>
                    ) : (
                      <div className="space-y-2 pt-2 border-t border-brand-wood/5">
                        <textarea
                          placeholder="Escreva a resposta oficial do Mestre..."
                          value={commentReplyText}
                          onChange={e => setCommentReplyText(e.target.value)}
                          className="w-full p-3 bg-brand-paper border border-brand-wood/15 rounded-xl text-brand-ink text-xs focus:outline-none focus:ring-1 focus:ring-brand-wood"
                          rows={2}
                        />
                        <div className="flex justify-end gap-2 text-[9px] uppercase font-sans tracking-widest font-bold">
                          <button onClick={() => setReplyingCommentId(null)} className="px-3.5 py-1.5 bg-white border border-brand-wood/10 rounded-full">Cancelar</button>
                          <button
                            onClick={() => {
                              if (!commentReplyText.trim() || !currentUser) return;
                              onAddComment({
                                id: 'rep_' + Date.now(),
                                lessonId: comm.lessonId,
                                courseId: comm.courseId,
                                studentId: currentUser.id,
                                studentName: currentUser.name,
                                studentEmail: currentUser.email,
                                text: commentReplyText,
                                parentCommentId: comm.id,
                                createdAt: new Date().toISOString()
                              });
                              setReplyingCommentId(null);
                            }}
                            className="px-3.5 py-1.5 bg-brand-wood text-white rounded-full"
                          >
                            Enviar Resposta
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {comments.filter(c => !c.parentCommentId).length === 0 && (
                <p className="text-center italic text-brand-clay py-12">Nenhum comentário registrado.</p>
              )}
            </div>
          </div>
        )}

        {/* TAB 9: CERTIFICATES MANAGEMENT */}
        {activeTab === 'certificates' && (
          <div className="space-y-6" id="certificates-tab">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-serif font-bold text-brand-ink">Emissão de Certificados Autênticos</h2>
                <p className="text-xs text-brand-clay font-sans">Veja todos os certificados emitidos e autenticados pela escola ou crie novos certificados manualmente.</p>
              </div>
              <button
                onClick={() => setIssuingCertificate({ studentId: '', studentName: '', studentEmail: '', courseId: '', courseTitle: '' })}
                className="inline-flex items-center gap-1.5 bg-brand-wood hover:bg-brand-clay text-white text-[10px] font-sans font-medium uppercase tracking-widest px-5 py-2.5 rounded-full shadow-md transition-all"
              >
                <Plus className="w-4 h-4" /> Emitir Manualmente
              </button>
            </div>

            {/* Manual Certificate Issuing form */}
            {issuingCertificate && (
              <div className="bg-brand-paper p-6 rounded-3xl border border-brand-wood/10 space-y-4">
                <h3 className="font-serif font-bold text-brand-ink text-xs">Emitir Novo Certificado de Conclusão</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-sans">
                  
                  {/* Student selector */}
                  <div className="space-y-1">
                    <label className="font-bold text-brand-clay uppercase tracking-wider text-[9px]">Aluno a Receber o Certificado</label>
                    <select
                      value={issuingCertificate.studentEmail || ''}
                      onChange={e => {
                        const sel = users.find(u => u.email === e.target.value);
                        if (sel) {
                          setIssuingCertificate({
                            ...issuingCertificate,
                            studentId: sel.id,
                            studentName: sel.name,
                            studentEmail: sel.email
                          });
                        }
                      }}
                      className="w-full p-2.5 bg-white border border-brand-wood/15 rounded-xl text-brand-ink"
                    >
                      <option value="">-- Escolha um Aluno --</option>
                      {users.map(u => (
                        <option key={u.id} value={u.email}>{u.name} ({u.email})</option>
                      ))}
                    </select>
                  </div>

                  {/* Course selector */}
                  <div className="space-y-1">
                    <label className="font-bold text-brand-clay uppercase tracking-wider text-[9px]">Curso Concluído</label>
                    <select
                      value={issuingCertificate.courseId || ''}
                      onChange={e => {
                        const sel = courses.find(c => c.id === e.target.value);
                        if (sel) {
                          setIssuingCertificate({
                            ...issuingCertificate,
                            courseId: sel.id,
                            courseTitle: sel.title
                          });
                        }
                      }}
                      className="w-full p-2.5 bg-white border border-brand-wood/15 rounded-xl text-brand-ink"
                    >
                      <option value="">-- Escolha o Curso --</option>
                      {courses.map(c => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 text-[10px] uppercase font-sans tracking-widest font-medium pt-3">
                  <button onClick={() => setIssuingCertificate(null)} className="px-4 py-2 bg-white border border-brand-wood/10 rounded-full">Cancelar</button>
                  <button
                    onClick={() => {
                      if (!issuingCertificate.studentEmail || !issuingCertificate.courseId) {
                        alert('Por favor, selecione o aluno e o curso!');
                        return;
                      }
                      onIssueCertificate({
                        id: 'cert_' + Date.now(),
                        studentId: issuingCertificate.studentId,
                        studentName: issuingCertificate.studentName,
                        studentEmail: issuingCertificate.studentEmail,
                        courseId: issuingCertificate.courseId,
                        courseTitle: issuingCertificate.courseTitle,
                        issuedAt: new Date().toISOString()
                      });
                      setIssuingCertificate(null);
                    }}
                    className="px-4 py-2 bg-brand-wood text-white rounded-full"
                  >
                    Confirmar Emissão
                  </button>
                </div>
              </div>
            )}

            {/* Certificates Table */}
            <div className="bg-white rounded-3xl border border-brand-wood/10 shadow-sm overflow-hidden text-xs font-sans">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-brand-paper text-brand-clay font-bold uppercase tracking-wider text-[10px] border-b border-brand-wood/5">
                      <th className="p-4">Aluno Certificado</th>
                      <th className="p-4">Curso de Especialização</th>
                      <th className="p-4">Código de Verificação</th>
                      <th className="p-4">Data Emissão</th>
                      <th className="p-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-wood/5">
                    {certificates.map(cert => (
                      <tr key={cert.id} className="hover:bg-brand-paper/30">
                        <td className="p-4">
                          <span className="font-bold text-brand-ink block">{cert.studentName}</span>
                          <span className="text-[10px] font-mono text-brand-clay block">{cert.studentEmail}</span>
                        </td>
                        <td className="p-4 font-serif font-bold text-brand-wood text-xs">
                          🎓 {cert.courseTitle}
                        </td>
                        <td className="p-4 font-mono font-bold text-brand-clay text-[10px]">
                          {cert.id}
                        </td>
                        <td className="p-4 text-brand-clay">
                          {new Date(cert.issuedAt).toLocaleDateString()}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => onDeleteCertificate(cert.id)}
                            className="text-red-500 hover:text-red-700 font-bold"
                          >
                            Excluir / Revogar
                          </button>
                        </td>
                      </tr>
                    ))}
                    {certificates.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center p-8 text-brand-clay italic">Nenhum certificado registrado no sistema.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* APOSTILA PREVIEW MODAL (RESULTADO FINAL) */}
      {previewingApostila && (
        <div className="fixed inset-0 bg-[#1D1612]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-brand-paper w-full max-w-6xl h-[90vh] rounded-3xl border border-brand-wood/15 shadow-2xl overflow-hidden flex flex-col justify-between animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-brand-ink text-white px-6 py-4 flex justify-between items-center border-b border-brand-wood/10">
              <div className="flex items-center gap-3">
                <span className="bg-brand-wood text-white text-[9px] font-sans font-bold uppercase tracking-widest px-2.5 py-1 rounded-full">
                  Resultado Final da Apostila
                </span>
                <h3 className="font-serif font-bold text-sm md:text-base text-white truncate max-w-md">
                  {previewingApostila.title || 'Apostila Sem Título'}
                </h3>
              </div>
              <button 
                onClick={() => setPreviewingApostila(null)}
                className="text-brand-clay hover:text-white p-2 bg-white/5 hover:bg-white/10 rounded-full transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 gap-6 p-6">
              {/* Left sumário index */}
              <div className="md:col-span-4 bg-white border border-brand-wood/10 rounded-2xl p-4 overflow-y-auto flex flex-col gap-3 h-full">
                <span className="text-[10px] font-sans font-bold text-brand-clay uppercase tracking-widest">
                  Sumário da Apostila ({previewingApostila.chapters?.length || 0} Capítulos)
                </span>
                <div className="space-y-1.5 overflow-y-auto flex-1 pr-1">
                  {previewingApostila.chapters && previewingApostila.chapters.length > 0 ? (
                    previewingApostila.chapters.map((chap, i) => (
                      <button
                        key={chap.id || i}
                        onClick={() => setPreviewChapterIndex(i)}
                        className={`w-full p-3 rounded-xl text-xs font-semibold text-left transition-all border flex items-center justify-between ${
                          previewChapterIndex === i
                            ? 'border-brand-wood bg-brand-paper text-brand-wood font-bold'
                            : 'border-transparent text-brand-clay hover:bg-brand-paper'
                        }`}
                      >
                        <span className="truncate pr-2">{chap.title || `Capítulo ${i + 1}`}</span>
                        <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
                      </button>
                    ))
                  ) : (
                    <p className="text-xs text-brand-clay italic text-center py-6">Nenhum capítulo escrito ainda.</p>
                  )}
                </div>
              </div>

              {/* Right content page */}
              <div className="md:col-span-8 bg-white border border-brand-wood/10 rounded-2xl overflow-hidden flex flex-col justify-between h-full shadow-inner">
                {/* Simulated Protection Notice */}
                <div className="bg-brand-clay/5 text-brand-wood text-[9px] font-sans font-bold uppercase tracking-widest p-2.5 text-center border-b border-brand-wood/5 flex items-center justify-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-brand-clay" /> Pré-visualização com proteção de tela e marcas d'água ativas para o aluno.
                </div>

                {/* Chapter body reading area */}
                <div className="p-8 md:p-10 overflow-y-auto flex-1 bg-[radial-gradient(#8b5e3c_0.5px,transparent_0.5px)] [background-size:20px_20px] bg-opacity-5">
                  <div className="max-w-2xl mx-auto space-y-6">
                    {previewingApostila.chapters && previewingApostila.chapters[previewChapterIndex] ? (
                      <>
                        <h4 className="text-lg md:text-xl font-serif font-bold text-brand-ink border-b border-brand-wood/10 pb-2">
                          {previewingApostila.chapters[previewChapterIndex].title}
                        </h4>
                        
                        {/* Render using standard markdown parser since it supports markdown formatting correctly */}
                        <div className="markdown-body text-brand-ink text-xs md:text-sm leading-relaxed whitespace-pre-wrap select-none font-sans font-light">
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
                            {cleanCitations(previewingApostila.chapters[previewChapterIndex].content || '')}
                          </Markdown>
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-brand-clay italic text-center py-12">Selecione um capítulo no sumário para ler o conteúdo.</p>
                    )}
                  </div>
                </div>

                {/* Footer paginator */}
                <div className="p-4 bg-brand-paper border-t border-brand-wood/5 flex justify-between items-center text-xs">
                  <button
                    disabled={previewChapterIndex === 0}
                    onClick={() => setPreviewChapterIndex(previewChapterIndex - 1)}
                    className="bg-white border border-brand-wood/10 hover:bg-brand-paper text-brand-clay px-4 py-2 rounded-full font-bold transition-all disabled:opacity-40"
                  >
                    Anterior
                  </button>
                  <span className="text-brand-clay font-bold text-[10px] uppercase tracking-wider font-sans">
                    Capítulo {previewChapterIndex + 1} de {previewingApostila.chapters?.length || 0}
                  </span>
                  <button
                    disabled={!previewingApostila.chapters || previewChapterIndex === previewingApostila.chapters.length - 1}
                    onClick={() => setPreviewChapterIndex(previewChapterIndex + 1)}
                    className="bg-brand-wood hover:bg-brand-clay text-white px-4 py-2 rounded-full font-bold transition-all disabled:opacity-40"
                  >
                    Próximo
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
