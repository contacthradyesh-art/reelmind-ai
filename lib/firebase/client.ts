import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, collection, addDoc, doc, getDoc, getDocs, query, orderBy, serverTimestamp, updateDoc, deleteDoc, type DocumentData } from "firebase/firestore";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
};
export const firebaseConfigured = Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
const app = firebaseConfigured ? (getApps().length ? getApp() : initializeApp(config)) : null;
export const auth = app ? getAuth(app) : null;
export const googleProvider = new GoogleAuthProvider();
export const db = app ? getFirestore(app) : null;

export type CloudProject = { id: string; title: string; updatedAt?: Date; data: Record<string, unknown> };
function requireServices() {
  if (!auth || !db) throw new Error("Firebase is not configured. Add the NEXT_PUBLIC_FIREBASE_* values from .env.example.");
  if (!auth.currentUser) throw new Error("Sign in with Google before saving projects.");
  return { auth, db, uid: auth.currentUser.uid };
}
export async function saveCloudProject(title: string, data: Record<string, unknown>, projectId?: string) {
  const { db: firestore, uid } = requireServices();
  if (projectId) {
    const ref = doc(firestore, "users", uid, "projects", projectId);
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) throw new Error("Project not found or access denied.");
    await updateDoc(ref, { title: title.slice(0, 120), data, updatedAt: serverTimestamp() });
    return projectId;
  }
  const created = await addDoc(collection(firestore, "users", uid, "projects"), { title: title.slice(0, 120), data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return created.id;
}
export async function listCloudProjects(): Promise<CloudProject[]> {
  const { db: firestore, uid } = requireServices();
  const result = await getDocs(query(collection(firestore, "users", uid, "projects"), orderBy("updatedAt", "desc")));
  return result.docs.map(item => {
    const data = item.data() as DocumentData;
    return { id: item.id, title: typeof data.title === "string" ? data.title : "Untitled project", updatedAt: data.updatedAt?.toDate?.(), data: data.data && typeof data.data === "object" ? data.data as Record<string, unknown> : {} };
  });
}
export async function loadCloudProject(id: string): Promise<CloudProject> {
  const { db: firestore, uid } = requireServices();
  const snapshot = await getDoc(doc(firestore, "users", uid, "projects", id));
  if (!snapshot.exists()) throw new Error("Project not found.");
  const data = snapshot.data();
  return { id: snapshot.id, title: String(data.title ?? "Untitled project"), updatedAt: data.updatedAt?.toDate?.(), data: (data.data ?? {}) as Record<string, unknown> };
}
export async function deleteCloudProject(id: string) {
  const { db: firestore, uid } = requireServices();
  await deleteDoc(doc(firestore, "users", uid, "projects", id));
}
