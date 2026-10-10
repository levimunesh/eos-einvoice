// Archive: keeps the original e-invoice XML unchanged, with a checksum and the legal retention date.
// Storage: the app's private per-person data space when the host provides one, otherwise this browser.
import { store as ls } from './ui/dom.js';
import { keepUntilFor } from './countries.js';

const LS_KEY = 'eos.archive.v1';
const CHUNK = 180000; // characters per stored part (documents are limited to 256 KiB)
export async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2, '0')).join('');
}
// country: whose retention rule applies (the country the file's rules belong to, else the one chosen in the app)
export function metaFrom(result, xml, direction, source, country = 'DE') {
  const d = result.parsed.data; const now = new Date().toISOString();
  return {
    direction, number: d.number || '', issueDate: d.issueDate || '', seller: d.seller?.name || '', buyer: d.buyer?.name || '', total: d.totals?.grandTotal || '', due: d.totals?.due || '', currency: d.currency || 'EUR', typeCode: d.typeCode || '380',
    syntax: result.syntax, standard: result.spec?.label || '', verdict: result.verdict, errors: result.counts.error, warnings: result.counts.warning, country,
    bytes: new TextEncoder().encode(xml).length, source: source || '', archivedAt: now, keepUntil: keepUntilFor(country, d.issueDate, now),
  };
}

class LocalArchive {
  constructor() { this.mode = 'local'; this.items = []; this.listeners = new Set(); this.persistent = true; this._load(); }
  _load() { const v = ls.get(LS_KEY, null); this.items = Array.isArray(v) ? v : []; }
  _save() { this.persistent = ls.set(LS_KEY, this.items); if (!this.persistent) this.mode = 'memory'; this._emit(); }
  _emit() { const list = this.list(); for (const f of this.listeners) f(list); }
  list() { return this.items.map(({ xml, ...m }) => m).sort((a, b) => (b.archivedAt || '').localeCompare(a.archivedAt || '')); }
  subscribe(fn) { this.listeners.add(fn); fn(this.list()); return () => this.listeners.delete(fn); }
  async add(meta, xml) { const id = 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); this.items.push({ ...meta, id, xml }); this._save(); return id; }
  async getXml(id) { return this.items.find(i => i.id === id)?.xml ?? null; }
  async remove(id) { this.items = this.items.filter(i => i.id !== id); this._save(); }
}

class DbArchive {
  constructor(db, uid) { this.mode = 'db'; this.db = db; this.col = db.collection('data/users/' + uid); this.items = []; this.listeners = new Set(); this.unsub = null; this.error = null; }
  _start() {
    if (this.unsub) return;
    this.unsub = this.col.orderBy('archivedAt', 'desc').limit(1000).onSnapshot(
      snap => { this.items = snap.docs.map(d => ({ ...d.data(), id: d.id })); for (const f of this.listeners) f(this.items); },
      e => { this.error = e; this.unsub = null; for (const f of this.listeners) f(this.items, e); });
  }
  list() { return this.items; }
  subscribe(fn) { this.listeners.add(fn); this._start(); fn(this.items); return () => this.listeners.delete(fn); }
  async add(meta, xml) {
    const ref = this.col.doc();
    const parts = []; for (let i = 0; i < xml.length; i += CHUNK) parts.push(xml.slice(i, i + CHUNK));
    if (parts.length > 40) throw { code: 'too_large', message: 'This file is too large for the archive.' };
    for (let i = 0; i < parts.length; i++) await ref.collection('xml').doc('p' + i).set({ i, text: parts[i] });
    await ref.set({ ...meta, parts: parts.length });
    return ref.id;
  }
  async getXml(id) {
    const meta = this.items.find(i => i.id === id); const n = meta?.parts || 1; let out = '';
    for (let i = 0; i < n; i++) { const s = await this.col.doc(id).collection('xml').doc('p' + i).get(); if (!s.exists) return null; out += s.data().text; }
    return out;
  }
  async remove(id) {
    const meta = this.items.find(i => i.id === id); const n = meta?.parts || 1;
    for (let i = 0; i < n; i++) await this.col.doc(id).collection('xml').doc('p' + i).delete();
    await this.col.doc(id).delete();
  }
}

export function createArchive(db, uid) { return db && uid ? new DbArchive(db, uid) : new LocalArchive(); }
export function createLocalArchive() { return new LocalArchive(); }
