export interface IDocumentSnapshot {
  id: string;
  exists: boolean;
  ref: IDocumentReference;
  data(): any;
}

export interface IQuerySnapshot {
  empty: boolean;
  docs: IDocumentSnapshot[];
  forEach(callback: (doc: IDocumentSnapshot) => void): void;
}

export interface IDocumentReference {
  id: string;
  get(): Promise<IDocumentSnapshot>;
  set(data: any, options?: { merge?: boolean }): Promise<void>;
  update(data: any): Promise<void>;
  delete(): Promise<void>;
}

export interface IQuery {
  where(field: string, op: any, value: any): IQuery;
  limit(n: number): IQuery;
  get(): Promise<IQuerySnapshot>;
}

export interface ICollectionReference extends IQuery {
  doc(id?: string): IDocumentReference;
}

export interface IWriteBatch {
  set(docRef: IDocumentReference, data: any): IWriteBatch;
  update(docRef: IDocumentReference, data: any): IWriteBatch;
  delete(docRef: IDocumentReference): IWriteBatch;
  commit(): Promise<void>;
}

export interface IDatabaseProvider {
  collection(name: string): ICollectionReference;
  batch(): IWriteBatch;
}
