import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface ServiceDoc {
  id: string;
  name: string;
  slug: string;
  category: string;
  description?: string;
  icon?: string;
  enabled?: boolean;
  config?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export const getServices = async (): Promise<ServiceDoc[]> => {
  const col = collection(db, 'services');
  const snap = await getDocs(col);
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as ServiceDoc));
};

export const getServiceBySlug = async (slug: string): Promise<ServiceDoc | null> => {
  const q = query(collection(db, 'services'), where('slug', '==', slug));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...(d.data() as any) } as ServiceDoc;
};

export const getServiceById = async (id: string): Promise<ServiceDoc | null> => {
  const ref = doc(db, 'services', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as any) } as ServiceDoc;
};