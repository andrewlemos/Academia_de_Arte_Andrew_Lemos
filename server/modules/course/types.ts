export interface Material {
  id: string;
  name: string;
  url: string;
  size: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  longDescription?: string;
  coverUrl: string;
  category: string;
  price: number;
  freeModules: string[]; // List of module IDs
  rating?: number;
  duration?: string;
  status?: 'ativo' | 'breve' | 'desativado';
}

export interface Module {
  id: string;
  courseId: string;
  title: string;
  description: string;
  coverUrl?: string;
  order: number;
}

export interface Lesson {
  id: string;
  moduleId: string;
  courseId: string;
  title: string;
  description: string;
  videoUrl?: string;
  textContent?: string;
  materials?: Material[];
  downloadFiles?: Material[];
  order: number;
  duration?: string;
  quiz?: QuizQuestion[];
}

export interface StudentProgress {
  studentId: string;
  lessonId: string;
  courseId: string;
  completed: boolean;
  completedAt?: string;
  favorited?: boolean;
  lastPosition?: number;
  watchTime?: number;
  lastAccessed?: string;
}

export interface SupportComment {
  id: string;
  lessonId: string;
  courseId: string;
  userName: string;
  userEmail: string;
  userRole: 'admin' | 'student';
  avatarUrl?: string;
  comment: string;
  createdAt: string;
  parentCommentId?: string; // Optional reference for replies
  replies?: SupportComment[];
}
