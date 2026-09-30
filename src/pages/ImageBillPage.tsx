import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useCategories } from '../hooks/useCategories';
import { useExpenses } from '../hooks/useExpenses';
import { useUpload } from '../hooks/useUpload';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';

interface OCRFields {
  title: string; description: string; vendor: string; date: string;
  amount: string; currency: string; tax: string; payment_method: string;
  category_id: number | 'none';
  items: { description: string; qty: string; rate: string; amount: string }[];
  raw: string;
}

const PAYMENT_METHODS = ['Cash','Corporate Card','Personal Card','UPI','Bank Transfer','Cheque'];
const CURRENCIES      = ['INR','USD','EUR','GBP','AED','SGD'];
const emptyFields = (): OCRFields => ({
  title:'', description:'', vendor:'',
  date: new Date().toISOString().slice(0,10),
  amount:'', currency:'INR', tax:'', payment_method:'Cash', category_id:'none', items:[], raw:'',
});

const Label = ({ children }: { children: React.ReactNode }) => (
  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">{children}</label>
);

const Steps = ({ current }: { current: 1|2|3 }) => (
  <div className="flex items-center gap-0 mb-8">
    {(['Upload','Review & Edit','Done'] as const).map((label, i) => {
      const step = (i+1) as 1|2|3;
      const active = current === step, done = current > step;
      return (
        <div key={label} className="flex items-center">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${active?'bg-gray-900 text-white':done?'bg-green-100 text-green-700':'bg-gray-100 text-gray-400'}`}>
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${active?'bg-white text-gray-900':done?'bg-green-500 text-white':'bg-gray-300 text-gray-500'}`}>{done?'✓':step}</span>
            {label}
          </div>
          {i < 2 && <div className={`w-8 h-px ${current>step?'bg-green-300':'bg-gray-200'}`} />}
        </div>
      );
    })}
  </div>
);

export default function ImageBillPage() {
  const navigate = useNavigate();
  const { categories } = useCategories();
  const { createExpense } = useExpenses({}, 0);
  const { uploadFiles }   = useUpload();
  const inputRef = useRef<HTMLInputElement>(null);

  const [step, setStep]           = useState<1|2|3>(1);
  const [file, setFile]           = useState<File|null>(null);
  const [preview, setPreview]     = useState<string|null>(null);
  const [dragging, setDragging]   = useState(false);
  const [ocring, setOcring]       = useState(false);
  const [ocrProgress, setOcrProgress] = useState('');
  const [ocrError, setOcrError]   = useState<string|null>(null);
  const [fields, setFields]       = useState<OCRFields>(emptyFields());
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState<string|null>(null);

  const pickFile = (f: File) => {
    if (!f.type.startsWith('image/')) { setOcrError('Please upload an image file.'); return; }
    if (f.size > 10*1024*1024) { setOcrError('Max file size is 10 MB.'); return; }
    setFile(f); setOcrError(null);
    const reader = new FileReader();
    reader.onload = e => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    if (e.dataTransfer.files[0]) pickFile(e.dataTransfer.files[0]);
  };

  const runOCR = async () => {
    if (!file) return;
    setOcring(true); setOcrError(null); setOcrProgress('Reading image…');
    try {
      const dataUrl = await new Promise<string>((res,rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.onerror = () => rej(new Error('Failed to read file'));
        r.readAsDataURL(file);
      });
      setOcrProgress('Extracting bill details with AI…');
      const osmKey     = import.meta.env.VITE_OSM_API_KEY as string;
      const osmBaseUrl = (import.meta.env.VITE_OSM_BASE_URL as string) || 'https://api.osmapi.com/v1';
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;

      let parsed: Partial<OCRFields>;
      const prompt = `Extract all bill/receipt/invoice information from this image and return ONLY a valid JSON object. No preamble, no markdown fences. Structure:
{"title":"short expense title","vendor":"vendor name","description":"brief description","date":"YYYY-MM-DD or empty","amount":"total as number string","currency":"INR/USD/EUR default INR","tax":"tax amount or empty","payment_method":"Cash|Corporate Card|Personal Card|UPI|Bank Transfer|Cheque","items":[{"description":"","qty":"","rate":"","amount":""}],"raw":"all text verbatim"}`;

      if (osmKey) {
        const res = await fetch(`${osmBaseUrl}/chat/completions`, {
          method:'POST',
          headers:{'Content-Type':'application/json','Authorization':`Bearer ${osmKey}`},
          body: JSON.stringify({
            model:'gemma-4-26b-a4b-it',
            messages:[{role:'user',content:[{type:'image_url',image_url:{url:dataUrl}},{type:'text',text:prompt}]}]
          }),
        });
        if (!res.ok) { const e=await res.json().catch(()=>({})); throw new Error(e.error?.message??`OSM error ${res.status}`); }
        const data = await res.json();
        parsed = JSON.parse(data.choices?.[0]?.message?.content?.replace(/```json|```/g,'').trim() ?? '{}');
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        const base64 = dataUrl.split(',')[1];
        const res = await fetch(`${supabaseUrl}/functions/v1/ocr-bill`, {
          method:'POST',
          headers:{'Content-Type':'application/json','Authorization':`Bearer ${session?.access_token}`},
          body: JSON.stringify({ base64, mediaType: file.type }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error ?? 'OCR failed');
        parsed = result;
      }

      setFields(prev => ({
        ...prev,
        title: parsed.title??'', vendor: parsed.vendor??'', description: parsed.description??'',
        date: parsed.date||prev.date, amount: parsed.amount??'', currency: parsed.currency??'INR',
        tax: parsed.tax??'', payment_method: parsed.payment_method??'Cash',
        items: parsed.items??[], raw: parsed.raw??'',
      }));
      setStep(2);
    } catch (err: any) {
      setOcrError(err.message ?? 'OCR failed. Please try again.');
    } finally { setOcring(false); setOcrProgress(''); }
  };

  const updateItem = (i:number, key:keyof OCRFields['items'][0], val:string) =>
    setFields(prev => { const items=[...prev.items]; items[i]={...items[i],[key]:val}; return {...prev,items}; });
  const addItem    = () => setFields(prev=>({...prev,items:[...prev.items,{description:'',qty:'1',rate:'',amount:''}]}));
  const removeItem = (i:number) => setFields(prev=>({...prev,items:prev.items.filter((_,idx)=>idx!==i)}));

  const handleSave = async () => {
    if (!fields.title||!fields.amount) { setSaveError('Title and amount are required.'); return; }
    setSaving(true); setSaveError(null);
    try {
      let receipt_url: string|null = null;
      if (file) { const up = await uploadFiles([file]); receipt_url = up[0]?.path??null; }
      let desc = fields.description;
      if (fields.vendor) desc=`Vendor: ${fields.vendor}\n${desc}`;
      if (fields.tax) desc+=`\nTax/GST: ${fields.tax}`;
      if (fields.items.length) desc+='\n\nItems:\n'+fields.items.map(it=>`• ${it.description} — Qty: ${it.qty}, Rate: ${it.rate}, Total: ${it.amount}`).join('\n');
      await createExpense({ title:fields.title, description:desc.trim()||null, amount:parseFloat(fields.amount),
        currency:fields.currency, category_id:fields.category_id==='none'?null:fields.category_id,
        payment_method:fields.payment_method, date:fields.date, status:'pending', receipt_url, bill_urls:null } as any);
      setStep(3);
    } catch (err:any) { setSaveError(err.message??'Failed to save.'); }
    finally { setSaving(false); }
  };

  const reset = () => { setStep(1);setFile(null);setPreview(null);setFields(emptyFields());setOcrError(null);setSaveError(null); };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Image Bill</h1>
        <p className="mt-1 text-sm text-gray-500">Upload a receipt or invoice — AI extracts the details automatically.</p>
      </div>
      <Steps current={step} />

      {step===1 && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div onClick={()=>inputRef.current?.click()} onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={onDrop}
            className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed cursor-pointer min-h-64 p-8 text-center transition-all ${dragging?'border-gray-900 bg-gray-50':'border-gray-200 bg-gray-50 hover:border-gray-400 hover:bg-white'}`}>
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e=>{if(e.target.files?.[0])pickFile(e.target.files[0]);}} />
            {preview ? (
              <div className="w-full">
                <img src={preview} alt="Preview" className="max-h-48 mx-auto rounded-xl object-contain shadow-md mb-3" />
                <p className="text-sm font-medium text-gray-700 truncate">{file?.name}</p>
                <p className="text-xs text-gray-400">{file?(file.size/1024).toFixed(0)+' KB':''}</p>
              </div>
            ) : (
              <><div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-200 text-3xl">🧾</div>
              <p className="text-sm font-semibold text-gray-700">Drop your bill image here</p>
              <p className="mt-1 text-xs text-gray-400">or click to browse</p>
              <p className="mt-3 text-[11px] text-gray-300">JPG, PNG, WEBP · max 10 MB</p></>
            )}
          </div>
          <div className="flex flex-col justify-between">
            <div className="space-y-4">
              <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4">
                <p className="text-sm font-semibold text-blue-800 mb-1">How it works</p>
                <ol className="space-y-1.5 text-xs text-blue-700 list-decimal list-inside">
                  <li>Upload a clear photo of your bill</li><li>AI reads vendor, items, amounts and dates</li>
                  <li>Review and edit extracted details</li><li>Save as a standard expense claim</li>
                </ol>
              </div>
              <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4">
                <p className="text-xs font-semibold text-amber-800 mb-1">📷 For best results</p>
                <p className="text-xs text-amber-700">Use a flat, well-lit photo. Avoid shadows or blur.</p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {ocrError && <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-xs text-red-700">{ocrError}</div>}
              <Button onClick={runOCR} disabled={!file||ocring} className="w-full justify-center gap-2 py-3">
                {ocring?<span className="flex items-center gap-2"><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>{ocrProgress||'Processing…'}</span>:<>🔍 Extract bill details</>}
              </Button>
              {ocring&&<p className="text-center text-xs text-gray-400 animate-pulse">{ocrProgress}</p>}
            </div>
          </div>
        </div>
      )}

      {step===2 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <div className="sticky top-4 space-y-3">
              {preview&&<div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm"><img src={preview} alt="Bill" className="w-full object-contain max-h-80"/></div>}
              <button onClick={reset} className="w-full text-xs text-gray-400 hover:text-gray-600 py-2 border border-dashed border-gray-200 rounded-xl">← Upload a different image</button>
              {fields.raw&&<details><summary className="cursor-pointer text-xs font-semibold text-gray-400 hover:text-gray-600 py-1 select-none">Raw OCR text ▾</summary>
                <pre className="mt-2 rounded-xl bg-gray-50 border border-gray-100 p-3 text-[10px] text-gray-500 whitespace-pre-wrap max-h-48 overflow-y-auto">{fields.raw}</pre></details>}
            </div>
          </div>
          <div className="lg:col-span-3 space-y-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">✓ OCR complete — review and edit below</span>
            <div><Label>Expense title *</Label><Input value={fields.title} onChange={e=>setFields(p=>({...p,title:e.target.value}))} placeholder="e.g. Client lunch at Taj Hotel"/></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Vendor / Merchant</Label><Input value={fields.vendor} onChange={e=>setFields(p=>({...p,vendor:e.target.value}))} placeholder="Vendor name"/></div>
              <div><Label>Date *</Label><Input type="date" value={fields.date} onChange={e=>setFields(p=>({...p,date:e.target.value}))}/></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2"><Label>Total amount *</Label><Input type="number" step="0.01" min="0" value={fields.amount} onChange={e=>setFields(p=>({...p,amount:e.target.value}))} placeholder="0.00"/></div>
              <div><Label>Currency</Label><Select value={fields.currency} onChange={e=>setFields(p=>({...p,currency:e.target.value}))}>{CURRENCIES.map(c=><option key={c}>{c}</option>)}</Select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Tax / GST</Label><Input type="number" step="0.01" min="0" value={fields.tax} onChange={e=>setFields(p=>({...p,tax:e.target.value}))} placeholder="0.00"/></div>
              <div><Label>Payment method</Label><Select value={fields.payment_method} onChange={e=>setFields(p=>({...p,payment_method:e.target.value}))}>{PAYMENT_METHODS.map(m=><option key={m}>{m}</option>)}</Select></div>
            </div>
            <div><Label>Category</Label>
              <Select value={fields.category_id} onChange={e=>setFields(p=>({...p,category_id:e.target.value==='none'?'none':Number(e.target.value)}))}>
                <option value="none">Uncategorized</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>
            <div><Label>Description</Label>
              <textarea className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
                rows={2} value={fields.description} onChange={e=>setFields(p=>({...p,description:e.target.value}))} placeholder="Additional context…"/>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2"><Label>Line items</Label><button onClick={addItem} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">+ Add item</button></div>
              {fields.items.length===0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 p-4 text-center text-xs text-gray-400">No line items — <button onClick={addItem} className="text-indigo-500 hover:underline">add one</button></div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-1 px-1">{['Description','Qty','Rate','Amount',''].map((h,i)=><div key={i} className={`text-[10px] font-semibold uppercase tracking-wider text-gray-400 ${i===0?'col-span-5':i===4?'col-span-1':'col-span-2'}`}>{h}</div>)}</div>
                  {fields.items.map((item,i)=>(
                    <div key={i} className="grid grid-cols-12 gap-1 items-center">
                      <div className="col-span-5"><Input value={item.description} onChange={e=>updateItem(i,'description',e.target.value)} placeholder="Item"/></div>
                      <div className="col-span-2"><Input value={item.qty} onChange={e=>updateItem(i,'qty',e.target.value)} placeholder="1"/></div>
                      <div className="col-span-2"><Input value={item.rate} onChange={e=>updateItem(i,'rate',e.target.value)} placeholder="0.00"/></div>
                      <div className="col-span-2"><Input value={item.amount} onChange={e=>updateItem(i,'amount',e.target.value)} placeholder="0.00"/></div>
                      <div className="col-span-1 flex justify-center"><button onClick={()=>removeItem(i)} className="text-gray-300 hover:text-red-500 text-sm">✕</button></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {saveError&&<div className="rounded-xl bg-red-50 border border-red-100 p-3 text-xs text-red-700">{saveError}</div>}
            <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
              <Button variant="secondary" onClick={reset} disabled={saving}>Start over</Button>
              <Button onClick={handleSave} disabled={saving}>{saving?'⏳ Saving…':'✅ Save expense'}</Button>
            </div>
          </div>
        </div>
      )}

      {step===3 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-4xl">✅</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Expense saved!</h2>
          <p className="text-sm text-gray-500 max-w-sm mb-8">Your bill has been saved as a pending expense and is ready for manager review.</p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={reset}>Upload another bill</Button>
            <Button onClick={()=>navigate('/claims')}>View in Claims →</Button>
          </div>
        </div>
      )}
    </div>
  );
}
