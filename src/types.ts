export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'student';
  avatarUrl?: string;
  purchasedProducts: string[]; // List of course IDs and apostila IDs
  status?: 'active' | 'blocked';
}

export interface Course {
  id: string;
  title: string;
  description: string;
  longDescription?: string;
  coverUrl: string;
  category: string;
  price: number;
  freeModules: string[]; // List of module IDs that are available as free preview
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

export interface Apostila {
  id: string;
  title: string;
  description: string;
  longDescription?: string;
  coverUrl: string;
  price: number;
  chapters: {
    id: string;
    title: string;
    content: string; // HTML or Markdown
  }[];
  status?: 'ativo' | 'breve' | 'desativado';
}

export interface Sale {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  productId: string;
  productTitle: string;
  productType: 'course' | 'apostila';
  pricePaid: number;
  couponUsed?: string;
  paymentMethod: 'credit_card' | 'pix' | 'boleto' | 'manual' | 'mercadopago';
  paymentStatus: 'approved' | 'pending' | 'failed';
  createdAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountPercent: number;
  expiresAt: string;
  active: boolean;
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

export interface SupportTicket {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  courseId: string;
  lessonId: string;
  lessonTitle: string;
  queryText: string;
  answerText?: string;
  answeredAt?: string;
  createdAt: string;
  imageUrl?: string;
  type?: 'question' | 'practical_work';
}

export interface Certificate {
  id: string;
  studentId: string;
  studentName: string;
  courseId: string;
  courseTitle: string;
  issuedAt: string;
  validationCode: string;
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
  replies?: SupportComment[];
}
