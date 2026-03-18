import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const OPENING_MESSAGE = `
  <html>
    <head>
      <title>Opening certificate…</title>
      <style>
        body {
          margin: 0;
          min-height: 100vh;
          display: grid;
          place-items: center;
          font-family: system-ui, sans-serif;
          background: hsl(0 0% 100%);
          color: hsl(222 47% 11%);
        }
      </style>
    </head>
    <body>
      <p>Opening certificate…</p>
    </body>
  </html>
`;

export const openCertificatePreview = async (path: string) => {
  const previewWindow = window.open('', '_blank', 'noopener,noreferrer');

  if (previewWindow) {
    previewWindow.document.write(OPENING_MESSAGE);
    previewWindow.document.close();
  }

  const { data, error } = await supabase.storage.from('certificates').download(path);

  if (error || !data) {
    previewWindow?.close();
    toast.error('Unable to open certificate');
    return;
  }

  const objectUrl = URL.createObjectURL(data);

  if (previewWindow) {
    previewWindow.location.href = objectUrl;
  } else {
    const fallbackWindow = window.open(objectUrl, '_blank', 'noopener,noreferrer');
    if (!fallbackWindow) {
      window.location.href = objectUrl;
    }
  }

  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 60_000);
};
