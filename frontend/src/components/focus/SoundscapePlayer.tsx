import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Play, Square, Waves, CloudRain, Coffee, Activity } from 'lucide-react';

export type SoundscapeType = 'BINAURAL_40HZ' | 'RAIN' | 'BROWN_NOISE' | 'CAFE';

interface SoundscapeOption {
  id: SoundscapeType;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
}

const SOUNDSCAPES: SoundscapeOption[] = [
  {
    id: 'BINAURAL_40HZ',
    label: '40Hz Gamma Wave',
    sublabel: 'Binaural Flow State',
    icon: <Activity className="w-4 h-4 text-emerald-400" />,
  },
  {
    id: 'RAIN',
    label: 'Gentle Rain',
    sublabel: 'Pink Noise Masking',
    icon: <CloudRain className="w-4 h-4 text-sky-400" />,
  },
  {
    id: 'BROWN_NOISE',
    label: 'Deep Brown Noise',
    sublabel: 'Deep Acoustic Shield',
    icon: <Waves className="w-4 h-4 text-amber-400" />,
  },
  {
    id: 'CAFE',
    label: 'Lo-Fi Ambience',
    sublabel: 'Warm Focus Filter',
    icon: <Coffee className="w-4 h-4 text-purple-400" />,
  },
];

export const SoundscapePlayer: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedSound, setSelectedSound] = useState<SoundscapeType>('BINAURAL_40HZ');
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const activeNodesRef = useRef<AudioNode[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Initialize Audio Context on demand
  const getAudioContext = () => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioCtx();
      const gain = audioCtxRef.current.createGain();
      gain.gain.value = isMuted ? 0 : volume * 0.25; // Safe headroom
      gain.connect(audioCtxRef.current.destination);
      gainNodeRef.current = gain;
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  // Stop active procedural generators
  const stopNodes = () => {
    activeNodesRef.current.forEach((node) => {
      try {
        if ('stop' in node && typeof (node as any).stop === 'function') {
          (node as any).stop();
        }
        node.disconnect();
      } catch {
        // Safe disposal
      }
    });
    activeNodesRef.current = [];
  };

  // Procedural generator implementations
  const startSoundscape = (type: SoundscapeType) => {
    const ctx = getAudioContext();
    stopNodes();

    const masterGain = gainNodeRef.current!;

    if (type === 'BINAURAL_40HZ') {
      // Dual oscillator 40Hz difference (Left: 200Hz, Right: 240Hz)
      const oscLeft = ctx.createOscillator();
      const oscRight = ctx.createOscillator();
      const merger = ctx.createChannelMerger(2);

      oscLeft.type = 'sine';
      oscLeft.frequency.value = 200; // Base frequency

      oscRight.type = 'sine';
      oscRight.frequency.value = 240; // 40Hz binaural delta for Gamma cognition

      oscLeft.connect(merger, 0, 0);
      oscRight.connect(merger, 0, 1);
      merger.connect(masterGain);

      oscLeft.start();
      oscRight.start();
      activeNodesRef.current.push(oscLeft, oscRight, merger);
    } else if (type === 'RAIN' || type === 'BROWN_NOISE' || type === 'CAFE') {
      // Buffer noise generator
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);

      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        if (type === 'BROWN_NOISE') {
          // Integrated Brownian noise
          output[i] = (lastOut + 0.02 * white) / 1.02;
          lastOut = output[i];
          output[i] *= 3.5;
        } else {
          // Pink-ish noise
          output[i] = (lastOut + 0.05 * white) / 1.05;
          lastOut = output[i];
          output[i] *= 2.5;
        }
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      // Filter shaping
      const filter = ctx.createBiquadFilter();
      if (type === 'RAIN') {
        filter.type = 'lowpass';
        filter.frequency.value = 850;
      } else if (type === 'CAFE') {
        filter.type = 'bandpass';
        filter.frequency.value = 1200;
        filter.Q.value = 1.5;
      } else {
        filter.type = 'lowpass';
        filter.frequency.value = 400;
      }

      whiteNoise.connect(filter);
      filter.connect(masterGain);
      whiteNoise.start();
      activeNodesRef.current.push(whiteNoise, filter);
    }
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      stopNodes();
      setIsPlaying(false);
    } else {
      startSoundscape(selectedSound);
      setIsPlaying(true);
    }
  };

  const handleSelectSound = (type: SoundscapeType) => {
    setSelectedSound(type);
    if (isPlaying) {
      startSoundscape(type);
    }
  };

  // Adjust volume
  useEffect(() => {
    if (gainNodeRef.current && audioCtxRef.current) {
      gainNodeRef.current.gain.setValueAtTime(
        isMuted ? 0 : volume * 0.25,
        audioCtxRef.current.currentTime
      );
    }
  }, [volume, isMuted]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopNodes();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Visualizer bar animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let step = 0;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barCount = 18;
      const barWidth = canvas.width / barCount - 2;

      for (let i = 0; i < barCount; i++) {
        let height = 4;
        if (isPlaying && !isMuted) {
          const wave = Math.sin(step * 0.08 + i * 0.4);
          height = Math.max(4, Math.abs(wave) * (canvas.height * 0.8) * volume);
        }

        const x = i * (barWidth + 2);
        const y = (canvas.height - height) / 2;

        const grad = ctx.createLinearGradient(0, y, 0, y + height);
        grad.addColorStop(0, '#6366f1');
        grad.addColorStop(1, '#a855f7');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, height, 2);
        ctx.fill();
      }

      step++;
      animFrameRef.current = requestAnimationFrame(render);
    };

    render();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, isMuted, volume]);

  return (
    <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center">
            <Waves className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Focus Environment</h4>
            <p className="text-xs text-slate-400">Procedural Acoustic Synthesizer</p>
          </div>
        </div>

        {/* Master Play Button & Mini Visualizer */}
        <div className="flex items-center gap-3">
          <canvas ref={canvasRef} width={80} height={26} className="rounded-md opacity-80" />

          <button
            onClick={handleTogglePlay}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md ${
              isPlaying
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20'
            }`}
          >
            {isPlaying ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" /> Stop Audio
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" /> Play Ambience
              </>
            )}
          </button>
        </div>
      </div>

      {/* Soundscape Selector Pills */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-4">
        {SOUNDSCAPES.map((s) => {
          const isSelected = selectedSound === s.id;
          return (
            <button
              key={s.id}
              onClick={() => handleSelectSound(s.id)}
              className={`p-3 rounded-xl text-left border transition-all flex flex-col gap-1.5 relative overflow-hidden ${
                isSelected
                  ? 'bg-indigo-950/50 border-indigo-500/50 shadow-lg shadow-indigo-500/10'
                  : 'bg-slate-800/40 border-white/5 hover:bg-slate-800/70 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="p-1.5 rounded-lg bg-slate-900/60">{s.icon}</span>
                {isSelected && isPlaying && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-white">{s.label}</p>
                <p className="text-[10px] text-slate-400 leading-tight">{s.sublabel}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Volume Bar & Controls */}
      <div className="flex items-center gap-3 pt-2 border-t border-white/5">
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="text-slate-400 hover:text-white transition-colors"
        >
          {isMuted || volume === 0 ? (
            <VolumeX className="w-4 h-4 text-rose-400" />
          ) : (
            <Volume2 className="w-4 h-4 text-slate-300" />
          )}
        </button>

        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={isMuted ? 0 : volume}
          onChange={(e) => {
            setVolume(parseFloat(e.target.value));
            if (isMuted) setIsMuted(false);
          }}
          className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
        />

        <span className="text-[11px] font-mono text-slate-400 w-8 text-right">
          {isMuted ? '0%' : `${Math.round(volume * 100)}%`}
        </span>
      </div>
    </div>
  );
};
