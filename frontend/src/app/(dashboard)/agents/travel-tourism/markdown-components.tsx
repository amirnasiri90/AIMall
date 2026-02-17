export const markdownComponents = {
  p: ({ children }: any) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }: any) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
  ol: ({ children }: any) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
  li: ({ children }: any) => <li>{children}</li>,
  code: ({ inline, children }: any) =>
    inline ? (
      <code className="bg-black/10 dark:bg-white/10 rounded px-1 py-0.5 text-xs font-mono">{children}</code>
    ) : (
      <pre className="bg-black/10 dark:bg-white/10 rounded p-3 my-2 overflow-x-auto text-xs font-mono"><code>{children}</code></pre>
    ),
  strong: ({ children }: any) => <strong className="font-bold">{children}</strong>,
  em: ({ children }: any) => <em className="italic">{children}</em>,
  h1: ({ children }: any) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
  h2: ({ children }: any) => <h2 className="text-base font-bold mb-2">{children}</h2>,
  h3: ({ children }: any) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
  a: ({ href, children }: any) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline">{children}</a>,
  blockquote: ({ children }: any) => <blockquote className="border-r-2 border-primary/50 pr-3 my-2 italic text-muted-foreground">{children}</blockquote>,
  table: ({ children }: any) => <div className="overflow-x-auto my-2"><table className="min-w-full text-xs border-collapse">{children}</table></div>,
  th: ({ children }: any) => <th className="border border-border px-2 py-1 bg-muted font-medium text-right">{children}</th>,
  td: ({ children }: any) => <td className="border border-border px-2 py-1 text-right">{children}</td>,
};
