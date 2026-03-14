'use client';

interface StatTileProps {
  label:   string;
  value:   number;
  icon:    React.ReactNode;
  color:   string;
  bgColor: string;
}

export function StatTile({ label, value, icon, color, bgColor }: StatTileProps) {
  return (
    <div className="card p-4 flex flex-col gap-2">
      <div className={`w-8 h-8 rounded-md flex items-center justify-center ${bgColor} ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-display font-bold text-[var(--color-text)]">
          {value.toLocaleString()}
        </p>
        <p className="text-xs text-[var(--color-text-muted)] font-medium">{label}</p>
      </div>
    </div>
  );
}
