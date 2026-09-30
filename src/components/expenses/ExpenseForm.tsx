import { FormEvent, useState } from 'react';
import type { Expense, ExpenseCategory } from '../../types/db';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { FileUpload } from '../ui/FileUpload';
import { useUpload, getSignedUrl } from '../../hooks/useUpload';
import type { UploadedFile } from '../../hooks/useUpload';

interface Props {
  initial?: Partial<Expense>;
  categories: ExpenseCategory[];
  onSubmit: (payload: Partial<Expense>) => Promise<void>;
  onCancel: () => void;
}

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
    {children}
  </label>
);

// Build UploadedFile stubs from existing paths stored in DB
const buildExistingFiles = async (paths: string[]): Promise<UploadedFile[]> => {
  const results: UploadedFile[] = [];
  for (const path of paths) {
    const signedUrl = await getSignedUrl(path);
    if (signedUrl) {
      const name = path.split('/').pop() ?? path;
      const ext = name.split('.').pop()?.toLowerCase() ?? '';
      const type = ext === 'pdf' ? 'application/pdf' : `image/${ext}`;
      results.push({ path, name, size: 0, type, signedUrl });
    }
  }
  return results;
};

export const ExpenseForm = ({ initial = {}, categories, onSubmit, onCancel }: Props) => {
  const [title,         setTitle]         = useState(initial.title ?? '');
  const [description,   setDescription]   = useState(initial.description ?? '');
  const [amount,        setAmount]        = useState(initial.amount?.toString() ?? '');
  const [currency,      setCurrency]      = useState(initial.currency ?? 'INR');
  const [categoryId,    setCategoryId]    = useState<number | 'none'>(initial.category_id ?? 'none');
  const [paymentMethod, setPaymentMethod] = useState(initial.payment_method ?? 'Cash');
  const [date,          setDate]          = useState(initial.date ?? new Date().toISOString().slice(0, 10));
  const [saving,        setSaving]        = useState(false);
  const [formError,     setFormError]     = useState<string | null>(null);
  const [uploadError,   setUploadError]   = useState<string | null>(null);

  // All uploaded files (new + existing)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [existingLoaded, setExistingLoaded] = useState(false);

  const { uploading, progress, uploadFiles, deleteFile, reset } = useUpload();

  // Load existing files from DB on first render
  useState(() => {
    if (existingLoaded) return;
    setExistingLoaded(true);
    const paths: string[] = [];
    if (initial.receipt_url) paths.push(initial.receipt_url);
    if (initial.bill_urls?.length) paths.push(...initial.bill_urls);
    if (paths.length) {
      buildExistingFiles(paths).then(files => setUploadedFiles(files));
    }
  });

  const handleFiles = async (files: File[]) => {
    setUploadError(null);
    try {
      const result = await uploadFiles(files);
      setUploadedFiles(prev => [...prev, ...result]);
      reset();
    } catch (err: any) {
      setUploadError(err.message);
      reset();
    }
  };

  const handleRemove = async (path: string) => {
    try {
      await deleteFile(path);
      setUploadedFiles(prev => prev.filter(f => f.path !== path));
    } catch (err: any) {
      setUploadError(`Failed to remove file: ${err.message}`);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (uploading) return;
    setSaving(true);
    setFormError(null);

    try {
      // First file → receipt_url (backwards compat), rest → bill_urls
      const paths = uploadedFiles.map(f => f.path);
      const receipt_url = paths[0] ?? null;
      const bill_urls   = paths.length > 1 ? paths.slice(1).join(',') : null;

      await onSubmit({
        title,
        description,
        amount:       Number(amount),
        currency,
        category_id:  categoryId === 'none' ? null : categoryId,
        payment_method: paymentMethod,
        date,
        receipt_url,
        bill_urls,
      });
    } catch (err: any) {
      setFormError(err.message ?? 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  const totalFiles = uploadedFiles.length + (uploading ? progress.length : 0);

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {formError && (
        <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{formError}</div>
      )}

      {/* Title */}
      <div>
        <FieldLabel>Title *</FieldLabel>
        <Input value={title} onChange={e => setTitle(e.target.value)}
          placeholder="What was this expense for?" required />
      </div>

      {/* Description */}
      <div>
        <FieldLabel>Description</FieldLabel>
        <textarea
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
          rows={2} value={description ?? ''}
          onChange={e => setDescription(e.target.value)}
          placeholder="Additional context, vendor name, purpose..." />
      </div>

      {/* Amount + currency */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <FieldLabel>Amount *</FieldLabel>
          <Input type="number" step="0.01" min="0" value={amount}
            onChange={e => setAmount(e.target.value)} placeholder="0.00" required />
        </div>
        <div>
          <FieldLabel>Currency</FieldLabel>
          <Select value={currency} onChange={e => setCurrency(e.target.value)}>
            <option>INR</option><option>USD</option><option>EUR</option><option>GBP</option>
          </Select>
        </div>
      </div>

      {/* Category + date */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Category</FieldLabel>
          <Select value={categoryId}
            onChange={e => setCategoryId(e.target.value === 'none' ? 'none' : Number(e.target.value))}>
            <option value="none">Uncategorized</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
        <div>
          <FieldLabel>Date *</FieldLabel>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} required />
        </div>
      </div>

      {/* Payment method */}
      <div>
        <FieldLabel>Payment method</FieldLabel>
        <Select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
          <option>Cash</option>
          <option>Corporate Card</option>
          <option>Personal Card</option>
          <option>UPI</option>
          <option>Bank Transfer</option>
          <option>Cheque</option>
        </Select>
      </div>

      {/* File upload */}
      <div>
        <FieldLabel>
          Bills & receipts
          {totalFiles > 0 && (
            <span className="ml-2 normal-case text-indigo-600 font-normal">
              ({totalFiles} file{totalFiles > 1 ? 's' : ''})
            </span>
          )}
        </FieldLabel>
        <FileUpload
          onFiles={handleFiles}
          uploaded={uploadedFiles}
          progress={progress}
          onRemove={handleRemove}
          uploading={uploading}
          multiple={true}
          error={uploadError}
        />
        <p className="mt-1.5 text-xs text-gray-400">
          Upload bills, invoices, or receipts. Images and PDFs accepted, max 10 MB each.
        </p>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={saving || uploading}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving || uploading}>
          {uploading ? 'Uploading files…' : saving ? 'Saving…' : initial.id ? 'Save changes' : 'Submit expense'}
        </Button>
      </div>
    </form>
  );
};