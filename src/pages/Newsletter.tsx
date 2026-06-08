import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useQuery, useMutation } from '@tanstack/react-query';
import { emailService, SendNewsletterPayload } from '@/services/emailService';
import { NewsletterEditor } from '@/components/ui/NewsletterEditor';
import {
  Send2, Eye, Add, Trash, ArrowUp2, ArrowDown2,
  Monitor, Mobile, GalleryAdd, TextBlock,
} from 'iconsax-react';
import { toast } from 'sonner';
import { usePermissions } from '@/hooks/useAuth';

// ─── Types ───────────────────────────────────────────────────────────────────

interface TextBlock { type: 'text'; content: string }
interface ImageBlock {
  type: 'image'; url: string;
  width: 'full' | 'medium' | 'small';
  height: string; // e.g. 'auto', '200px', '300px'
  border: 'none' | 'rounded' | 'circle';
  align: 'left' | 'center' | 'right';
}
type Block = TextBlock | ImageBlock;

type TitleSize = 'h1' | 'h2' | 'h3';
interface Section {
  title: string;
  titleSize: TitleSize;
  blocks: Block[];
}

// ─── Block component ─────────────────────────────────────────────────────────

function BlockItem({ block, index, total, onUpdate, onRemove, onMove }: {
  block: Block; index: number; total: number;
  onUpdate: (idx: number, block: Block) => void;
  onRemove: (idx: number) => void;
  onMove: (idx: number, dir: -1 | 1) => void;
}) {
  return (
    <div className="rounded-md border border-gray-150 bg-gray-50/50 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
          {block.type === 'text' ? 'Text' : 'Image'}
        </span>
        <div className="flex items-center gap-0.5">
          <button type="button" disabled={index === 0} onClick={() => onMove(index, -1)}
            className="p-1 rounded hover:bg-gray-200 disabled:opacity-30" title="Move up"><ArrowUp2 size={13} /></button>
          <button type="button" disabled={index === total - 1} onClick={() => onMove(index, 1)}
            className="p-1 rounded hover:bg-gray-200 disabled:opacity-30" title="Move down"><ArrowDown2 size={13} /></button>
          <button type="button" onClick={() => onRemove(index)}
            className="p-1 rounded hover:bg-red-50 text-red-500" title="Remove"><Trash size={13} /></button>
        </div>
      </div>

      {block.type === 'text' ? (
        <NewsletterEditor value={block.content}
          onChange={(html) => onUpdate(index, { ...block, content: html })}
          placeholder="Write your content..." minHeight="120px" />
      ) : (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input type="text" value={block.url}
              onChange={(e) => onUpdate(index, { ...block, url: e.target.value })}
              placeholder="Paste image URL or upload below"
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
            <label className="flex items-center gap-1.5 rounded-md bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-100 cursor-pointer transition-colors shrink-0">
              <GalleryAdd size={14} /> Upload
              <input type="file" accept="image/*" className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    const res = await emailService.uploadImage(file);
                    onUpdate(index, { ...block, url: res.url });
                    toast.success('Image uploaded');
                  } catch { toast.error('Upload failed'); }
                  e.target.value = '';
                }} />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500">Width:</span>
              {(['full', 'medium', 'small'] as const).map((w) => (
                <button key={w} type="button" onClick={() => onUpdate(index, { ...block, width: w })}
                  className={`px-2 py-0.5 rounded text-xs font-medium ${block.width === w ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {w === 'full' ? '100%' : w === 'medium' ? '70%' : '40%'}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500">Height:</span>
              {(['auto', '150px', '200px', '300px', '400px'] as const).map((h) => (
                <button key={h} type="button" onClick={() => onUpdate(index, { ...block, height: h })}
                  className={`px-2 py-0.5 rounded text-xs font-medium ${block.height === h ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {h === 'auto' ? 'Auto' : h}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500">Corners:</span>
              {(['none', 'rounded', 'circle'] as const).map((b) => (
                <button key={b} type="button" onClick={() => onUpdate(index, { ...block, border: b })}
                  className={`px-2 py-0.5 rounded text-xs font-medium ${block.border === b ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {b === 'none' ? 'Sharp' : b === 'rounded' ? 'Rounded' : 'Circle'}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500">Align:</span>
              {(['left', 'center', 'right'] as const).map((a) => (
                <button key={a} type="button" onClick={() => onUpdate(index, { ...block, align: a })}
                  className={`px-2 py-0.5 rounded text-xs font-medium ${block.align === a ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {a[0].toUpperCase() + a.slice(1)}
                </button>
              ))}
            </div>
          </div>
          {block.url && (
            <img src={block.url} alt="Preview" className="max-h-36 rounded border border-gray-200 object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Section component ───────────────────────────────────────────────────────

const TITLE_SIZES: { value: TitleSize; label: string }[] = [
  { value: 'h1', label: 'Large' },
  { value: 'h2', label: 'Medium' },
  { value: 'h3', label: 'Small' },
];

function SectionCard({ section, index, total, onUpdate, onRemove, onMove }: {
  section: Section; index: number; total: number;
  onUpdate: (idx: number, section: Section) => void;
  onRemove: (idx: number) => void;
  onMove: (idx: number, dir: -1 | 1) => void;
}) {
  const updateBlock = (bIdx: number, block: Block) => {
    onUpdate(index, { ...section, blocks: section.blocks.map((b, i) => (i === bIdx ? block : b)) });
  };
  const removeBlock = (bIdx: number) => {
    onUpdate(index, { ...section, blocks: section.blocks.filter((_, i) => i !== bIdx) });
  };
  const moveBlock = (bIdx: number, dir: -1 | 1) => {
    const blocks = [...section.blocks];
    const target = bIdx + dir;
    if (target < 0 || target >= blocks.length) return;
    [blocks[bIdx], blocks[target]] = [blocks[target], blocks[bIdx]];
    onUpdate(index, { ...section, blocks });
  };
  const addBlock = (type: 'text' | 'image') => {
    const newBlock: Block = type === 'text'
      ? { type: 'text', content: '' }
      : { type: 'image', url: '', width: 'full', height: 'auto', border: 'rounded', align: 'center' };
    onUpdate(index, { ...section, blocks: [...section.blocks, newBlock] });
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-600">Section {index + 1}</span>
        <div className="flex items-center gap-1">
          <button type="button" disabled={index === 0} onClick={() => onMove(index, -1)}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-30" title="Move section up"><ArrowUp2 size={16} /></button>
          <button type="button" disabled={index === total - 1} onClick={() => onMove(index, 1)}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-30" title="Move section down"><ArrowDown2 size={16} /></button>
          <button type="button" onClick={() => onRemove(index)}
            className="p-1 rounded hover:bg-red-50 text-red-500" title="Remove section"><Trash size={16} /></button>
        </div>
      </div>

      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input type="text" value={section.title}
            onChange={(e) => onUpdate(index, { ...section, title: e.target.value })}
            placeholder="e.g. New Payment Corridors"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" maxLength={200} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
          <div className="flex items-center gap-0.5">
            {TITLE_SIZES.map((s) => (
              <button key={s.value} type="button"
                onClick={() => onUpdate(index, { ...section, titleSize: s.value })}
                className={`px-2.5 py-2 rounded text-xs font-medium transition-colors ${
                  section.titleSize === s.value ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>{s.label}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {section.blocks.map((block, bIdx) => (
          <BlockItem key={bIdx} block={block} index={bIdx} total={section.blocks.length}
            onUpdate={updateBlock} onRemove={removeBlock} onMove={moveBlock} />
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button type="button" onClick={() => addBlock('text')}
          className="flex items-center gap-1.5 rounded-md border border-dashed border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors">
          <TextBlock size={13} /> Add Text
        </button>
        <button type="button" onClick={() => addBlock('image')}
          className="flex items-center gap-1.5 rounded-md border border-dashed border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors">
          <GalleryAdd size={13} /> Add Image
        </button>
      </div>
    </div>
  );
}

// ─── Assemble to HTML ────────────────────────────────────────────────────────

function sectionsToHtml(sections: Section[]): string {
  const sizeMap: Record<TitleSize, { tag: string; fontSize: string }> = {
    h1: { tag: 'h1', fontSize: '28px' },
    h2: { tag: 'h2', fontSize: '22px' },
    h3: { tag: 'h3', fontSize: '18px' },
  };

  return sections
    .map((section, idx) => {
      const { tag, fontSize } = sizeMap[section.titleSize];
      const titleHtml = section.title.trim()
        ? `<${tag} style="margin:0 0 16px 0;font-size:${fontSize};font-weight:600;color:#1a1a2e;">${section.title}</${tag}>`
        : '';

      const blocksHtml = section.blocks
        .map((block) => {
          if (block.type === 'text') return block.content;
          if (block.type === 'image' && block.url) {
            const widthMap = { full: '100%', medium: '70%', small: '40%' };
            const borderMap = { none: '0', rounded: '8px', circle: '50%' };
            const heightStyle = block.height === 'auto' ? 'height:auto;' : `height:${block.height};object-fit:cover;`;
            return `<div style="text-align:${block.align};padding:12px 0;"><img src="${block.url}" alt="" style="width:${widthMap[block.width]};max-width:100%;${heightStyle}border-radius:${borderMap[block.border]};display:inline-block;" /></div>`;
          }
          return '';
        })
        .join('');

      const divider = idx < sections.length - 1
        ? '<hr style="border:none;border-top:1px solid #eeeeee;margin:28px 0;" />'
        : '';

      return titleHtml + blocksHtml + divider;
    })
    .join('');
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SEGMENT_OPTIONS = [
  { value: 'all', label: 'All Users' },
  { value: 'verified', label: 'Verified Users' },
  { value: 'unverified', label: 'Unverified Users' },
  { value: 'inactive', label: 'Inactive Users' },
  { value: 'custom', label: 'Custom Emails' },
] as const;

const FONT_OPTIONS = [
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Helvetica', value: 'Helvetica, Arial, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times New Roman', value: 'Times New Roman, serif' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
  { label: 'Trebuchet MS', value: 'Trebuchet MS, sans-serif' },
];

function newSection(): Section {
  return { title: '', titleSize: 'h2', blocks: [] };
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function Newsletter() {
  const [, navigate] = useLocation();
  const { hasAnyPermission } = usePermissions();
  const canSend = hasAnyPermission(['MANAGE_ADMINS', 'SEND_EMAILS']);

  const [subject, setSubject] = useState('');
  const [logoSize, setLogoSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [logoVariant, setLogoVariant] = useState<'dark' | 'light'>('dark');
  const [heroImageUrl, setHeroImageUrl] = useState('');
  const [heroImageHeight, setHeroImageHeight] = useState('auto');
  const [heroImageBorder, setHeroImageBorder] = useState<'none' | 'rounded'>('none');
  const [fontFamily, setFontFamily] = useState('Arial, sans-serif');
  const [sections, setSections] = useState<Section[]>([newSection()]);
  const [ctaText, setCtaText] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');
  const [segment, setSegment] = useState<SendNewsletterPayload['segment']>('custom');
  const [customEmails, setCustomEmails] = useState('');

  const [previewHtml, setPreviewHtml] = useState('');
  const [previewWidth, setPreviewWidth] = useState<'desktop' | 'mobile'>('desktop');
  const [showConfirm, setShowConfirm] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ['emails', 'campaigns', 'stats'],
    queryFn: () => emailService.getCampaignStats(),
    enabled: canSend,
  });

  const previewMutation = useMutation({
    mutationFn: (payload: SendNewsletterPayload) => emailService.newsletterPreview(payload),
    onSuccess: (data) => { setPreviewHtml(data.html); },
    onError: () => toast.error('Failed to generate preview'),
  });

  const sendMutation = useMutation({
    mutationFn: (payload: SendNewsletterPayload) => emailService.newsletterSend(payload),
    onSuccess: (data) => {
      toast.success(`Newsletter sent to ${data.count} of ${data.total} users`);
      setShowConfirm(false);
      // Clear all fields
      setSubject('');
      setLogoSize('medium');
      setLogoVariant('dark');
      setHeroImageUrl('');
      setHeroImageHeight('auto');
      setHeroImageBorder('none');
      setFontFamily('Arial, sans-serif');
      setSections([newSection()]);
      setCtaText('');
      setCtaUrl('');
      setCustomEmails('');
      setPreviewHtml('');
      // Navigate back to mail
      navigate('/mail');
    },
    onError: () => { toast.error('Failed to send newsletter'); setShowConfirm(false); },
  });

  // Live preview — auto-refresh with debounce
  const previewTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const triggerPreview = useCallback(() => {
    clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(() => {
      const body = sectionsToHtml(sections);
      if (!body.trim() && !heroImageUrl.trim()) return;
      previewMutation.mutate({
        subject: subject.trim() || 'Preview',
        logoSize,
        logoVariant,
        heroImageUrl: heroImageUrl.trim() || undefined,
        heroImageHeight: heroImageHeight !== 'auto' ? heroImageHeight : undefined,
        heroImageBorder: heroImageBorder !== 'none' ? heroImageBorder : undefined,
        body: body || '<p></p>',
        fontFamily,
        ctaText: ctaText.trim() || 'Get started',
        ctaUrl: ctaUrl.trim() || '#',
        segment: 'custom',
        customEmails: ['preview@example.com'],
      });
    }, 800);
  }, [sections, heroImageUrl, heroImageHeight, heroImageBorder, logoSize, logoVariant, fontFamily, ctaText, ctaUrl, subject]);

  useEffect(() => {
    triggerPreview();
    return () => clearTimeout(previewTimer.current);
  }, [triggerPreview]);

  const buildPayload = useCallback((): SendNewsletterPayload | null => {
    if (!subject.trim()) { toast.error('Subject is required'); return null; }
    const body = sectionsToHtml(sections);
    if (!body.trim()) { toast.error('Add some content'); return null; }
    if (!ctaText.trim() || !ctaUrl.trim()) { toast.error('CTA button text and URL are required'); return null; }

    const base: SendNewsletterPayload = {
      subject: subject.trim(),
      logoSize,
      logoVariant,
      heroImageUrl: heroImageUrl.trim() || undefined,
      heroImageHeight: heroImageHeight !== 'auto' ? heroImageHeight : undefined,
      heroImageBorder: heroImageBorder !== 'none' ? heroImageBorder : undefined,
      body,
      fontFamily,
      ctaText: ctaText.trim(),
      ctaUrl: ctaUrl.trim(),
      segment,
    };

    if (segment === 'custom') {
      const emails = customEmails.split(/[\n,;\s]+/).map((e) => e.trim().toLowerCase()).filter((e) => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
      if (!emails.length) { toast.error('Enter at least one valid email'); return null; }
      return { ...base, customEmails: emails };
    }
    return base;
  }, [subject, heroImageUrl, fontFamily, sections, ctaText, ctaUrl, segment, customEmails]);

  const handleSend = () => { const p = buildPayload(); if (p) sendMutation.mutate(p); };

  // Section CRUD
  const updateSection = (idx: number, section: Section) => setSections((prev) => prev.map((s, i) => (i === idx ? section : s)));
  const removeSection = (idx: number) => setSections((prev) => prev.filter((_, i) => i !== idx));
  const moveSection = (idx: number, dir: -1 | 1) => {
    setSections((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const segmentCount = (() => {
    if (!stats || segment === 'custom') return null;
    const map: Record<string, number> = { all: stats.all, verified: stats.verified, unverified: stats.unverified, inactive: stats.inactive };
    return map[segment] ?? null;
  })();

  return (
    <DashboardLayout title="Newsletter">
      <div className="flex flex-col xl:flex-row gap-6">
        {/* ── Left: Compose ── */}
        <div className="flex-1 min-w-0 space-y-4">

          <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Compose Newsletter</h2>
              {/* Global controls */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-500">Logo:</span>
                  {(['small', 'medium', 'large'] as const).map((s) => (
                    <button key={s} type="button" onClick={() => setLogoSize(s)}
                      className={`px-2 py-0.5 rounded text-xs font-medium ${logoSize === s ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      {s[0].toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                  <span className="mx-1 w-px h-4 bg-gray-200" />
                  {(['dark', 'light'] as const).map((v) => (
                    <button key={v} type="button" onClick={() => setLogoVariant(v)}
                      className={`px-2 py-0.5 rounded text-xs font-medium ${logoVariant === v ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      {v[0].toUpperCase() + v.slice(1)}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-500">Font:</span>
                  <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)}
                    className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white"
                    style={{ fontFamily }}>
                    {FONT_OPTIONS.map((f) => <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Welcome to June! Here's what's new"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" maxLength={500} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recipients *</label>
                <select value={segment} onChange={(e) => setSegment(e.target.value as SendNewsletterPayload['segment'])}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white">
                  {SEGMENT_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
                {segmentCount !== null && <p className="mt-1 text-xs text-gray-500">{segmentCount.toLocaleString()} users</p>}
              </div>
            </div>
            {segment === 'custom' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Addresses</label>
                <textarea value={customEmails} onChange={(e) => setCustomEmails(e.target.value)}
                  placeholder="Enter emails separated by commas or new lines" rows={2}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-y" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hero Image</label>
              <div className="flex gap-2">
                <input type="text" value={heroImageUrl} onChange={(e) => setHeroImageUrl(e.target.value)}
                  placeholder="Paste image URL or upload"
                  className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
                <label className="flex items-center gap-1.5 rounded-md bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-100 cursor-pointer transition-colors shrink-0">
                  <GalleryAdd size={14} /> Upload
                  <input type="file" accept="image/*" className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const res = await emailService.uploadImage(file);
                        setHeroImageUrl(res.url);
                        toast.success('Hero image uploaded');
                      } catch { toast.error('Upload failed'); }
                      e.target.value = '';
                    }} />
                </label>
              </div>
            </div>

            {/* Hero image style controls */}
            {heroImageUrl && (
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-500">Height:</span>
                  {(['auto', '150px', '200px', '300px', '400px'] as const).map((h) => (
                    <button key={h} type="button" onClick={() => setHeroImageHeight(h)}
                      className={`px-2 py-0.5 rounded text-xs font-medium ${heroImageHeight === h ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      {h === 'auto' ? 'Auto' : h}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-500">Corners:</span>
                  {(['none', 'rounded'] as const).map((b) => (
                    <button key={b} type="button" onClick={() => setHeroImageBorder(b)}
                      className={`px-2 py-0.5 rounded text-xs font-medium ${heroImageBorder === b ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      {b === 'none' ? 'Sharp' : 'Rounded'}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sections */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Sections *</h3>
              <button type="button" onClick={() => setSections((prev) => [...prev, newSection()])}
                className="flex items-center gap-1 rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 transition-colors">
                <Add size={14} /> Add Section
              </button>
            </div>
            {sections.length === 0 && (
              <div className="rounded-lg border-2 border-dashed border-gray-200 p-8 text-center">
                <p className="text-sm text-gray-400 mb-3">No sections yet.</p>
                <button type="button" onClick={() => setSections([newSection()])}
                  className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  <Add size={16} /> Add Section
                </button>
              </div>
            )}
            {sections.map((section, idx) => (
              <SectionCard key={idx} section={section} index={idx} total={sections.length}
                onUpdate={updateSection} onRemove={removeSection} onMove={moveSection} />
            ))}
          </div>

          {/* CTA + Send */}
          <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">Call to Action *</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Button Text</label>
                <input type="text" value={ctaText} onChange={(e) => setCtaText(e.target.value)}
                  placeholder="e.g. Get started"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Button URL</label>
                <input type="text" value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)}
                  placeholder="https://app.sendcoins.ca/login"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
              {canSend && (
                <button type="button" onClick={() => { if (buildPayload()) setShowConfirm(true); }}
                  disabled={sendMutation.isPending}
                  className="flex items-center gap-2 rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  <Send2 size={18} color="#fff" /> {sendMutation.isPending ? 'Sending...' : 'Send Newsletter'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Right: Live Preview ── */}
        <div className="w-full xl:w-[540px] 2xl:w-[640px] flex-shrink-0">
          <div className="xl:sticky xl:top-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">
                Live Preview
                {previewMutation.isPending && <span className="ml-2 text-xs text-gray-400 font-normal">updating...</span>}
              </h3>
              <div className="flex items-center gap-1 rounded-md border border-gray-200 p-0.5">
                <button type="button" onClick={() => setPreviewWidth('desktop')}
                  className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors ${previewWidth === 'desktop' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700'}`}>
                  <Monitor size={14} /> Desktop
                </button>
                <button type="button" onClick={() => setPreviewWidth('mobile')}
                  className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors ${previewWidth === 'mobile' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700'}`}>
                  <Mobile size={14} /> Mobile
                </button>
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 overflow-hidden transition-all duration-300 mx-auto"
              style={{ width: previewWidth === 'desktop' ? '100%' : '375px' }}>
              {previewHtml ? (
                <iframe srcDoc={previewHtml} title="Newsletter preview" className="w-full border-0"
                  style={{ minHeight: '600px', height: '80vh' }} sandbox="allow-same-origin" />
              ) : (
                <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                  <Eye size={40} variant="Bulk" />
                  <p className="mt-3 text-sm">Start adding content to see a live preview</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Confirm dialog ── */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Send Newsletter?</h3>
            <p className="mt-2 text-sm text-gray-600">
              This will send to{' '}
              <strong>
                {segment === 'custom'
                  ? `${customEmails.split(/[\n,;\s]+/).filter(Boolean).length} email(s)`
                  : `${segmentCount?.toLocaleString() ?? '...'} ${SEGMENT_OPTIONS.find((o) => o.value === segment)?.label.toLowerCase()}`}
              </strong>. This cannot be undone.
            </p>
            <div className="mt-5 flex items-center justify-end gap-3">
              <button type="button" onClick={() => setShowConfirm(false)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button type="button" onClick={handleSend} disabled={sendMutation.isPending}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {sendMutation.isPending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
