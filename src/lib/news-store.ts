// src/lib/news-store.ts
import { kv } from '@vercel/kv';

export type NewsItem = {
  id: string;
  title: string;
  body: string;
  imageUrl?: string;
  createdAt: number;
};

const KEY = 'news:list';

export async function listNews(): Promise<NewsItem[]> {
  const arr = (await kv.get<NewsItem[]>(KEY)) || [];
  return arr.sort((a, b) => b.createdAt - a.createdAt);
}

export async function addNews(item: NewsItem) {
  const current = (await kv.get<NewsItem[]>(KEY)) || [];
  current.push(item);
  await kv.set(KEY, current);
}

export async function deleteNews(id: string) {
  const current = (await kv.get<NewsItem[]>(KEY)) || [];
  const next = current.filter(n => n.id !== id);
  await kv.set(KEY, next);
}
