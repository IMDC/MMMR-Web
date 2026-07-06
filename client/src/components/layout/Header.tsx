interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function Header({ title, subtitle, actions }: HeaderProps) {
  return (
    <header className="h-14 bg-mhmr-olive flex items-center pl-14 pr-4 gap-3 shrink-0 shadow-sm">
      <div className="flex-1 min-w-0">
        <h1 className="text-white font-bold text-base leading-tight truncate">{title}</h1>
        {subtitle && <p className="text-white/70 text-xs truncate">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </header>
  );
}
