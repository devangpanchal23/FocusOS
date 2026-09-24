import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FixedSizeList, ListChildComponentProps } from 'react-window';
import {
  Clock,
  Filter,
  Monitor,
  Globe,
  Layers,
  ChevronDown,
  Search,
  Play,
  Pause,
  RotateCcw,
  Gauge,
  BarChart2,
} from 'lucide-react';
import { v5Api, TimelineEvent, DaySummaryBucket } from '../../services/v5.service';
import { api } from '../../services/api.js';

const SOURCE_TYPES = ['SCREENSHOT_UPLOAD', 'BROWSER_EXTENSION', 'DESKTOP_AGENT', 'MOBILE_APP', 'MANUAL'];
const SPEEDS = [0.5, 1, 2, 4, 8];

const CATEGORY_COLORS: Record<string, string> = {
  Development: '#10b981',
  Productivity: '#6366f1',
  'Social Media': '#f43f5e',
  Entertainment: '#ea580c',
  Communication: '#06b6d4',
  Education: '#f59e0b',
  Other: '#71717a',
};

function colorForCategory(name?: string) {
  if (!name) return '#3f3f46';
  return CATEGORY_COLORS[name] || '#6366f1';
}

const ROW_HEIGHT = 66;

export const TimelinePage: React.FC = () => {
  const todayStr = new Date().toISOString().split('T')[0];

  const [date, setDate] = useState<string>(todayStr);
  const [devices, setDevices] = useState<any[]>([]);
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([]);
  const [selectedSourceTypes, setSelectedSourceTypes] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const [daySummary, setDaySummary] = useState<DaySummaryBucket[]>([]);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null | undefined>(undefined);
  const [totalDurationSeconds, setTotalDurationSeconds] = useState<number | undefined>(undefined);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scrubHour, setScrubHour] = useState<number>(0);

  // Playback state
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [simTime, setSimTime] = useState<number | null>(null); // ms since midnight of `date`, simulated
  const playbackRef = useRef<number | null>(null);
  const listRef = useRef<FixedSizeList>(null);

  // Debounce search input -> search param
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const loadDevices = async () => {
    try {
      const res = await api.getDevices();
      setDevices(res.devices || []);
    } catch (e) {
      // non-fatal — filter just stays empty
    }
  };

  const loadFirstPage = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPlaying(false);
    setSimTime(null);
    try {
      const [summaryRes, timelineRes] = await Promise.allSettled([
        v5Api.timeline.getDaySummary(date),
        v5Api.timeline.getTimeline({
          from: date,
          to: date,
          deviceIds: selectedDeviceIds.length ? selectedDeviceIds : undefined,
          sourceTypes: selectedSourceTypes.length ? selectedSourceTypes : undefined,
          search: search || undefined,
          limit: 100,
        }),
      ]);

      if (summaryRes.status === 'fulfilled') {
        setDaySummary(Array.isArray(summaryRes.value) ? summaryRes.value : []);
      } else {
        setDaySummary([]);
      }

      if (timelineRes.status === 'fulfilled') {
        setEvents(timelineRes.value?.events || []);
        setNextCursor(timelineRes.value?.nextCursor ?? null);
        setTotalDurationSeconds(timelineRes.value?.totalDurationSeconds);
      } else {
        setEvents([]);
        setNextCursor(null);
      }

      if (summaryRes.status === 'rejected' && timelineRes.status === 'rejected') {
        setError('Unable to reach the timeline service yet.');
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load timeline data.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, selectedDeviceIds, selectedSourceTypes, search]);

  useEffect(() => {
    loadDevices();
  }, []);

  useEffect(() => {
    loadFirstPage();
  }, [loadFirstPage]);

  const handleLoadMore = useCallback(async () => {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const res = await v5Api.timeline.getTimeline({
        from: date,
        to: date,
        deviceIds: selectedDeviceIds.length ? selectedDeviceIds : undefined,
        sourceTypes: selectedSourceTypes.length ? selectedSourceTypes : undefined,
        search: search || undefined,
        cursor: nextCursor,
        limit: 100,
      });
      setEvents((prev) => [...prev, ...(res.events || [])]);
      setNextCursor(res.nextCursor ?? null);
    } catch (e: any) {
      alert(`Failed to load more events: ${e.message}`);
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor, date, selectedDeviceIds, selectedSourceTypes, search]);

  const toggleDevice = (id: string) => {
    setSelectedDeviceIds((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]));
  };

  const toggleSourceType = (type: string) => {
    setSelectedSourceTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  };

  // Sorted events (ascending by start time) drive both the list and playback cursor.
  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()),
    [events]
  );

  const dayStartMs = useMemo(() => new Date(`${date}T00:00:00`).getTime(), [date]);
  const dayEndMs = dayStartMs + 24 * 60 * 60 * 1000;

  // Client-side only: jump to the first loaded event at/after the scrubbed hour.
  const handleScrub = (hour: number) => {
    setScrubHour(hour);
    setPlaying(false);
    const targetMs = dayStartMs + hour * 60 * 60 * 1000;
    setSimTime(targetMs);
    const idx = sortedEvents.findIndex((ev) => new Date(ev.startedAt).getTime() >= targetMs);
    if (idx >= 0) listRef.current?.scrollToItem(idx, 'start');
  };

  // Active event index given the current simulated time cursor.
  const activeIndex = useMemo(() => {
    if (simTime == null || sortedEvents.length === 0) return -1;
    let idx = -1;
    for (let i = 0; i < sortedEvents.length; i++) {
      const t = new Date(sortedEvents[i].startedAt).getTime();
      if (t <= simTime) idx = i;
      else break;
    }
    return idx;
  }, [simTime, sortedEvents]);

  // Auto-scroll to keep the active event visible.
  useEffect(() => {
    if (activeIndex >= 0) {
      listRef.current?.scrollToItem(activeIndex, 'smart');
    }
  }, [activeIndex]);

  // Playback engine: a client-side interval that advances `simTime`, labeled honestly as simulated.
  useEffect(() => {
    if (!playing) {
      if (playbackRef.current) {
        window.clearInterval(playbackRef.current);
        playbackRef.current = null;
      }
      return;
    }
    if (simTime == null) setSimTime(dayStartMs);

    const TICK_MS = 250;
    playbackRef.current = window.setInterval(() => {
      setSimTime((prev) => {
        const base = prev == null ? dayStartMs : prev;
        // 1 real minute of playback advances the day by `speed` simulated hours (fast, legible playback).
        const advanceMs = TICK_MS * speed * 240;
        const next = base + advanceMs;
        if (next >= dayEndMs) {
          setPlaying(false);
          return dayEndMs;
        }
        return next;
      });
    }, TICK_MS);

    return () => {
      if (playbackRef.current) {
        window.clearInterval(playbackRef.current);
        playbackRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, speed]);

  const handlePlayPause = () => setPlaying((p) => !p);
  const handleRestart = () => {
    setPlaying(false);
    setSimTime(dayStartMs);
    listRef.current?.scrollToItem(0, 'start');
  };

  const maxBucketMinutes = Math.max(1, ...daySummary.map((b) => b.totalMinutes || 0));

  // Replay summary computed from the currently-loaded event window.
  const replaySummary = useMemo(() => {
    if (sortedEvents.length === 0) return null;
    const totalActiveSeconds = sortedEvents.reduce((sum, ev) => sum + (ev.durationSeconds || 0), 0);
    const tally = <T extends string>(pick: (ev: TimelineEvent) => T | undefined) => {
      const counts: Record<string, number> = {};
      for (const ev of sortedEvents) {
        const key = pick(ev);
        if (!key) continue;
        counts[key] = (counts[key] || 0) + (ev.durationSeconds || 0);
      }
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      return top ? top[0] : undefined;
    };
    return {
      totalEvents: sortedEvents.length,
      totalActiveSeconds,
      topApp: tally((ev) => ev.applicationName),
      topCategory: tally((ev) => ev.categoryName),
      topDevice: tally((ev) => ev.deviceName),
    };
  }, [sortedEvents]);

  const Row = ({ index, style }: ListChildComponentProps) => {
    const ev = sortedEvents[index];
    const isActive = index === activeIndex;
    return (
      <div style={style} className="pr-1">
        <div
          className={`h-[58px] mt-2 p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
            isActive
              ? 'bg-amber-500/10 border-amber-500/50 shadow-[0_0_0_1px_rgba(245,158,11,0.3)]'
              : 'bg-[#161622] border-[#222232]'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-2 h-8 rounded-full shrink-0" style={{ backgroundColor: colorForCategory(ev.categoryName) }} />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-white truncate">
                  {ev.title || ev.applicationName || ev.domain || ev.eventType}
                </span>
                {ev.isDistraction && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-rose-500/15 text-rose-300 border border-rose-500/30 font-semibold">
                    Distraction
                  </span>
                )}
                {isActive && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold">
                    Now
                  </span>
                )}
              </div>
              <span className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                {ev.deviceName && <span>{ev.deviceName}</span>}
                {ev.deviceName && <span>•</span>}
                <span className="font-mono">{new Date(ev.startedAt).toLocaleTimeString()}</span>
                {ev.domain && (
                  <>
                    <span>•</span>
                    <Globe className="w-3 h-3" />
                    <span>{ev.domain}</span>
                  </>
                )}
              </span>
            </div>
          </div>
          <span className="text-xs font-bold font-mono text-white shrink-0">
            {Math.round(ev.durationSeconds / 60)}m
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 pb-12 animate-fadeIn max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
            V5 DIGITAL DAY REPLAY
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-['Outfit']">
          Unified Timeline
        </h1>
        <p className="text-sm text-zinc-400">
          A jump-to-time day view of everything tracked across your connected devices and sources.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-[#12121b] border border-[#242436] space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-zinc-500" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-[#181824] border border-[#272738] text-white text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-2 flex-1 min-w-[180px] max-w-xs">
            <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <input
              type="text"
              placeholder="Search app, site, title, device..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-[#181824] border border-[#272738] text-white text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          {devices.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <Monitor className="w-3.5 h-3.5 text-zinc-500" />
              {devices.map((d) => (
                <button
                  key={d.id}
                  onClick={() => toggleDevice(d.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
                    selectedDeviceIds.includes(d.id)
                      ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                      : 'text-zinc-400 hover:text-zinc-200 bg-[#171724] border border-[#242436]'
                  }`}
                >
                  {d.name}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-1.5 flex-wrap">
            <Layers className="w-3.5 h-3.5 text-zinc-500" />
            {SOURCE_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => toggleSourceType(type)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
                  selectedSourceTypes.includes(type)
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-zinc-400 hover:text-zinc-200 bg-[#171724] border border-[#242436]'
                }`}
              >
                {type.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>

        {totalDurationSeconds != null && (
          <p className="text-[11px] text-zinc-500 font-mono">
            Total tracked: {Math.round(totalDurationSeconds / 60)}m across {events.length} loaded event{events.length === 1 ? '' : 's'}
          </p>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-300 text-xs">
          {error}
        </div>
      )}

      {/* Day Strip */}
      <div className="p-6 rounded-2xl bg-[#121218] border border-[#20202c]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-white font-['Outfit']">24-Hour Day Strip</h3>
          <span className="text-[11px] text-zinc-500">Colored by dominant category per hour</span>
        </div>

        <div className="flex gap-[2px] h-16 rounded-lg overflow-hidden">
          {Array.from({ length: 24 }, (_, hour) => {
            const bucket = daySummary.find((b) => b.hour === hour);
            const intensity = bucket ? Math.max(0.25, bucket.totalMinutes / maxBucketMinutes) : 0.08;
            const color = bucket && bucket.totalMinutes > 0 ? colorForCategory(bucket.dominantCategory) : '#1c1c28';
            const isPlayheadHour = simTime != null && Math.floor((simTime - dayStartMs) / (60 * 60 * 1000)) === hour;
            return (
              <button
                key={hour}
                onClick={() => handleScrub(hour)}
                title={`${hour}:00 — ${bucket?.dominantCategory || 'No activity'} (${bucket?.totalMinutes || 0}m)`}
                className={`flex-1 relative group ${isPlayheadHour ? 'ring-2 ring-amber-400 ring-inset' : ''}`}
                style={{ backgroundColor: color, opacity: bucket && bucket.totalMinutes > 0 ? intensity : 0.4 }}
              >
                <span className="absolute inset-x-0 bottom-0.5 text-center text-[8px] text-white/70 font-mono opacity-0 group-hover:opacity-100 transition">
                  {hour}
                </span>
              </button>
            );
          })}
        </div>

        {/* Scrub / jump-to-time control */}
        <div className="mt-4">
          <label className="flex items-center gap-2 text-[11px] text-zinc-400 mb-1.5">
            <Clock className="w-3.5 h-3.5" />
            Jump to time: <span className="text-white font-mono">{String(scrubHour).padStart(2, '0')}:00</span>
          </label>
          <input
            type="range"
            min={0}
            max={23}
            step={1}
            value={scrubHour}
            onChange={(e) => handleScrub(Number(e.target.value))}
            className="w-full accent-amber-500"
          />
        </div>

        {/* Playback controls */}
        <div className="mt-5 pt-4 border-t border-[#1c1c28] flex flex-wrap items-center gap-3">
          <button
            onClick={handlePlayPause}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold transition"
          >
            {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {playing ? 'Pause' : 'Play'}
          </button>
          <button
            onClick={handleRestart}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#171724] hover:bg-[#202030] text-zinc-200 border border-[#2b2b3d] text-xs font-semibold transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restart
          </button>
          <div className="flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-zinc-500" />
            {SPEEDS.map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-2 py-1 rounded-md text-[11px] font-mono font-semibold transition ${
                  speed === s
                    ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                    : 'text-zinc-400 hover:text-zinc-200 bg-[#171724] border border-[#242436]'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
          <span className="text-[11px] text-zinc-500 font-mono ml-auto">
            {simTime != null
              ? `Simulated time: ${new Date(simTime).toLocaleTimeString()}`
              : 'Simulated timeline playback — not real video'}
          </span>
        </div>
      </div>

      {/* Replay Summary */}
      {replaySummary && (
        <div className="p-6 rounded-2xl bg-[#121218] border border-[#20202c]">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-4 h-4 text-emerald-400" />
            <h3 className="text-base font-bold text-white font-['Outfit']">Replay Summary</h3>
            <span className="text-[11px] text-zinc-500">Computed from the currently-loaded event window</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[#161622] border border-[#222232]">
              <span className="text-[10px] text-zinc-500 uppercase block">Total Events</span>
              <span className="font-bold text-white font-mono">{replaySummary.totalEvents}</span>
            </div>
            <div className="p-3 rounded-xl bg-[#161622] border border-[#222232]">
              <span className="text-[10px] text-zinc-500 uppercase block">Total Active Time</span>
              <span className="font-bold text-white font-mono">{Math.round(replaySummary.totalActiveSeconds / 60)}m</span>
            </div>
            <div className="p-3 rounded-xl bg-[#161622] border border-[#222232]">
              <span className="text-[10px] text-zinc-500 uppercase block">Top App</span>
              <span className="font-bold text-white truncate block">{replaySummary.topApp || '—'}</span>
            </div>
            <div className="p-3 rounded-xl bg-[#161622] border border-[#222232]">
              <span className="text-[10px] text-zinc-500 uppercase block">Top Category</span>
              <span className="font-bold text-white truncate block">{replaySummary.topCategory || '—'}</span>
            </div>
            <div className="p-3 rounded-xl bg-[#161622] border border-[#222232]">
              <span className="text-[10px] text-zinc-500 uppercase block">Top Device</span>
              <span className="font-bold text-white truncate block">{replaySummary.topDevice || '—'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Event List (virtualized) */}
      <div className="p-6 rounded-2xl bg-[#121218] border border-[#20202c]">
        <h3 className="text-base font-bold text-white font-['Outfit'] mb-4">Event Log</h3>

        {loading ? (
          <div className="py-12 text-center text-xs text-zinc-500">Loading timeline...</div>
        ) : sortedEvents.length > 0 ? (
          <FixedSizeList
            ref={listRef}
            height={Math.min(520, Math.max(200, sortedEvents.length * ROW_HEIGHT))}
            width="100%"
            itemCount={sortedEvents.length}
            itemSize={ROW_HEIGHT}
          >
            {Row}
          </FixedSizeList>
        ) : (
          <div className="p-8 text-center text-xs text-zinc-500 border border-dashed border-[#242436] rounded-xl">
            No events recorded for this day yet.
          </div>
        )}

        {nextCursor && (
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="w-full mt-4 py-2.5 rounded-xl bg-[#171724] hover:bg-[#202030] text-zinc-200 border border-[#2b2b3d] text-xs font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-50"
          >
            <ChevronDown className="w-3.5 h-3.5" />
            {loadingMore ? 'Loading...' : 'Load More Events'}
          </button>
        )}
      </div>
    </div>
  );
};
