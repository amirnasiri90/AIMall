export default function GenieLayout({ children }: { children: React.ReactNode }) {
  return (
    <div dir="ltr" className="font-sans antialiased">
      {children}
    </div>
  );
}
