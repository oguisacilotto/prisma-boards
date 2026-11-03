// Show an uploaded HTML file inside the app without handing it the user's session
// (written for this showcase).
//
// Why not just open the file URL? Object storage often serves .html as text/plain, and a
// blob: URL in a new window doesn't open inside an installed PWA or an embedded webview.
// Rendering with srcdoc works everywhere — and the sandbox keeps it isolated:
// no `allow-same-origin` means the page gets a unique origin and can't read cookies,
// localStorage or call the API as the user.
import { useState } from 'react';
import { createPortal } from 'react-dom';

export function HtmlAttachment({ name, signedUrl, onDownload }: {
  name: string;
  signedUrl: string;
  onDownload: () => void;
}) {
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    try {
      const res = await fetch(signedUrl);
      if (!res.ok) throw new Error(`Could not open the file (HTTP ${res.status})`);
      setHtml(new TextDecoder('utf-8').decode(await res.arrayBuffer()));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open the file');
    }
  }

  return (
    <>
      <button onClick={open}>{name}</button>
      {error && <p role="alert">{error}</p>}
      {html !== null && createPortal( // portal: escapes any transformed/clipped parent modal
        <div className="viewer-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setHtml(null)}>
          <div className="viewer">
            <header>
              <strong>{name}</strong>
              <button onClick={onDownload}>Download</button>
              <button onClick={() => setHtml(null)} aria-label="Close">×</button>
            </header>
            <iframe
              title={name}
              srcDoc={html}
              sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms allow-modals"
            />
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
