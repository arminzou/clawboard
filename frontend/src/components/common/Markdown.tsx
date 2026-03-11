import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function Markdown({ content }: { content: string }) {
  // Security: we do NOT enable raw HTML rendering.
  // react-markdown will treat HTML as text unless rehypeRaw is used.
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="whitespace-pre-wrap text-sm leading-6 text-[rgb(var(--cb-text))]">{children}</p>,
        a: ({ children, href }) => (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2 hover:opacity-90"
          >
            {children}
          </a>
        ),
        ul: ({ children }) => <ul className="ml-5 list-disc space-y-1 text-sm leading-6">{children}</ul>,
        ol: ({ children }) => <ol className="ml-5 list-decimal space-y-1 text-sm leading-6">{children}</ol>,
        li: ({ children }) => <li className="text-[rgb(var(--cb-text))]">{children}</li>,
        code: ({ children, className }) => {
          const isBlock = Boolean(className && className.includes('language-'));
          if (isBlock) {
            return (
              <code className={`font-mono text-[12px] text-[rgb(var(--cb-text))] ${className ?? ''}`.trim()}>
                {children}
              </code>
            );
          }
          return (
            <code className="rounded bg-[rgb(var(--cb-hover))] px-1 py-0.5 font-mono text-[12px] text-[rgb(var(--cb-text))]">
              {children}
            </code>
          );
        },
        pre: ({ children }) => (
          <pre className="overflow-x-auto rounded-md border border-[rgb(var(--cb-border))] bg-[rgb(var(--cb-card))] p-3 text-[12px]">
            {children}
          </pre>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-[rgb(var(--cb-border))] pl-3 text-sm text-[rgb(var(--cb-text-muted))]">
            {children}
          </blockquote>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
