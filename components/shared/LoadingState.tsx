export default function LoadingState({
  message = "Loading...",
}: {
  message?: string;
}) {
  return (
    <div className="text-center py-12">
      <div className="inline-flex items-center gap-2 text-sm text-white/25">
        <div className="w-3.5 h-3.5 rounded-full border-2 border-white/10 border-t-white/30 animate-spin" />
        {message}
      </div>
    </div>
  );
}
