import { ArrowLeft, RotateCcw, Trophy } from 'lucide-react';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getPlane, type Standing } from '@classroom-arena/shared';
import { Button } from '../components/ui/button';
import { cn } from '../lib/utils';

interface ResultPanelProps {
  standings: Standing[];
  durationSeconds: number;
  playerId: string;
  onRematch: () => void;
  onLeave: () => void;
}

const CHART_COLORS = ['#22D3EE', '#F59E0B', '#A78BFA', '#34D399'];

export function ResultPanel({
  standings,
  durationSeconds,
  playerId,
  onRematch,
  onLeave
}: ResultPanelProps) {
  const winner = standings[0];
  const chartData = standings.map((standing) => ({
    name: standing.name,
    damage: standing.damage,
    color: getPlane(standing.planeId).color
  }));

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0B1220]">
      <div className="arena-grid pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-amber-400/10 blur-[120px]"
        aria-hidden="true"
      />

      <main className="relative z-10 mx-auto flex min-h-screen max-w-[1080px] flex-col justify-center px-6 py-12">
        <section className="glass-panel animate-fade-up rounded-2xl p-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300">
                <Trophy size={24} aria-hidden="true" />
              </div>
              <div>
                <p className="label-caps !text-amber-300">对局结束</p>
                <h1 className="mt-1 text-3xl font-bold text-white">
                  {winner ? `${winner.name} 获得制空权` : '本场对局结束'}
                </h1>
                <p className="mt-1 text-sm text-slate-400">飞行时长 {Math.round(durationSeconds / 60)} 分钟 · 自由对战</p>
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

          <div className="mt-8 flex flex-col gap-6 lg:flex-row">
            <div className="flex-1 overflow-hidden rounded-xl border border-white/10">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/[0.04] text-xs text-slate-400">
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
                        'border-t border-white/5',
                        standing.id === playerId ? 'bg-cyan-400/[0.07]' : ''
                      )}
                    >
                      <td className="px-4 py-3 font-mono text-slate-400">{String(index + 1).padStart(2, '0')}</td>
                      <td className="px-4 py-3 font-semibold text-white">{standing.name}</td>
                      <td className="px-4 py-3 text-slate-400">{getPlane(standing.planeId).name}</td>
                      <td className="px-4 py-3 text-right font-mono text-amber-300">{standing.kills}</td>
                      <td className="px-4 py-3 text-right font-mono text-cyan-300">{standing.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="w-full rounded-xl border border-white/10 bg-black/20 p-4 lg:w-[360px]">
              <p className="label-caps !text-slate-400">造成伤害</p>
              <div className="mt-3 h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      contentStyle={{ background: '#111C2E', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8 }}
                      labelStyle={{ color: '#F8FAFC' }}
                    />
                    <Bar dataKey="damage" name="伤害" radius={[6, 6, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
