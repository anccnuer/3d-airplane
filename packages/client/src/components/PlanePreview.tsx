interface PlanePreviewProps {
  planeId: string;
  color?: string;
}

const PATHS: Record<string, string> = {
  sparrow: 'M12 2 L18 11 L30 14 L18 17 L12 26 L9 17 L2 14 L9 11 Z',
  falcon: 'M12 1 L19 10 L31 13 L20 17 L13 27 L10 17 L1 13 L10 10 Z',
  anvil: 'M12 3 L20 10 L30 15 L20 18 L13 26 L10 18 L2 15 L10 10 Z',
  dragonfly: 'M12 2 L17 9 L28 10 L18 15 L13 27 L10 15 L2 10 L10 9 Z',
  meteor: 'M12 1 L19 11 L30 15 L19 17 L12 27 L10 17 L1 15 L10 11 Z'
};

export function PlanePreview({ planeId, color = '#22D3EE' }: PlanePreviewProps) {
  return (
    <div className="flex h-full w-full items-center justify-center overflow-hidden" aria-hidden="true">
      <svg viewBox="0 0 32 28" className="h-3/4 w-3/4 animate-pulse" style={{ color }} role="presentation">
        <path d={PATHS[planeId] ?? PATHS.sparrow} fill="currentColor" opacity="0.85" />
        <circle cx="12" cy="14" r="2" fill="#0B1220" opacity="0.8" />
      </svg>
    </div>
  );
}
