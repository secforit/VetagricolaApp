export default function Footer() {
  return (
    <footer className="border-t border-border bg-card mt-auto">
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* App brand */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius)] bg-sidebar overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="CanisVet Logo" width={32} height={32} className="object-contain" />
          </div>
          <span className="text-sm font-semibold text-foreground">CanisVet</span>
        </div>

        {/* Copyright */}
        <p className="text-xs text-muted-foreground text-center">
          &copy; {new Date().getFullYear()} &mdash; VETAGRICOLA FARM SRL. Toate drepturile rezervate.
        </p>

        {/* Developer brand */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Dezvoltat de Lisman Razvan </span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/Logo-SECFORIT.png" alt="SECFORIT SRL" className="h-10 w-auto object-contain" />
        </div>
      </div>
    </footer>
  );
}
