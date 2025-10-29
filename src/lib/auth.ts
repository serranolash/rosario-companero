// src/lib/auth.ts
import { NextRequest } from 'next/server';

export function getBearer(req: NextRequest) {
  const auth = req.headers.get('authorization') || '';
  const [, token] = auth.split(' ');
  return token || '';
}

export function isAdmin(req: NextRequest) {
  const token = getBearer(req);
  const admin = process.env.NEWS_ADMIN_TOKEN || '';
  return !!admin && token === admin;
}
