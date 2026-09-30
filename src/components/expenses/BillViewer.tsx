import { useEffect, useState } from 'react';
import { getSignedUrl } from '../../hooks/useUpload';

interface Props {
  receiptUrl: string | null;
  billUrls: string | null;  // comma-separated text
}

interface FileLink {
  path: string;
  url: string;
  name: string;
  isPdf: boolean;
}

export const BillViewer = ({ receiptUrl, billUrls }: Props) => {
  const [links, setLinks] = useState<FileLink[]>([]);

  useEffect(() => {
    const paths: string[] = [];
    if (receiptUrl) paths.push(receiptUrl);
    if (billUrls) paths.push(...billUrls.split(',').map(s => s.trim()).filter(Boolean));
    if (!paths.length) return;

    Promise.all(
      paths.map(async path => {
        const url = await getSignedUrl(path);
        const name = path.split('/').pop() ?? path;
        const isPdf = name.toLowerCase().endsWith('.pdf');
        return url ? { path, url, name, isPdf } : null;
      })
    ).then(results => {
      setLinks(results.filter(Boolean) as FileLink[]);
    });
  }, [receiptUrl, billUrls]);

  if (!links.length) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {links.map((link, i) => (
        <a
          key={link.path}
          href={link.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-600 hover:bg-indigo-100 transition-colors"
          title={link.name}
        >
          {link.isPdf ? '📄' : '🖼️'}
          {links.length === 1 ? 'View bill' : `Bill ${i + 1}`}
          <span className="opacity-60">↗</span>
        </a>
      ))}
    </div>
  );
};
