import { useEffect, useRef, useState, KeyboardEvent } from 'react';
import { Pencil, Loader2, Check, X } from 'lucide-react';

export type InlineFieldType = 'text' | 'number' | 'date' | 'select' | 'phone' | 'long-text';

export interface InlineEditableFieldProps {
  label?: string;
  value: any;
  type?: InlineFieldType;
  options?: Array<{ label: string; value: string } | string>;
  validate?: (v: any) => string | null;
  canEdit?: boolean;
  onSave: (value: any) => Promise<any>;
  onCancel?: () => void;
  placeholder?: string;
  display?: (v: any) => React.ReactNode;
  mono?: boolean;
  /** When true, renders just the value (no row layout) — used for hero name. */
  bare?: boolean;
  valueClassName?: string;
}

function normalizeOptions(opts: InlineEditableFieldProps['options']) {
  return (opts || []).map(o => typeof o === 'string' ? { label: o, value: o } : o);
}

export function InlineEditableField({
  label, value, type = 'text', options, validate, canEdit = true,
  onSave, onCancel, placeholder = '—', display, mono, bare, valueClassName,
}: InlineEditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<any>(value ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null>(null);

  useEffect(() => { if (!editing) setDraft(value ?? ''); }, [value, editing]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      if ('select' in inputRef.current && typeof (inputRef.current as any).select === 'function') {
        try { (inputRef.current as HTMLInputElement).select(); } catch {}
      }
    }
  }, [editing]);

  const empty = value === null || value === undefined || value === '';
  const startEdit = () => {
    if (!canEdit || saving) return;
    setDraft(value ?? '');
    setError(null);
    setEditing(true);
  };
  const cancel = () => {
    setEditing(false);
    setError(null);
    setDraft(value ?? '');
    onCancel?.();
  };

  const runValidation = (v: any): boolean => {
    if (validate) {
      const e = validate(v);
      setError(e);
      return !e;
    }
    setError(null);
    return true;
  };

  const commit = async () => {
    const normalized = draft === '' ? null : draft;
    if (!runValidation(normalized)) return;
    if ((normalized ?? null) === (value ?? null)) { setEditing(false); return; }
    setSaving(true);
    try {
      await onSave(normalized);
      setEditing(false);
    } catch (e: any) {
      setError(e?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); cancel(); }
    else if (e.key === 'Enter') {
      if (type === 'long-text') {
        if (e.metaKey || e.ctrlKey) { e.preventDefault(); commit(); }
      } else { e.preventDefault(); commit(); }
    }
  };

  // ─── EDIT MODE ───
  if (editing) {
    const inputClass = 'w-full rounded-[6px] px-2 py-1 text-[13px] outline-none focus:ring-2';
    const inputStyle: React.CSSProperties = {
      border: `1px solid ${error ? '#BE185D' : '#D6CFC2'}`,
      background: '#FFFFFF',
      color: '#1C1917',
      fontFamily: mono ? "'DM Mono', monospace" : "'DM Sans', sans-serif",
    };
    const normalizedOptions = normalizeOptions(options);
    let input: React.ReactNode;
    if (type === 'select') {
      input = (
        <select
          ref={el => (inputRef.current = el)}
          className={inputClass}
          style={inputStyle}
          value={draft ?? ''}
          onChange={e => setDraft(e.target.value)}
          onBlur={() => runValidation(draft === '' ? null : draft)}
        >
          <option value="">— Select —</option>
          {normalizedOptions.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      );
    } else if (type === 'long-text') {
      input = (
        <textarea
          ref={el => (inputRef.current = el)}
          className={inputClass + ' min-h-[72px] leading-snug'}
          style={inputStyle}
          value={draft ?? ''}
          onChange={e => setDraft(e.target.value)}
          onBlur={() => runValidation(draft === '' ? null : draft)}
          onKeyDown={onKeyDown}
        />
      );
    } else {
      const htmlType = type === 'phone' ? 'tel' : type === 'number' ? 'number' : type === 'date' ? 'date' : 'text';
      input = (
        <input
          ref={el => (inputRef.current = el)}
          type={htmlType}
          className={inputClass}
          style={inputStyle}
          value={draft ?? ''}
          onChange={e => setDraft(type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)}
          onBlur={() => runValidation(draft === '' ? null : draft)}
          onKeyDown={onKeyDown}
        />
      );
    }

    const editBody = (
      <div className="flex flex-col gap-1.5 w-full">
        {input}
        {error && <span className="text-[11px]" style={{ color: '#BE185D' }}>{error}</span>}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={commit}
            disabled={saving}
            className="inline-flex items-center gap-1 px-2 h-[26px] rounded-[6px] text-[11px] disabled:opacity-60"
            style={{ background: '#0F7B6C', color: '#FFFFFF', fontWeight: 500 }}
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            Save
          </button>
          <button
            type="button"
            onClick={cancel}
            disabled={saving}
            className="inline-flex items-center gap-1 px-2 h-[26px] rounded-[6px] text-[11px]"
            style={{ background: '#FFFFFF', border: '1px solid #D6CFC2', color: '#44403C' }}
          >
            <X className="h-3 w-3" />
            Cancel
          </button>
          <span className="text-[10px] ml-1" style={{ color: '#A8A29E' }}>
            {type === 'long-text' ? 'Ctrl/⌘+Enter to save' : 'Enter to save'} · Esc to cancel
          </span>
        </div>
      </div>
    );

    if (bare) return editBody;
    return (
      <div className="flex flex-col gap-1 py-[7px]">
        {label && <span className="text-[11px]" style={{ color: '#78716C', fontWeight: 500 }}>{label}</span>}
        {editBody}
      </div>
    );
  }

  // ─── VIEW MODE ───
  const rendered = display ? display(value) : (empty ? placeholder : String(value));
  const valueEl = (
    <span
      className={`${empty ? 'italic' : ''} ${valueClassName ?? ''}`}
      style={{
        color: empty ? '#A8A29E' : '#1C1917',
        fontWeight: empty ? 400 : 500,
        fontFamily: mono ? "'DM Mono', monospace" : undefined,
        wordBreak: 'break-word',
      }}
    >
      {rendered}
    </span>
  );

  const pencil = canEdit ? (
    <button
      type="button"
      onClick={startEdit}
      aria-label={`Edit ${label || 'field'}`}
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); startEdit(); } }}
      className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity ml-1 inline-flex items-center justify-center h-[18px] w-[18px] rounded-[5px] hover:bg-[#F5F0E8]"
      style={{ color: '#78716C' }}
    >
      <Pencil className="h-3 w-3" />
    </button>
  ) : null;

  if (bare) {
    return (
      <span className="group inline-flex items-baseline gap-1">
        {valueEl}
        {pencil}
      </span>
    );
  }

  return (
    <div className="group flex justify-between items-baseline gap-3 py-[7px]" onDoubleClick={startEdit}>
      {label && <span className="text-[11px] flex-shrink-0" style={{ color: '#78716C', fontWeight: 500 }}>{label}</span>}
      <span className="flex items-baseline justify-end text-right" style={{ maxWidth: '60%' }}>
        {valueEl}
        {pencil}
      </span>
    </div>
  );
}