const MONGO_OBJECT_ID_RE = /^[a-f\d]{24}$/i;

export function isLikelyMongoObjectId(value: string): boolean {
  return MONGO_OBJECT_ID_RE.test(String(value ?? '').trim());
}

export type VidyaSubjectCatalogEntry = { _id?: string; id?: string; name?: string };

export function collectVidyaSubjectLabels(sources: {
  subjectProgress?: { name?: string }[];
  subjects?: VidyaSubjectCatalogEntry[];
  assignedSubjects?: unknown[];
  assignedClassSubjects?: unknown[];
}): string[] {
  const catalog = sources.subjects ?? [];
  const names = new Set<string>();

  const lookupNameById = (id: string) => {
    const f = catalog.find((s) => String(s._id || s.id) === id);
    const nm = f?.name != null ? String(f.name).trim() : '';
    return nm && !isLikelyMongoObjectId(nm) ? nm : null;
  };

  const addRaw = (raw: unknown) => {
    if (raw == null) return;
    if (typeof raw === 'object') {
      const o = raw as VidyaSubjectCatalogEntry;
      const nm = String(o.name ?? '').trim();
      if (nm && !isLikelyMongoObjectId(nm)) {
        names.add(nm);
        return;
      }
      const id = String(o._id ?? o.id ?? '').trim();
      if (id && isLikelyMongoObjectId(id)) {
        const resolved = lookupNameById(id);
        if (resolved) names.add(resolved);
      }
      return;
    }
    const t = String(raw).trim();
    if (!t) return;
    if (isLikelyMongoObjectId(t)) {
      const resolved = lookupNameById(t);
      if (resolved) names.add(resolved);
      return;
    }
    names.add(t);
  };

  (sources.subjectProgress ?? []).forEach((s) => addRaw((s as { name?: string })?.name ?? s));
  (sources.subjects ?? []).forEach((s) => addRaw(s));
  (sources.assignedSubjects ?? []).forEach(addRaw);
  (sources.assignedClassSubjects ?? []).forEach(addRaw);

  return dedupeVidyaSubjectNames(names);
}

function canonicalVidyaSubjectKey(raw: string): string {
  let s = String(raw ?? '').trim();
  if (!s) return '';
  s = s.replace(/[_\s]+(?:class|grade)\s*\d{1,2}$/i, '');
  s = s.replace(/_\d{1,2}$/i, '');
  s = s.replace(/\s+\d{1,2}$/, '');
  return s
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function labelFromCanonicalKey(key: string): string {
  if (!key) return '';
  return key
    .split(' ')
    .map((w) => (w.length ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ''))
    .filter(Boolean)
    .join(' ');
}

export function dedupeVidyaSubjectNames(names: Iterable<string>): string[] {
  const keys = new Set<string>();
  Array.from(names).forEach((raw) => {
    const s = String(raw ?? '').trim();
    if (!s || isLikelyMongoObjectId(s)) return;
    const key = canonicalVidyaSubjectKey(s);
    if (key) keys.add(key);
  });
  return Array.from(keys)
    .map(labelFromCanonicalKey)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

export function mergeSubjectOptions(
  subjectOptions: string[] | undefined,
  currentSubject: string | undefined
): string[] {
  const opts = (subjectOptions ?? []).map((s) => String(s || '').trim()).filter(Boolean);
  const cur = String(currentSubject || '').trim();
  const list = opts.length > 0 ? [...opts] : cur ? [cur] : ['General Study'];
  const hasCur = cur && list.some((x) => x.localeCompare(cur, undefined, { sensitivity: 'accent' }) === 0);
  const merged = cur && !hasCur ? [cur, ...list] : list;
  return Array.from(new Set(merged)).filter((s) => !isLikelyMongoObjectId(s));
}

export function formatVidyaMessage(text: string): string {
  if (!text) return '';
  let cleaned = String(text);
  cleaned = cleaned.replace(/\r\n/g, '\n');
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, '');
  cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '$1');
  cleaned = cleaned.replace(/__(.*?)__/g, '$1');
  cleaned = cleaned.replace(/^\s*[-*]\s+/gm, '• ');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  return cleaned.trim();
}

/**
 * Android Fabric often measures Text one glyph short inside tight bubbles /
 * TextInputs. Append a hair-space so the last real character stays visible.
 */
export function withAndroidTextSafeEnd(text: string): string {
  const value = String(text || '');
  if (!value) return value;
  return `${value}\u200A`;
}
