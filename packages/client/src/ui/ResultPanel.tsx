import { ArrowLeft, RotateCcw, Trophy } from 'lucide-react';
import { PLAYER_COLORS, getPlane, type Standing } from '@classroom-arena/shared';
import { Button } from '../components/ui/button';
import { Panel } from '../components/ui/panel';
import { SectionHeader } from '../components/ui/sectionHeader';
import { cn } from '../lib/utils';

interface ResultPanelProps {
  standings: Standing[];
  durationSeconds: number;
  playerId: string;
  onRematch: () => void;
  onLeave: () => void;
}

const PODIUM_TONES = ['text-accent', 'text-sky', 'text-ink-muted'];

export function ResultPanel({
  standings,
  durationSeconds,
  playerId,
  onRematch,
  onLeave
}: ResultPanelProps) {
  const winner = standings[0];
  const maxDamage = Math.max(1, ...standings.map((standing) => standing.damage));

  return (
    <div className="relative min-h-screen overflow-hidden">
      <main className="relative z-10 mx-auto flex min-h-screen max-w-[1120px] flex-col justify-center px-6 py-12">
        <Panel index="REPORT" className="animate-fade-up">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-accent/40 bg-accent-soft text-accent">
                <Trophy size={24} aria-hidden="true" />
              </div>
              <div>
                <p className="label-caps !text-accent">对局结束</p>
                <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                  {winner ? `${winner.name} 获得制空权` : '本场对局结束'}
                </h1>
                <p className="mt-1 font-mono text-xs text-ink-muted">
                  飞行时长 {Math.round(durationSeconds / 60)} 分钟 · 自由对战
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={onLeave}>
                <ArrowLeft size={16} aria-hidden="true" />
                返回大厅
              </Button>
              <Button onClick={onRematch}>
                <RotateCcw size={16} aria-hidden="true" />
                再来一局
              </Button>
            </div>
          </div>

          {standings.length > 0 ? (
            <div className="mt-8 flex flex-col gap-8 lg:flex-row">
              <div className="flex-1">
                <SectionHeader index="01" label="名次" />
                <div className="mt-4 flex flex-col gap-3">
                  {standings.slice(0, 3).map((standing, index) => (
                    <div
                      key={standing.id}
                      className={cn(
                        'flex items-center gap-4 rounded-xl border p-4',
                        index === 0
                          ? 'border-accent/40 bg-accent-soft'
                          : 'border-line bg-surface-raised'
                      )}
                    >
                      <span
                        className={cn(
                          'font-display w-12 shrink-0 text-3xl font-bold tabular-nums',
                          PODIUM_TONES[index] ?? 'text-ink-muted'
                        )}
                      >
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">{standing.name}</p>
                        <p className="mt-0.5 truncate text-xs text-ink-muted">{getPlane(standing.planeId).name}</p>
                      </div>
                      <span className="shrink-0 font-mono text-sm font-semibold text-accent">{standing.score}</span>
                    </div>
                  ))}
                </div>

                <div className="instrument-grid mt-8 overflow-hidden rounded-xl border border-line">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-surface-inset/70 font-mono text-xs text-ink-muted">
                      <tr>
                        <th className="px-4 py-3">名次</th>
                        <th className="px-4 py-3">飞行员</th>
                        <th className="px-4 py-3">机型</th>
                        <th className="px-4 py-3 text-right">击坠</th>
                        <th className="px-4 py-3 text-right">积分</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings.map((standing, index) => (
                        <tr
                          key={standing.id}
                          className={cn(
                            'border-t border-line',
                            standing.id === playerId ? 'bg-accent-soft/40' : ''
                          )}
                        >
                          <td className="px-4 py-3 font-mono text-ink-muted">
                            {String(index + 1).padStart(2, '0')}
                          </td>
                          <td className="px-4 py-3 font-semibold text-ink">{standing.name}</td>
                          <td className="px-4 py-3 text-ink-muted">{getPlane(standing.planeId).name}</td>
                          <td className="px-4 py-3 text-right font-mono text-sky">{standing.kills}</td>
                          <td className="px-4 py-3 text-right font-mono text-accent">{standing.score}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="w-full lg:w-[360px]">
                <SectionHeader index="02" label="造成伤害" />
                <div className="instrument-grid mt-4 flex flex-col gap-4 rounded-xl border border-line bg-surface-inset/60 p-4">
                  {standings.map((standing, index) => {
                    const color = PLAYER_COLORS[index % PLAYER_COLORS.length];
                    const ratio = Math.min(1, standing.damage / maxDamage);
                    return (
                      <div key={standing.id} className="flex items-center gap-3">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
                        <span className="w-20 shrink-0 truncate text-xs text-ink-muted">{standing.name}</span>
                        <div className="instrument-grid h-2.5 flex-1 overflow-hidden rounded-full bg-surface-inset">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{ width: `${Math.round(ratio * 100)}%`, backgroundColor: color }}
                          />
                        </div>
                        <span className="w-10 shrink-0 text-right font-mono text-xs text-ink">{standing.damage}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}
        </Panel>
      </main>
    </div>
  );
}
