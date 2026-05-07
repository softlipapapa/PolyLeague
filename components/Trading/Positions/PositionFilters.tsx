interface PositionFiltersProps {
  positionCount: number;
  hideDust: boolean;
  onToggleHideDust: () => void;
}

export default function PositionFilters({
  positionCount,
  hideDust,
  onToggleHideDust,
}: PositionFiltersProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-baseline gap-2">
        <h3 className="text-sm font-semibold text-white/80">Positions</h3>
        <span className="text-xs text-white/20 font-data">{positionCount}</span>
      </div>
      <button
        onClick={onToggleHideDust}
        className="px-2 py-1 rounded-md text-[10px] font-medium transition-colors cursor-pointer
          text-white/25 hover:text-white/50 bg-white/3 hover:bg-white/6 border border-white/5"
      >
        {hideDust ? "Show dust" : "Hide dust"}
      </button>
    </div>
  );
}
