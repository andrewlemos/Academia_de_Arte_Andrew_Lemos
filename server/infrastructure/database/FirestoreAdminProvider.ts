import { getFirestore, Firestore, DocumentReference, CollectionReference, Query, DocumentSnapshot, QuerySnapshot, WriteBatch } from "firebase-admin/firestore";
import { getApps, initializeApp } from "firebase-admin/app";
import { Logger } from "../../utils/logger";
import {
  IDatabaseProvider,
  ICollectionReference,
  IWriteBatch,
  IDocumentReference,
  IQuery,
  IQuerySnapshot,
  IDocumentSnapshot
} from "./DatabaseProvider";

class AdminDocSnapshot implements IDocumentSnapshot {
  constructor(private snap: DocumentSnapshot) {}
  get id() { return this.snap.id; }
  get exists() { return this.snap.exists; }
  get ref() { return new AdminDocRef(this.snap.ref); }
  data() { return this.snap.data(); }
}

class AdminQuerySnapshot implements IQuerySnapshot {
  constructor(private snap: QuerySnapshot) {}
  get empty() { return this.snap.empty; }
  get docs() { return this.snap.docs.map(d => new AdminDocSnapshot(d)); }
  forEach(callback: (doc: IDocumentSnapshot) => void) {
    this.docs.forEach(callback);
  }
}

class AdminDocRef implements IDocumentReference {
  constructor(private ref: DocumentReference) {}
  get id() { return this.ref.id; }
  async get() {
    const snap = await this.ref.get();
    return new AdminDocSnapshot(snap);
  }
  async set(data: any, options?: { merge?: boolean }) {
    if (options) {
      await this.ref.set(data, options);
    } else {
      await this.ref.set(data);
    }
  }
  async update(data: any) {
    await this.ref.update(data);
  }
  async delete() {
    await this.ref.delete();
  }
  get _rawRef() { return this.ref; }
}

class AdminQuery implements IQuery {
  constructor(protected q: Query) {}
  where(field: string, op: any, value: any): IQuery {
    return new AdminQuery(this.q.where(field, op, value));
  }
  limit(n: number): IQuery {
    return new AdminQuery(this.q.limit(n));
  }
  async get() {
    const snap = await this.q.get();
    return new AdminQuerySnapshot(snap);
  }
}

class AdminCollectionRef extends AdminQuery implements ICollectionReference {
  constructor(private colRef: CollectionReference) {
    super(colRef);
  }
  doc(id?: string): IDocumentReference {
    const documentRef = id ? this.colRef.doc(id) : this.colRef.doc();
    return new AdminDocRef(documentRef);
  }
}

class AdminWriteBatch implements IWriteBatch {
  private batch: WriteBatch;
  constructor(db: Firestore) {
    this.batch = db.batch();
  }
  set(docRef: IDocumentReference, data: any): IWriteBatch {
    const rawRef = (docRef as AdminDocRef)._rawRef;
    this.batch.set(rawRef, data);
    return this;
  }
  update(docRef: IDocumentReference, data: any): IWriteBatch {
    const rawRef = (docRef as AdminDocRef)._rawRef;
    this.batch.update(rawRef, data);
    return this;
  }
  delete(docRef: IDocumentReference): IWriteBatch {
    const rawRef = (docRef as AdminDocRef)._rawRef;
    this.batch.delete(rawRef);
    return this;
  }
  async commit() {
    await this.batch.commit();
  }
}

export class FirestoreAdminProvider implements IDatabaseProvider {
  private db: Firestore;

  constructor() {
    if (getApps().length === 0) {
      initializeApp({
        projectId: "gen-lang-client-0853696923"
      });
    }
    this.db = getFirestore();
    Logger.info("[FirestoreAdminProvider] Inicializado via Firebase Admin SDK com credenciais padrão.");
  }

  collection(name: string): ICollectionReference {
    return new AdminCollectionRef(this.db.collection(name));
  }

  batch(): IWriteBatch {
    return new AdminWriteBatch(this.db);
  }
}
