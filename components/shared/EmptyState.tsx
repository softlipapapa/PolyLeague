interface EmptyStateProps {
  title: string;
  message: string;
}

export default function EmptyState({ title, message }: EmptyStateProps) {
  return (
    <div className="text-center py-16">
      <p className="text-sm font-medium text-white/30 mb-1">{title}</p>
      <p className="text-xs text-white/15">{message}</p>
    </div>
  );
}
