// Admin-side validators — same strict ruleset as the backend.
// Pattern:
//   const err = firstError([v.name(form.name), v.amount(form.price, { field: 'price' })]);
//   if (err) { toast.error(err); return; }
//   await save(...)

export type V = { ok: true } | { ok: false; field: string; message: string };

function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' '); }

export const v = {
  phone(value: any, opts: { field?: string; optional?: boolean } = {}): V {
    const field = opts.field ?? 'phone';
    const s = String(value ?? '').replace(/[\s-]/g, '').replace(/^(\+?91|0)/, '');
    if (!s) return opts.optional ? { ok: true } : { ok: false, field, message: 'Phone is required' };
    if (!/^[6-9]\d{9}$/.test(s)) return { ok: false, field, message: 'Enter a valid 10-digit Indian mobile number' };
    return { ok: true };
  },

  email(value: any, opts: { field?: string; optional?: boolean } = {}): V {
    const field = opts.field ?? 'email';
    const s = String(value ?? '').trim().toLowerCase();
    if (!s) return opts.optional ? { ok: true } : { ok: false, field, message: 'Email is required' };
    if (s.length > 120) return { ok: false, field, message: 'Email is too long' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return { ok: false, field, message: 'Enter a valid email' };
    return { ok: true };
  },

  name(value: any, opts: { field?: string; min?: number; max?: number; optional?: boolean } = {}): V {
    const field = opts.field ?? 'name';
    const min = opts.min ?? 2, max = opts.max ?? 80;
    const s = String(value ?? '').trim();
    if (!s) return opts.optional ? { ok: true } : { ok: false, field, message: `${cap(field)} is required` };
    if (s.length < min || s.length > max) return { ok: false, field, message: `${cap(field)} must be ${min}–${max} characters` };
    return { ok: true };
  },

  amount(value: any, opts: { field: string; min?: number; max?: number; optional?: boolean }): V {
    const { field } = opts;
    const min = opts.min ?? 0, max = opts.max ?? 1_000_000;
    if (value === '' || value == null) return opts.optional ? { ok: true } : { ok: false, field, message: `${cap(field)} is required` };
    const n = Number(value);
    if (!Number.isFinite(n)) return { ok: false, field, message: `${cap(field)} must be a number` };
    if (n < min || n > max) return { ok: false, field, message: `${cap(field)} must be between ${min} and ${max}` };
    return { ok: true };
  },

  integer(value: any, opts: { field: string; min?: number; max?: number; optional?: boolean }): V {
    const { field } = opts;
    const min = opts.min ?? 0, max = opts.max ?? 1_000_000;
    if (value === '' || value == null) return opts.optional ? { ok: true } : { ok: false, field, message: `${cap(field)} is required` };
    const n = Number(value);
    if (!Number.isInteger(n)) return { ok: false, field, message: `${cap(field)} must be a whole number` };
    if (n < min || n > max) return { ok: false, field, message: `${cap(field)} must be between ${min} and ${max}` };
    return { ok: true };
  },

  text(value: any, opts: { field: string; min?: number; max?: number; optional?: boolean }): V {
    const { field } = opts;
    const min = opts.min ?? 0, max = opts.max ?? 5000;
    const s = String(value ?? '').trim();
    if (!s) return opts.optional ? { ok: true } : { ok: false, field, message: `${cap(field)} is required` };
    if (s.length < min) return { ok: false, field, message: `${cap(field)} must be at least ${min} characters` };
    if (s.length > max) return { ok: false, field, message: `${cap(field)} must be at most ${max} characters` };
    return { ok: true };
  },

  enumIn(value: any, allowed: readonly (string | number)[], opts: { field: string; optional?: boolean }): V {
    const { field } = opts;
    if (value == null || value === '') return opts.optional ? { ok: true } : { ok: false, field, message: `${cap(field)} is required` };
    if (!allowed.includes(value)) return { ok: false, field, message: `${cap(field)} must be one of: ${allowed.join(', ')}` };
    return { ok: true };
  },

  slug(value: any, opts: { field?: string } = {}): V {
    const field = opts.field ?? 'slug';
    const s = String(value ?? '').trim().toLowerCase();
    if (!s) return { ok: false, field, message: 'Slug is required' };
    if (!/^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/.test(s))
      return { ok: false, field, message: 'Slug must be lowercase letters, numbers and hyphens only (max 80)' };
    return { ok: true };
  },

  password(value: any, opts: { field?: string; required?: boolean } = {}): V {
    const field = opts.field ?? 'password';
    const s = String(value ?? '');
    if (!s) return opts.required === false ? { ok: true } : { ok: false, field, message: 'Password is required' };
    if (s.length < 8 || s.length > 64) return { ok: false, field, message: 'Password must be 8–64 characters' };
    if (!/[A-Za-z]/.test(s) || !/\d/.test(s)) return { ok: false, field, message: 'Password must contain a letter and a number' };
    return { ok: true };
  },

  image(file: File | null | undefined, opts: { field?: string; maxMB?: number; required?: boolean } = {}): V {
    const field = opts.field ?? 'image';
    if (!file) return opts.required ? { ok: false, field, message: 'Image is required' } : { ok: true };
    if (!file.type.startsWith('image/')) return { ok: false, field, message: 'Only image files are allowed' };
    const maxMB = opts.maxMB ?? 5;
    if (file.size > maxMB * 1024 * 1024) return { ok: false, field, message: `Image must be under ${maxMB}MB` };
    return { ok: true };
  },
};

export function validateAll(checks: V[]): { field: string; message: string }[] {
  return checks.filter((c): c is Extract<V, { ok: false }> => !c.ok).map(c => ({ field: c.field, message: c.message }));
}

export function firstError(checks: V[]): string | null {
  const fails = validateAll(checks);
  return fails.length ? fails[0].message : null;
}

export const normalizePhone = (raw: any): string =>
  String(raw ?? '').replace(/[\s-]/g, '').replace(/^(\+?91|0)/, '');
