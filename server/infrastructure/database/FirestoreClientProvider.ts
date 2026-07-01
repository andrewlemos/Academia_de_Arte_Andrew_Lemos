import { initializeApp, getApp, getApps } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  limit,
  writeBatch,
  DocumentReference,
  CollectionReference,
  Query,
  DocumentSnapshot,
  QuerySnapshot,
  WriteBatch,
  Firestore
} from "firebase/firestore";
import fs from "fs";
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

class ClientDocSnapshot implements IDocumentSnapshot {
  constructor(private snap: DocumentSnapshot<any>) {}
  get id() { return this.snap.id; }
  get exists() { return this.snap.exists(); }
  get ref() { return new ClientDocRef(this.snap.ref); }
  data() { return this.snap.data(); }
}

class ClientQuerySnapshot implements IQuerySnapshot {
  constructor(private snap: QuerySnapshot<any>) {}
  get empty() { return this.snap.empty; }
  get docs() { return this.snap.docs.map(d => new ClientDocSnapshot(d)); }
  forEach(callback: (doc: IDocumentSnapshot) => void) {
    this.docs.forEach(callback);
  }
}

class ClientDocRef implements IDocumentReference {
  constructor(private ref: DocumentReference<any>) {}
  get id() { return this.ref.id; }
  async get() {
    const snap = await getDoc(this.ref);
    return new ClientDocSnapshot(snap);
  }
  async set(data: any, options?: { merge?: boolean }) {
    if (options) {
      await setDoc(this.ref, data, options);
    } else {
      await setDoc(this.ref, data);
    }
  }
  async update(data: any) {
    await updateDoc(this.ref, data);
  }
  async delete() {
    await deleteDoc(this.ref);
  }
  get _rawRef() { return this.ref; }
}

class ClientQuery implements IQuery {
  constructor(protected q: Query<any>) {}
  where(field: string, op: any, value: any): IQuery {
    return new ClientQuery(query(this.q, where(field, op, value)));
  }
  limit(n: number): IQuery {
    return new ClientQuery(query(this.q, limit(n)));
  }
  async get() {
    const snap = await getDocs(this.q);
    return new ClientQuerySnapshot(snap);
  }
}

class ClientCollectionRef extends ClientQuery implements ICollectionReference {
  constructor(private colRef: CollectionReference<any>) {
    super(colRef);
  }
  doc(id?: string): IDocumentReference {
    const documentRef = id ? doc(this.colRef, id) : doc(this.colRef);
    return new ClientDocRef(documentRef);
  }
}

class ClientWriteBatch implements IWriteBatch {
  private batch: WriteBatch;
  constructor(db: Firestore) {
    this.batch = writeBatch(db);
  }
  set(docRef: IDocumentReference, data: any): IWriteBatch {
    const rawRef = (docRef as ClientDocRef)._rawRef;
    this.batch.set(rawRef, data);
    return this;
  }
  update(docRef: IDocumentReference, data: any): IWriteBatch {
    const rawRef = (docRef as ClientDocRef)._rawRef;
    this.batch.update(rawRef, data);
    return this;
  }
  delete(docRef: IDocumentReference): IWriteBatch {
    const rawRef = (docRef as ClientDocRef)._rawRef;
    this.batch.delete(rawRef);
    return this;
  }
  async commit() {
    await this.batch.commit();
  }
}

export class FirestoreClientProvider implements IDatabaseProvider {
  private db: Firestore;

  constructor() {
    let config: any;
    try {
      const configPath = "./firebase-applet-config.json";
      if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      } else {
        throw new Error(`Arquivo de configuração não encontrado em: ${configPath}`);
      }
    } catch (error: any) {
      Logger.error("Falha ao ler firebase-applet-config.json:", error);
      throw error;
    }

    const app = getApps().length === 0 ? initializeApp(config) : getApp();
    this.db = getFirestore(app, config.firestoreDatabaseId);
    Logger.info(`[FirestoreClientProvider] Conectado via Client SDK ao banco de dados: ${config.firestoreDatabaseId}`);
  }

  collection(name: string): ICollectionReference {
    return new ClientCollectionRef(collection(this.db, name));
  }

  batch(): IWriteBatch {
    return new ClientWriteBatch(this.db);
  }
}
