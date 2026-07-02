interface StatusBadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

export function StatusBadge({ children, variant = 'default' }: StatusBadgeProps) {
  const variants = {
    default: 'bg-gray-100 text-gray-700',
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
    danger: 'bg-red-50 text-red-700',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${variants[variant]}`}>
      {children}
    </span>
  );
}
