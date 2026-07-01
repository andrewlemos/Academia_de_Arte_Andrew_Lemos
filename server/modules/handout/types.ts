export interface HandoutChapter {
  id: string;
  title: string;
  content: string;
}

export interface Handout {
  id: string;
  title: string;
  description: string;
  longDescription?: string;
  coverUrl: string;
  price: number;
  chapters: HandoutChapter[];
  status?: "ativo" | "breve" | "desativado";
}
