"use client";
// Senha do app (4 números), por aparelho. Guarda só um "hash" PBKDF2 com sal — nunca a senha.
// Protege contra quem pega o celular desbloqueado; não é criptografia dos dados.

const KEY = "norte:lock";
const UNLOCKED = "norte:unlocked";
const HIDDEN_AT = "norte:hidden-at";
const FAILS = "norte:lock-fails";

export interface LockRecord {
  salt: string;
  hash: string;
  it: number;
  after: number; // minutos em segundo plano até pedir a senha de novo (0 = sempre que voltar)
}

const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function derive(pin: string, salt: Uint8Array, it: number): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations: it }, key, 256);
  return b64(new Uint8Array(bits));
}

export function getLock(): LockRecord | null {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "null");
  } catch {
    return null;
  }
}

export async function setPin(pin: string, after = 1) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const it = 150_000;
  const rec: LockRecord = { salt: b64(salt), hash: await derive(pin, salt, it), it, after };
  localStorage.setItem(KEY, JSON.stringify(rec));
  markUnlocked();
}

export function setLockAfter(after: number) {
  const rec = getLock();
  if (rec) localStorage.setItem(KEY, JSON.stringify({ ...rec, after }));
}

export async function verifyPin(pin: string): Promise<boolean> {
  const rec = getLock();
  if (!rec) return true;
  return (await derive(pin, unb64(rec.salt), rec.it)) === rec.hash;
}

export function clearLock() {
  localStorage.removeItem(KEY);
  localStorage.removeItem(FAILS);
}

export function markUnlocked() {
  sessionStorage.setItem(UNLOCKED, "1");
  sessionStorage.removeItem(HIDDEN_AT);
}

/** Precisa pedir a senha agora? */
export function isLocked(): boolean {
  const rec = getLock();
  if (!rec) return false;
  if (sessionStorage.getItem(UNLOCKED) !== "1") return true;
  const hidden = Number(sessionStorage.getItem(HIDDEN_AT) || 0);
  return Boolean(hidden && Date.now() - hidden >= rec.after * 60_000);
}

export function noteHidden() {
  if (getLock()) sessionStorage.setItem(HIDDEN_AT, String(Date.now()));
}

export function noteVisible() {
  if (!isLocked()) sessionStorage.removeItem(HIDDEN_AT);
}

export function relock() {
  sessionStorage.removeItem(UNLOCKED);
}

/** Tentativas erradas: depois de 5, espera 30 s (e dobra a cada nova rodada). */
export function failInfo(): { count: number; until: number } {
  try {
    return JSON.parse(localStorage.getItem(FAILS) || '{"count":0,"until":0}');
  } catch {
    return { count: 0, until: 0 };
  }
}

export function registerFail() {
  const f = failInfo();
  const count = f.count + 1;
  const until = count % 5 === 0 ? Date.now() + 30_000 * 2 ** (count / 5 - 1) : f.until;
  localStorage.setItem(FAILS, JSON.stringify({ count, until }));
  return { count, until };
}

export function resetFails() {
  localStorage.removeItem(FAILS);
}
