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
  type?: "question" | "practical_work";
}
