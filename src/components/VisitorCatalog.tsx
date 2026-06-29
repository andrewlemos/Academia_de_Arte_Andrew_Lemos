import React, { useState } from 'react';
import { Course, Apostila, Module, Lesson } from '../types';
import { BookOpen, Play, Star, Sparkles, ShoppingBag, Eye, FileText, CheckCircle } from 'lucide-react';
import { getDirectDriveUrl } from '../utils/image';

interface VisitorCatalogProps {
  courses: Course[];
  modules: Module[];
  lessons: Lesson[];
  apostilas: Apostila[];
  onSelectCourse: (course: Course) => void;
  onSelectApostila: (apostila: Apostila) => void;
  onStartFreeLesson: (lesson: Lesson, course: Course) => void;
}

export default function VisitorCatalog({
  courses,
  modules,
  lessons,
  apostilas,
  onSelectCourse,
  onSelectApostila,
  onStartFreeLesson
}: VisitorCatalogProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'courses' | 'ebooks'>('courses');

  const activeOrBreveCourses = courses.filter(c => c.status !== 'desativado');
  const activeOrBreveApostilas = apostilas.filter(b => b.status !== 'desativado');

  const categories = ['all', ...Array.from(new Set(activeOrBreveCourses.map(c => c.category)))];

  const filteredCourses = selectedCategory === 'all' 
    ? activeOrBreveCourses 
    : activeOrBreveCourses.filter(c => c.category === selectedCategory);

  return (
    <div className="space-y-10" id="visitor-catalog-container">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-[#4A3222] via-[#2F1F15] to-[#1E140D] text-[#FDFCFB] rounded-3xl p-8 md:p-14 relative overflow-hidden shadow-xl border border-brand-wood/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(166,123,91,0.18),transparent)] pointer-events-none" />
        <div className="max-w-2xl relative z-10 space-y-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-sans font-bold uppercase tracking-widest bg-brand-clay/20 text-[#DFD3C3] border border-brand-clay/30">
            <Sparkles className="w-3 h-3 text-brand-clay" /> Do Grafite ao Entalhe Físico
          </span>
          <h1 className="text-3xl md:text-5xl font-serif font-medium tracking-tight text-[#FDFCFB] leading-tight">
            Refinamento Artístico & Técnicas Clássicas
          </h1>
          <p className="text-[#DFD3C3]/90 text-sm md:text-base leading-relaxed font-sans font-light">
            Domine o entalhe em madeira, a modelagem em argila (clay) e a precisão do grafite no papel. Treinamentos exclusivos guiados diretamente pelo artista em nosso ateliê.
          </p>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-brand-wood/10 pb-5" id="catalog-filters">
        <div className="flex bg-white/60 p-1 rounded-full border border-brand-wood/10 shadow-sm">
          <button
            onClick={() => setActiveTab('courses')}
            className={`px-5 py-2 rounded-full text-xs font-sans font-semibold transition-all duration-300 flex items-center gap-2 ${
              activeTab === 'courses'
                ? 'bg-brand-wood text-white shadow-sm'
                : 'text-brand-clay hover:text-brand-wood'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" /> Cursos da Academia
          </button>
          <button
            onClick={() => setActiveTab('ebooks')}
            className={`px-5 py-2 rounded-full text-xs font-sans font-semibold transition-all duration-300 flex items-center gap-2 ${
              activeTab === 'ebooks'
                ? 'bg-brand-wood text-white shadow-sm'
                : 'text-brand-clay hover:text-brand-wood'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Manuais & Apostilas
          </button>
        </div>

        {activeTab === 'courses' && (
          <div className="flex flex-wrap gap-1.5">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-[10px] font-sans font-bold uppercase tracking-wider transition-all border ${
                  selectedCategory === cat
                    ? 'bg-brand-clay text-white border-brand-clay'
                    : 'bg-white text-brand-clay border-brand-wood/10 hover:bg-brand-paper'
                }`}
              >
                {cat === 'all' ? 'Ver Todos' : cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content Grid */}
      {activeTab === 'courses' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8" id="courses-grid">
          {filteredCourses.map(course => {
            const isBreve = course.status === 'breve';
            const courseModules = isBreve ? [] : modules.filter(m => m.courseId === course.id);
            const isCampaignActive = isBreve ? false : (course.freeModules && course.freeModules.length > 0);

            return (
              <div 
                key={course.id}
                className={`bg-white rounded-3xl overflow-hidden border shadow-sm transition-all duration-300 flex flex-col justify-between ${
                  isBreve ? 'border-amber-200/50 hover:border-amber-300/60' : 'border-brand-wood/5 hover:shadow-md'
                }`}
              >
                <div>
                  <div className="relative overflow-hidden bg-[#1D1612] rounded-t-3xl" style={{ aspectRatio: '1536/1024' }}>
                    <img 
                      src={getDirectDriveUrl(course.coverUrl)} 
                      alt={course.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain rounded-none opacity-80"
                    />
                    <div className="absolute top-4 left-4">
                      <span className="px-3 py-1 bg-[#1A1A1A]/95 backdrop-blur-md text-white text-[9px] font-sans font-bold uppercase tracking-widest rounded-full">
                        {course.category}
                      </span>
                    </div>
                    {isBreve && (
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center">
                        <span className="px-4 py-2 bg-amber-500/90 text-white font-sans font-black text-xs uppercase tracking-widest rounded-full shadow-lg border border-amber-400 flex items-center gap-1.5 animate-pulse">
                          <Sparkles className="w-4 h-4 fill-current" /> Disponível em Breve
                        </span>
                      </div>
                    )}
                    {!isBreve && isCampaignActive && (
                      <div className="absolute bottom-4 right-4 bg-brand-clay/95 backdrop-blur-md text-white text-[9px] font-sans font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm animate-pulse">
                        <Sparkles className="w-3 h-3 text-white" /> Aula de Demonstração Liberada
                      </div>
                    )}
                  </div>

                  <div className="p-6 space-y-4">
                    {!isBreve && (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center text-[#D4AF37]">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          <span className="ml-1 text-xs font-sans font-bold text-brand-ink">{course.rating || '4.9'}</span>
                        </div>
                        <span className="text-brand-clay/30 text-xs">•</span>
                        <span className="text-brand-clay text-xs font-sans font-medium">{course.duration || '10 horas'}</span>
                      </div>
                    )}

                    <h3 className="text-xl md:text-2xl font-serif font-bold text-brand-ink tracking-tight leading-snug">
                      {course.title}
                    </h3>
                    
                    {!isBreve ? (
                      <>
                        <p className="text-brand-clay text-sm font-sans font-light leading-relaxed line-clamp-3">
                          {course.description}
                        </p>

                        {/* Modules & Lessons structured structure */}
                        <div className="pt-2">
                          <span className="text-[10px] font-sans font-bold text-brand-clay uppercase tracking-widest">Matriz Curricular</span>
                          <div className="mt-2 space-y-2 bg-brand-paper rounded-2xl p-4 border border-brand-wood/5">
                            {courseModules.map((mod, i) => {
                              const isFree = course.freeModules.includes(mod.id);
                              const modLessons = lessons.filter(l => l.moduleId === mod.id);
                              return (
                                <div key={mod.id} className="flex justify-between items-center text-xs">
                                  <span className="text-brand-ink font-serif font-medium truncate max-w-[200px]">
                                    {i + 1}. {mod.title}
                                  </span>
                                  {isFree ? (
                                    <span className="bg-brand-clay/10 text-brand-wood font-sans font-bold px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider flex items-center gap-0.5">
                                      <CheckCircle className="w-2.5 h-2.5 text-brand-wood" /> Grátis
                                    </span>
                                  ) : (
                                    <span className="text-brand-clay/50 text-[10px] font-sans font-medium uppercase tracking-wider">{modLessons.length} Aulas</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-2xl space-y-2">
                        <span className="text-[9px] text-amber-800 font-sans font-bold uppercase tracking-widest block">Pré-lançamento</span>
                        <p className="text-brand-clay text-xs font-sans font-light leading-relaxed">
                          Este curso está em fase de preparação e gravação. A estrutura de módulos, aulas práticas de entalhe e material didático está sendo esculpida com muito carinho. Inscreva-se em breve!
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-6 border-t border-brand-wood/5 bg-brand-paper/50 flex flex-col sm:flex-row justify-between items-center gap-4">
                  {isBreve ? (
                    <div className="w-full flex justify-between items-center">
                      <div>
                        <span className="text-[9px] text-brand-clay block font-sans font-bold uppercase tracking-widest font-semibold">Previsão</span>
                        <span className="text-sm font-sans font-bold text-amber-800 uppercase tracking-wider">Disponível em breve</span>
                      </div>
                      <span className="px-4 py-2 bg-amber-100 text-amber-800 text-[10px] font-sans font-extrabold uppercase tracking-widest rounded-full border border-amber-200">
                        Aguarde o Lançamento
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="text-center sm:text-left">
                        <span className="text-[10px] text-brand-clay block font-sans font-bold uppercase tracking-widest">Adesão Vitalícia</span>
                        <span className="text-2xl font-serif font-bold text-[#1A1A1A]">R$ {course.price},00</span>
                      </div>

                      <div className="flex gap-2 w-full sm:w-auto">
                        {/* Free Demo Lessons trigger if exists */}
                        {isCampaignActive && (
                          <button
                            onClick={() => {
                              const firstFreeMod = course.freeModules[0];
                              const firstLesson = lessons.find(l => l.moduleId === firstFreeMod);
                              if (firstLesson) {
                                onStartFreeLesson(firstLesson, course);
                              } else {
                                onSelectCourse(course);
                              }
                            }}
                            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 border border-brand-wood text-brand-wood px-4 py-2.5 rounded-full font-sans font-medium text-xs hover:bg-brand-wood hover:text-white transition-all text-center"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" /> Aula Grátis
                          </button>
                        )}
                        <button
                          onClick={() => onSelectCourse(course)}
                          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 bg-brand-wood text-white px-5 py-2.5 rounded-full font-sans font-medium hover:bg-brand-clay transition-all shadow-md shadow-brand-wood/10 text-xs"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" /> Adquirir Curso
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8" id="ebooks-grid">
          {activeOrBreveApostilas.map(book => {
            const isBreve = book.status === 'breve';
            return (
              <div 
                key={book.id}
                className={`bg-white rounded-3xl overflow-hidden border shadow-sm transition-all duration-300 flex flex-col justify-between ${
                  isBreve ? 'border-amber-200/50 hover:border-amber-300/60' : 'border-brand-wood/5 hover:shadow-md'
                }`}
              >
                <div className="flex flex-col md:flex-row h-full">
                  {/* Book Cover mock */}
                  <div className="w-full md:w-2/5 relative min-h-[220px] md:min-h-auto bg-[#1A1A1A]">
                    <img 
                      src={getDirectDriveUrl(book.coverUrl)} 
                      alt={book.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover opacity-80"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-[#1A1A1A]/80 via-transparent to-transparent pointer-events-none" />
                    <div className="absolute bottom-4 left-4 text-white">
                      <span className="px-3 py-1 bg-brand-wood text-white rounded-full text-[9px] font-sans font-bold uppercase tracking-widest">Apostila Digital</span>
                    </div>
                    {isBreve && (
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center">
                        <span className="px-3 py-1.5 bg-amber-500/90 text-white font-sans font-black text-[9px] uppercase tracking-widest rounded-full shadow-lg border border-amber-400 flex items-center gap-1 animate-pulse">
                          <Sparkles className="w-3 h-3 fill-current" /> Em Breve
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-6 md:w-3/5 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <h3 className="text-xl font-serif font-bold text-brand-ink leading-snug">
                        {book.title}
                      </h3>
                      {!isBreve ? (
                        <>
                          <p className="text-brand-clay text-xs font-sans font-light leading-relaxed line-clamp-4">
                            {book.description}
                          </p>
                          <div className="flex items-center gap-1.5 text-xs text-brand-clay/70 pt-1 font-sans">
                            <FileText className="w-3.5 h-3.5 text-brand-wood" />
                            <span>{book.chapters.length} Capítulos Ilustrados</span>
                          </div>
                        </>
                      ) : (
                        <div className="bg-amber-50/50 border border-amber-100 p-3.5 rounded-2xl space-y-1">
                          <span className="text-[9px] text-amber-800 font-sans font-bold uppercase tracking-widest block">Pré-lançamento</span>
                          <p className="text-brand-clay text-[11px] font-sans font-light leading-relaxed">
                            Esta apostila digital está em fase final de redação e ilustração técnica. Aguarde a liberação do material completo!
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-brand-wood/5 flex justify-between items-center">
                      {isBreve ? (
                        <div className="w-full flex justify-between items-center gap-2">
                          <div>
                            <span className="text-[9px] text-brand-clay block font-sans font-bold uppercase tracking-widest">Previsão</span>
                            <span className="text-xs font-sans font-bold text-amber-800 uppercase tracking-wider">Disponível em breve</span>
                          </div>
                          <span className="px-3 py-1.5 bg-amber-100 text-amber-800 text-[9px] font-sans font-extrabold uppercase tracking-widest rounded-full border border-amber-200">
                            Breve
                          </span>
                        </div>
                      ) : (
                        <>
                          <div>
                            <span className="text-[9px] text-brand-clay block font-sans font-bold uppercase tracking-widest">Versão Digital</span>
                            <span className="text-xl font-serif font-bold text-brand-ink">R$ {book.price},00</span>
                          </div>
                          <button
                            onClick={() => onSelectApostila(book)}
                            className="inline-flex items-center gap-1.5 bg-brand-wood text-white px-4 py-2.5 rounded-full font-sans font-medium hover:bg-brand-clay transition-all shadow-md shadow-brand-wood/10 text-xs"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" /> Comprar Livro
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
