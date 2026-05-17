'use client';
import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AdminLayout from '@/components/AdminLayout';
import { AdminAPI, getBlogs } from '@/lib/api';
import { v, firstError } from '@/lib/validators';

const slugify = (s: string) =>
  s.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);

const defaultBlogForm = () => ({
  title: '', slug: '', excerpt: '', content: '', category: '',
  tags: [] as string[],
  meta_title: '', meta_description: '', meta_keywords: '',
  schema_json: '',
  featured_image: null as File | string | null,
  is_published: false,
});

export default function AdminBlogsPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<any>(null);
  const [form, setForm] = useState<any>(defaultBlogForm());
  const [slugLocked, setSlugLocked] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ['admin-blogs'], queryFn: () => getBlogs({ limit: 100 }) });
  const rawBl: any = data;
  const blogs: any[] = Array.isArray(rawBl?.blogs) ? rawBl.blogs : Array.isArray(rawBl) ? rawBl : [];

  const { data: catsData } = useQuery({ queryKey: ['blog-categories'], queryFn: () => AdminAPI.getBlogCategories() });
  const existingCats: string[] = Array.isArray(catsData) ? catsData : [];

  const saveMut = useMutation({
    mutationFn: (data: any = form) => {
      const err = firstError([
        v.text(data.title, { field: 'title', min: 4, max: 200 }),
        v.slug(data.slug),
        v.text(data.content, { field: 'content', min: 10, max: 200_000 }),
        v.text(data.excerpt, { field: 'excerpt', max: 500, optional: true }),
        v.text(data.meta_title, { field: 'meta_title', max: 70, optional: true }),
        v.text(data.meta_description, { field: 'meta_description', max: 200, optional: true }),
        v.text(data.meta_keywords, { field: 'meta_keywords', max: 300, optional: true }),
        v.image(data.featured_image instanceof File ? data.featured_image : null, { field: 'featured_image', maxMB: 8 }),
      ]);
      if (err) return Promise.reject(new Error(err));
      const fd = new FormData();
      const skip = ['created_at', 'updated_at', 'createdAt', 'updatedAt', 'author', 'view_count', 'id'];
      Object.entries(data).forEach(([k, v]) => {
        if (skip.includes(k)) return;
        if (k === 'featured_image') { if (v instanceof File) fd.append('featured_image', v); return; }
        if (k === 'tags' && Array.isArray(v)) { fd.append('tags', JSON.stringify(v)); return; }
        if (v === null || v === undefined) return;
        fd.append(k, String(v));
      });
      return modal.id ? AdminAPI.updateBlog(modal.id, fd) : AdminAPI.createBlog(fd);
    },
    onSuccess: () => { toast.success('Blog saved!'); setModal(null); qc.invalidateQueries({ queryKey: ['admin-blogs'] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => AdminAPI.deleteBlog(id),
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['admin-blogs'] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const f = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  // Auto-slug from title (unless user manually edited slug)
  useEffect(() => {
    if (!modal) return;
    if (slugLocked) return;
    if (!form.title) return;
    const next = slugify(form.title);
    if (next && next !== form.slug) f('slug', next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.title]);

  const openNew = () => {
    setForm(defaultBlogForm());
    setSlugLocked(false);
    setModal({ new: true });
  };

  const openEdit = (b: any) => {
    setForm({
      ...defaultBlogForm(),
      ...b,
      tags: Array.isArray(b.tags) ? b.tags : (typeof b.tags === 'string' ? safeParseArr(b.tags) : []),
    });
    setSlugLocked(true);
    setModal(b);
  };

  return (
    <AdminLayout>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Blog Posts</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>{blogs.length} posts</p>
        </div>
        <button onClick={openNew} className="btn btn-primary">+ New Post</button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Title</th><th>Slug</th><th>Category</th><th>Views</th><th>Status</th><th>Published</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {isLoading ? Array(5).fill(null).map((_, i) => <tr key={i}><td colSpan={7}><div className="skeleton skel-text" /></td></tr>) :
                blogs.length === 0 ? <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px' }}>No blogs yet</td></tr> :
                blogs.map((b: any) => (
                  <tr key={b.id}>
                    <td><div style={{ fontWeight: 700, fontSize: '0.875rem', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.title}</div></td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-muted)' }}>{b.slug}</td>
                    <td style={{ fontSize: '0.82rem', textTransform: 'capitalize' }}>{b.category || '—'}</td>
                    <td style={{ fontWeight: 600 }}>{b.view_count || 0}</td>
                    <td><span className={`badge ${b.is_published ? 'badge-green' : 'badge-gray'}`}>{b.is_published ? 'Published' : 'Draft'}</span></td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{b.created_at && new Date(b.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => openEdit(b)} className="btn btn-sm btn-outline">Edit</button>
                        <button onClick={() => window.confirm('Delete?') && deleteMut.mutate(b.id)} className="btn btn-sm btn-danger">Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 820 }}>
            <div className="modal-header">
              <h3>{modal.new ? 'New Blog Post' : 'Edit Post'}</h3>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Title *</label>
                <input className="input" value={form.title || ''} onChange={e => f('title', e.target.value)} />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Slug * <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.72rem' }}>{slugLocked ? '(manual)' : '(auto-generated)'}</span></label>
                  <input
                    className="input"
                    value={form.slug || ''}
                    onChange={e => { setSlugLocked(true); f('slug', slugify(e.target.value)); }}
                    placeholder="my-blog-post"
                  />
                  {slugLocked && (
                    <button type="button" onClick={() => { setSlugLocked(false); f('slug', slugify(form.title || '')); }}
                      style={{ background: 'none', border: 'none', color: 'var(--forest)', fontSize: '0.72rem', cursor: 'pointer', padding: '4px 0' }}>
                      ↺ regenerate from title
                    </button>
                  )}
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <input className="input" list="cat-list" value={form.category || ''} onChange={e => f('category', e.target.value)} />
                  <datalist id="cat-list">{existingCats.map(c => <option key={c} value={c} />)}</datalist>
                </div>
              </div>

              <div className="form-group">
                <label>Excerpt</label>
                <textarea className="input" value={form.excerpt || ''} onChange={e => f('excerpt', e.target.value)} rows={2} style={{ resize: 'vertical' }} placeholder="Short summary shown in post lists" />
              </div>

              <div className="form-group">
                <label>Content *</label>
                <RichEditor value={form.content || ''} onChange={(v: string) => f('content', v)} />
              </div>

              <TagsInput tags={form.tags || []} onChange={(t: string[]) => f('tags', t)} />

              {/* SEO Section */}
              <Collapsible title="🔎 SEO Meta" defaultOpen>
                <div className="form-group">
                  <label>Meta Title <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.72rem' }}>(defaults to post title)</span></label>
                  <input className="input" value={form.meta_title || ''} onChange={e => f('meta_title', e.target.value)} maxLength={70} />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{(form.meta_title || '').length}/70</span>
                </div>
                <div className="form-group">
                  <label>Meta Description</label>
                  <textarea className="input" rows={2} maxLength={160} value={form.meta_description || ''} onChange={e => f('meta_description', e.target.value)} />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{(form.meta_description || '').length}/160</span>
                </div>
                <div className="form-group">
                  <label>Meta Keywords <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.72rem' }}>(comma separated)</span></label>
                  <input className="input" value={form.meta_keywords || ''} onChange={e => f('meta_keywords', e.target.value)} placeholder="gardening, indoor plants, organic" />
                </div>
              </Collapsible>

              <Collapsible title="🧬 Structured Data / Schema (JSON-LD)">
                <textarea
                  className="input"
                  rows={6}
                  style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: '0.78rem' }}
                  value={form.schema_json || ''}
                  onChange={e => f('schema_json', e.target.value)}
                  placeholder='{"@context":"https://schema.org","@type":"Article","headline":"..."}'
                />
                <button type="button"
                  onClick={() => f('schema_json', buildDefaultSchema(form))}
                  className="btn btn-sm btn-outline" style={{ marginTop: 6 }}>
                  ✨ Generate from this post
                </button>
              </Collapsible>

              <div className="form-group">
                <label>Featured Image</label>
                <input type="file" className="input" onChange={e => f('featured_image', e.target.files?.[0])} accept="image/*" />
                {form.featured_image && !(form.featured_image instanceof File) && (
                  <img src={form.featured_image} alt="Current" style={{ marginTop: 8, borderRadius: 8, height: 120, width: '100%', objectFit: 'cover', border: '1px solid var(--border)' }} />
                )}
                {form.featured_image instanceof File && <p style={{ fontSize: '0.75rem', marginTop: 4, color: 'var(--forest)' }}>New image: {form.featured_image.name}</p>}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" id="pub" checked={!!form.is_published} onChange={e => f('is_published', e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: 'var(--forest)', cursor: 'pointer' }} />
                <label htmlFor="pub" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-2)', cursor: 'pointer' }}>Publish immediately</label>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setModal(null)} className="btn btn-ghost">Cancel</button>
              <button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending || !form.title || !form.slug || !form.content} className="btn btn-primary">
                {saveMut.isPending ? 'Saving…' : 'Save Post'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function safeParseArr(s: string): string[] {
  try { const v = JSON.parse(s); return Array.isArray(v) ? v : []; } catch { return s.split(',').map(x => x.trim()).filter(Boolean); }
}

function buildDefaultSchema(form: any): string {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: form.title || '',
    description: form.meta_description || form.excerpt || '',
    image: typeof form.featured_image === 'string' ? form.featured_image : undefined,
    datePublished: new Date().toISOString().split('T')[0],
    author: { '@type': 'Organization', name: 'GharKaMali' },
    publisher: { '@type': 'Organization', name: 'GharKaMali' },
    keywords: form.meta_keywords || (Array.isArray(form.tags) ? form.tags.join(', ') : ''),
  };
  return JSON.stringify(schema, null, 2);
}

// ── Tags chip input ─────────────────────────────────────────────────────────
function TagsInput({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [input, setInput] = useState('');
  const add = () => {
    const v = input.trim().replace(/,$/, '');
    if (!v) return;
    if (!tags.includes(v)) onChange([...tags, v]);
    setInput('');
  };
  return (
    <div className="form-group">
      <label>Tags <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.72rem' }}>(press Enter or comma to add)</span></label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: 8, border: '1px solid var(--border)', borderRadius: 8, minHeight: 44, background: '#fff' }}>
        {tags.map((t, i) => (
          <span key={i} style={{ background: 'var(--bg)', padding: '4px 10px', borderRadius: 99, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: 'var(--forest)' }}>
            {t}
            <button type="button" onClick={() => onChange(tags.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: 0, fontSize: '0.9rem', lineHeight: 1 }}>×</button>
          </span>
        ))}
        <input
          value={input}
          onChange={e => {
            const v = e.target.value;
            if (v.endsWith(',')) { setInput(v.slice(0, -1)); setTimeout(add, 0); }
            else setInput(v);
          }}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } else if (e.key === 'Backspace' && !input && tags.length) onChange(tags.slice(0, -1)); }}
          placeholder={tags.length ? '' : 'e.g. indoor, organic'}
          style={{ flex: 1, minWidth: 100, border: 'none', outline: 'none', background: 'transparent', fontSize: '0.85rem', fontFamily: 'inherit' }}
        />
      </div>
    </div>
  );
}

// ── Collapsible section ─────────────────────────────────────────────────────
function Collapsible({ title, children, defaultOpen = false }: any) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 10, marginBottom: 16, overflow: 'hidden' }}>
      <button type="button" onClick={() => setOpen(o => !o)}
        style={{ width: '100%', padding: '10px 14px', background: 'var(--bg)', border: 'none', textAlign: 'left', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text)', fontFamily: 'inherit' }}>
        {title} <span style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>▾</span>
      </button>
      {open && <div style={{ padding: 14, background: '#fff', borderTop: '1px solid var(--border)' }}>{children}</div>}
    </div>
  );
}

// ── Simple WYSIWYG: toolbar over a textarea ─────────────────────────────────
function RichEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const wrap = (before: string, after: string = before, placeholder = '') => {
    const ta = ref.current; if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const sel = value.slice(s, e) || placeholder;
    const next = value.slice(0, s) + before + sel + after + value.slice(e);
    onChange(next);
    setTimeout(() => { ta.focus(); ta.selectionStart = s + before.length; ta.selectionEnd = s + before.length + sel.length; }, 0);
  };

  const tools = [
    { l: 'B', t: 'Bold', fn: () => wrap('<strong>', '</strong>', 'bold') },
    { l: 'I', t: 'Italic', fn: () => wrap('<em>', '</em>', 'italic') },
    { l: 'H2', t: 'Heading 2', fn: () => wrap('<h2>', '</h2>\n', 'Heading') },
    { l: 'H3', t: 'Heading 3', fn: () => wrap('<h3>', '</h3>\n', 'Heading') },
    { l: 'P', t: 'Paragraph', fn: () => wrap('<p>', '</p>\n', 'Text') },
    { l: 'UL', t: 'Bullet list', fn: () => wrap('<ul>\n  <li>', '</li>\n</ul>\n', 'Item') },
    { l: 'OL', t: 'Numbered list', fn: () => wrap('<ol>\n  <li>', '</li>\n</ol>\n', 'Item') },
    { l: 'LI', t: 'List item', fn: () => wrap('<li>', '</li>\n', 'Item') },
    {
      l: '🔗', t: 'Link', fn: () => {
        const url = prompt('Enter URL:', 'https://'); if (!url) return;
        wrap(`<a href="${url}" target="_blank" rel="noopener">`, '</a>', 'link text');
      }
    },
    {
      l: '🖼', t: 'Image', fn: () => {
        const url = prompt('Image URL:', 'https://'); if (!url) return;
        const alt = prompt('Alt text:', '') || '';
        const ta = ref.current; const s = ta?.selectionStart ?? value.length;
        onChange(value.slice(0, s) + `<img src="${url}" alt="${alt}" />\n` + value.slice(s));
      }
    },
    { l: '“ ”', t: 'Quote', fn: () => wrap('<blockquote>', '</blockquote>\n', 'Quote') },
    { l: '< >', t: 'Code', fn: () => wrap('<code>', '</code>', 'code') },
    { l: '— HR', t: 'Divider', fn: () => { const ta = ref.current; const s = ta?.selectionStart ?? value.length; onChange(value.slice(0, s) + '\n<hr />\n' + value.slice(s)); } },
  ];

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: 6, background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
        {tools.map(t => (
          <button key={t.l} type="button" title={t.t} onClick={t.fn}
            style={{ padding: '4px 9px', borderRadius: 6, background: '#fff', border: '1px solid var(--border)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, fontFamily: 'inherit', color: 'var(--text-2)' }}>
            {t.l}
          </button>
        ))}
      </div>
      <textarea
        ref={ref}
        className="input"
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={12}
        placeholder="Write your post content (HTML supported). Use the toolbar to insert tags."
        style={{ border: 'none', borderRadius: 0, resize: 'vertical', fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '0.85rem', minHeight: 240 }}
      />
      {value && (
        <div style={{ padding: 12, borderTop: '1px solid var(--border)', background: '#fafafa' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Live preview</div>
          <div style={{ fontSize: '0.88rem', color: 'var(--text)', lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: value }} />
        </div>
      )}
    </div>
  );
}
