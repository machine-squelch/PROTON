import React, { useState, useEffect, useCallback, useRef } from 'react';
import AtomScene from './components/AtomScene';
import { QuantumAI } from './services/geminiService';
import { QuantumState, AtomType, WaveParams, EntityType } from './types';

const ANIMALS: EntityType[] = [
  'arctic fox',
  'great white shark',
  'blue whale',
  'emperor penguin',
  'golden eagle',
  'snow leopard',
  'giant octopus',
  'hummingbird',
  'manta ray',
  'wolf',
  'jellyfish',
  'owl',
  'sea turtle',
  'coral reef fish',
  'dragonfly',
  'peacock'
];

const SPACE_PHENOMENA: EntityType[] = [
  'spiral galaxy',
  'supernova explosion',
  'aurora borealis',
  'solar flare',
  'black hole accretion disk',
  'planetary nebula',
  'comet tail',
  'Saturn\'s rings',
  'Jupiter\'s great red spot',
  'Milky Way core',
  'neutron star',
  'asteroid field',
  'lunar eclipse',
  'meteor shower',
  'interstellar dust cloud',
  'pulsar beam'
];

const VISUAL_STYLES = [
  'bioluminescent',
  'ethereal',
  'iridescent',
  'crystalline',
  'radiant',
  'translucent',
  'shimmering',
  'luminous'
];

const App: React.FC = () => {
  const [isStarted, setIsStarted] = useState<boolean>(false);
  const [selectedAtom, setSelectedAtom] = useState<AtomType>('Hydrogen');
  const [selectedEntity, setSelectedEntity] = useState<EntityType>('arctic fox');
  const [waveParams, setWaveParams] = useState<WaveParams>({ wavelength: 1.0, amplitude: 1.0 });
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [usageCount, setUsageCount] = useState<number>(0);
  const [showPaywall, setShowPaywall] = useState<boolean>(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
  const [comfortMode, setComfortMode] = useState<boolean>(false);
  const [selfieData, setSelfieData] = useState<string | null>(null);
  const [selfieConsent, setSelfieConsent] = useState<boolean>(false);
  const [selfieUrl, setSelfieUrl] = useState<string>('');
  const pendingAutoCollapseRef = useRef<boolean>(false);
  
  const [state, setState] = useState<QuantumState>({
    isCollapsing: false,
    isCollapsed: false,
    collapsedImage: null,
    explanation: null,
    error: null,
  });

  const MAX_FREE_USES = 5;

  useEffect(() => {
    const savedUsage = localStorage.getItem('quantum_usage');
    if (savedUsage) setUsageCount(parseInt(savedUsage));
    const subStatus = localStorage.getItem('quantum_subscribed');
    if (subStatus === 'true') setIsSubscribed(true);
  }, []);

  useEffect(() => {
    localStorage.setItem('quantum_usage', usageCount.toString());
  }, [usageCount]);

  const pickRandomSubject = useCallback((): EntityType => {
    // 50/50 split between animals and space phenomena
    const isAnimal = Math.random() < 0.5;
    const style = VISUAL_STYLES[Math.floor(Math.random() * VISUAL_STYLES.length)];
    
    if (isAnimal) {
      const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
      return `${style} ${animal}`;
    } else {
      const phenomenon = SPACE_PHENOMENA[Math.floor(Math.random() * SPACE_PHENOMENA.length)];
      return `${style} ${phenomenon}`;
    }
  }, []);

  const handleStart = () => {
    resetExperiment();
    setShowPaywall(false);
    setIsStarted(true);
  };

  const handleStartAndCollapse = () => {
    pendingAutoCollapseRef.current = true;
    handleStart();
  };

  const simulateCheckout = () => {
    setIsProcessingPayment(true);
    setTimeout(() => {
      setIsSubscribed(true);
      localStorage.setItem('quantum_subscribed', 'true');
      setIsProcessingPayment(false);
      setShowPaywall(false);
    }, 2000);
  };

  const handleCollapse = useCallback(async () => {
    if (!isSubscribed && usageCount >= MAX_FREE_USES) {
      setShowPaywall(true);
      return;
    }

    setState(prev => ({ ...prev, isCollapsing: true, error: null }));

    const subject = pickRandomSubject();
    setSelectedEntity(subject);

    try {
      const baseImage = selfieUrl.trim() || selfieData || undefined;
      const [imageUrl, explanation] = await Promise.all([
        QuantumAI.generateQuantumManifestation(selectedAtom, subject, waveParams, { baseImage }),
        QuantumAI.explainCollapse(selectedAtom, subject)
      ]);

      setUsageCount(prev => prev + 1);
      setSelfieData(null); // drop selfie after successful generation
      setSelfieUrl('');
      setState(prev => ({
        ...prev,
        isCollapsing: false,
        isCollapsed: true,
        collapsedImage: imageUrl,
        explanation: explanation
      }));
    } catch (err: any) {
      console.error(err);
      const msg = err?.message ? `Quantum decoherence failed: ${err.message}` : "Quantum decoherence failed. Check your Stable Diffusion endpoint and key.";
      setState(prev => ({ ...prev, isCollapsing: false, error: msg }));
    }
  }, [selectedAtom, waveParams, usageCount, isSubscribed, pickRandomSubject, selfieData]);

  useEffect(() => {
    if (!isStarted) return;
    if (!pendingAutoCollapseRef.current) return;
    pendingAutoCollapseRef.current = false;
    handleCollapse();
  }, [isStarted, handleCollapse]);

  const resetExperiment = () => {
    setState({
      isCollapsing: false,
      isCollapsed: false,
      collapsedImage: null,
      explanation: null,
      error: null,
    });
  };

  const downloadImage = async () => {
    if (!state.collapsedImage) return;
    try {
      const response = await fetch(state.collapsedImage);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `quantum-${(selectedEntity || 'subject').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed', error);
    }
  };

  const handleSelfieUpload = (file: File | null) => {
    if (!file) {
      setSelfieData(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setSelfieData(result || null);
    };
    reader.readAsDataURL(file);
  };

  if (!isStarted && !state.isCollapsed) {
    return (
      <div className="min-h-screen w-screen bg-[#030303] text-white selection:bg-blue-500/30">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-emerald-400/10 to-transparent blur-3xl opacity-70"></div>
          <header className="p-6 md:p-10 flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <span className="bg-blue-600 p-2 rounded-xl shadow-blue-600/40 shadow-lg">
                <i className="fas fa-atom text-xl"></i>
              </span>
              <div>
                <p className="text-sm font-black tracking-tight uppercase">PROTON FIELD</p>
                <p className="text-xs text-blue-400 font-mono uppercase tracking-[0.2em]">Quantum Wave-Collapse Visualizer</p>
              </div>
            </div>
            <button
              onClick={handleStart}
              className="liquid-card px-4 py-3 rounded-2xl text-[10px] uppercase font-black tracking-widest glow-blue hover:bg-white/10 active:scale-95 transition-all"
            >
              Enter Experience
            </button>
          </header>

          <main className="relative z-10 px-6 md:px-12 lg:px-20 pb-24 space-y-24">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-8">
                <div className="space-y-4">
                  <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.3em] text-blue-300 bg-white/5 px-3 py-2 rounded-full">
                    <i className="fas fa-bolt"></i> Stress Escape Protocol
                  </p>
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.05] uppercase">
                    Quantum Wave-Collapse Visualizer
                  </h1>
                  <p className="text-gray-300 text-lg leading-relaxed">
                    Drift into an immersive, cinematic quantum lab. Collapse waves, watch animals and cosmic phenomena flicker into view, and let the minutes dissolve while you play with impossible physics. No medical claims—just a mesmerizing way to pass the time.
                  </p>
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  {[
                    { icon: "fa-moon", title: "Calming visuals", text: "Liquid-light energy, auroras, and soft glows tuned to feel soothing." },
                    { icon: "fa-dice", title: "Surprise every run", text: "Random living or cosmic subjects; no two collapses are alike." },
                    { icon: "fa-mobile-screen", title: "Built for any screen", text: "Responsive layout; pocket-friendly on iOS/Android browsers." }
                  ].map((item) => (
                    <div key={item.title} className="liquid-card p-4 rounded-2xl border border-white/5">
                      <div className="flex items-center gap-2 mb-2 text-blue-300">
                        <i className={`fas ${item.icon}`}></i>
                        <p className="text-xs font-black uppercase tracking-[0.2em]">{item.title}</p>
                      </div>
                      <p className="text-gray-400 text-sm leading-relaxed">{item.text}</p>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-4 items-center">
                  <button
                    onClick={handleStartAndCollapse}
                    className="liquid-card px-6 py-4 rounded-3xl text-[11px] uppercase font-black tracking-[0.25em] bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-500 hover:to-emerald-400 transition-all active:scale-95"
                  >
                    Start Collapsing
                  </button>
                  <div className="text-left">
                    <p className="text-gray-300 font-semibold">For entertainment only.</p>
                    <p className="text-[11px] text-gray-500 uppercase tracking-[0.2em]">No medical or therapeutic claims.</p>
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="absolute -inset-10 bg-gradient-to-tr from-blue-600/30 via-emerald-400/20 to-transparent blur-3xl opacity-70"></div>
                <div className="relative liquid-card rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl">
                  <div className="aspect-video bg-[#050505] flex flex-col justify-between">
                    <div className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Quantum Wave-Collapse Visualizer</p>
                      </div>
                      <p className="text-[10px] text-blue-300 uppercase font-black tracking-[0.25em]">Sub-Atomic Time Travel</p>
                    </div>
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center px-6">
                        <p className="text-[12px] uppercase tracking-[0.3em] text-blue-200">Preview</p>
                        <h3 className="text-2xl md:text-3xl font-black tracking-tight mt-2 text-gray-50">
                          Waves collapsing into form
                        </h3>
                        <p className="text-gray-400 mt-4 leading-relaxed">
                          Turquoise and emerald energy streams fold into animals and cosmic phenomena while you watch.
                        </p>
                      </div>
                    </div>
                    <div className="p-6 bg-white/5 backdrop-blur">
                      <div className="flex items-center justify-between text-xs text-gray-400 font-mono">
                        <span>λ 1.00 · Ψ 1.00</span>
                        <span>Randomized subject pool</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-6 grid sm:grid-cols-2 gap-4">
                  <div className="liquid-card p-4 rounded-2xl border border-blue-500/10">
                    <p className="text-[10px] text-blue-300 uppercase font-black tracking-[0.25em] mb-1">Tested Flow</p>
                    <p className="text-gray-300 text-sm leading-relaxed">Drop in, tap collapse, breathe with the visuals. Built to feel like a mini sci-fi ritual.</p>
                  </div>
                  <div className="liquid-card p-4 rounded-2xl border border-emerald-500/10">
                    <p className="text-[10px] text-emerald-300 uppercase font-black tracking-[0.25em] mb-1">Mobile Ready</p>
                    <p className="text-gray-300 text-sm leading-relaxed">Optimized for touch and small screens—runs in mobile browsers on iOS and Android.</p>
                  </div>
                </div>
              </div>
            </div>

            <section id="about" className="grid lg:grid-cols-2 gap-10 items-center">
              <div className="liquid-card rounded-[2.5rem] p-8 border border-white/10 shadow-2xl">
                <p className="text-xs uppercase tracking-[0.3em] text-blue-300 font-black inline-flex items-center gap-2 mb-4">
                  <i className="fas fa-sparkles"></i> About
                </p>
                <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-4 uppercase">Why This Exists</h2>
                <p className="text-gray-300 text-lg leading-relaxed mb-4">
                  Built for micro-escapes between tasks, Proton Field is a sensory toy box: spark a collapse, watch an animal or cosmic phenomenon emerge, and let the visuals carry you for a minute. It borrows from science museums, ambient games, and music visualizers to make downtime feel intentional—not wasted.
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="liquid-card p-4 rounded-2xl border border-blue-500/10">
                    <p className="text-[10px] text-blue-300 uppercase font-black tracking-[0.25em] mb-1">Fast In, Fast Out</p>
                    <p className="text-gray-400 text-sm leading-relaxed">One tap to start, no accounts required, tiny rituals you can do in under a minute.</p>
                  </div>
                  <div className="liquid-card p-4 rounded-2xl border border-emerald-500/10">
                    <p className="text-[10px] text-emerald-300 uppercase font-black tracking-[0.25em] mb-1">Comfortable Aesthetic</p>
                    <p className="text-gray-400 text-sm leading-relaxed">Soft glows, fluid motion, and cinematic lighting tuned for calm—without promising outcomes.</p>
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="absolute -inset-8 bg-gradient-to-br from-emerald-500/20 via-blue-500/10 to-transparent blur-3xl opacity-70"></div>
                <div className="relative liquid-card rounded-[3rem] p-8 border border-white/10 shadow-2xl overflow-hidden">
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.25em] text-gray-400 font-black mb-4">
                    <span>Calm Sequence</span>
                    <span className="text-emerald-300 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>Comfort Mode</span>
                  </div>
                  <div className="aspect-video bg-gradient-to-br from-blue-900/50 via-black to-emerald-900/40 rounded-2xl border border-white/10 flex items-center justify-center">
                    <div className="text-center space-y-3 px-6">
                      <p className="text-[11px] uppercase tracking-[0.3em] text-blue-200">Breath-Synced Hints</p>
                      <h3 className="text-2xl md:text-3xl font-black tracking-tight text-white">Inhale: Watch the wave expand. Exhale: Let it collapse.</h3>
                      <p className="text-gray-300">Responsive on mobile—tap to collapse anywhere.</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section id="history" className="liquid-card rounded-[2.5rem] p-8 border border-white/10 shadow-2xl">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                <div className="space-y-3 max-w-2xl">
                  <p className="text-xs uppercase tracking-[0.3em] text-emerald-300 font-black inline-flex items-center gap-2">
                    <i className="fas fa-galaxy"></i> Quantum Lore
                  </p>
                  <h2 className="text-3xl md:text-4xl font-black tracking-tight uppercase">A (Playful) History of Time</h2>
                  <p className="text-gray-300 text-lg leading-relaxed">
                    In the beginning, the Big Bang hurled matter faster than light could organize it. Space stretched, time dilated, and perception fractured. The faster matter traveled, the more elastic time became—giving us a universe where minutes can feel like forever and eons flash by in a blink. Proton Field riffs on that idea: you nudge waves, they collapse into beings or storms, and for a heartbeat you feel time loosen.
                  </p>
                </div>
                <div className="grid sm:grid-cols-2 gap-4 w-full lg:w-auto lg:min-w-[320px]">
                  <div className="liquid-card p-4 rounded-2xl border border-blue-500/10">
                    <p className="text-[10px] text-blue-300 uppercase font-black tracking-[0.25em] mb-1">Eras</p>
                    <p className="text-gray-400 text-sm leading-relaxed">Inflation → plasma seas → atoms → stars → life. Each collapse nods to a different chapter.</p>
                  </div>
                  <div className="liquid-card p-4 rounded-2xl border border-emerald-500/10">
                    <p className="text-[10px] text-emerald-300 uppercase font-black tracking-[0.25em] mb-1">Perception</p>
                    <p className="text-gray-400 text-sm leading-relaxed">Speed warps time. Your collapses are tiny metaphors for how motion bends moments.</p>
                  </div>
                </div>
              </div>
            </section>

            <section id="legal" className="liquid-card rounded-[2rem] p-8 border border-white/10 shadow-xl">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-gray-400 font-black">
                  <i className="fas fa-shield-alt text-blue-300"></i>
                  Safety · Legal · Privacy
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <p className="text-[10px] uppercase font-black tracking-[0.25em] text-blue-300 mb-2">Entertainment Only</p>
                    <p className="text-gray-300 text-sm leading-relaxed">No therapeutic or medical claims; not a treatment or diagnostic tool. For entertainment only.</p>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <p className="text-[10px] uppercase font-black tracking-[0.25em] text-emerald-300 mb-2">Content & Age</p>
                    <p className="text-gray-300 text-sm leading-relaxed">Keep it SFW. Not intended for minors. Generated imagery is synthetic—use discretion when sharing.</p>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <p className="text-[10px] uppercase font-black tracking-[0.25em] text-gray-300 mb-2">Privacy</p>
                    <p className="text-gray-300 text-sm leading-relaxed">We process only the inputs you provide to render images. Avoid personal data in prompts/selfies; if you upload a selfie, it is sent to the image API for generation only. Add a full Privacy Policy and Terms consistent with CCPA/US law before launch.</p>
                  </div>
                </div>
              </div>
            </section>
          </main>
          <footer className="relative z-10 px-6 md:px-12 lg:px-20 pb-10 text-gray-400">
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2 text-white">
                <i className="fas fa-atom text-blue-400"></i>
                <span className="font-black uppercase tracking-[0.2em]">Proton Field</span>
              </div>
              <div className="flex flex-wrap gap-4 text-xs uppercase tracking-[0.2em]">
                <a href="#about" className="hover:text-white transition-colors">About</a>
                <a href="#history" className="hover:text-white transition-colors">History</a>
                <a href="/privacy.html" className="hover:text-white transition-colors">Privacy</a>
                <a href="/terms.html" className="hover:text-white transition-colors">Terms</a>
                <a href="mailto:legal@protonfield.app" className="hover:text-white transition-colors">Contact</a>
              </div>
              <p className="text-[11px] text-gray-500">© Working Order 2026. For entertainment only. No promises or guarantees.</p>
            </div>
          </footer>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-screen overflow-x-hidden overflow-y-auto bg-[#030303] text-white selection:bg-blue-500/30 flex flex-col">
      {/* Paywall Modal */}
      {showPaywall && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="max-w-sm w-full liquid-card p-8 rounded-[2.5rem] text-center border-t-blue-500 border-b-emerald-500">
             <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
               <i className="fas fa-crown text-blue-400 text-2xl"></i>
             </div>
             <h2 className="text-2xl font-black mb-2 tracking-tighter uppercase">Limits Reached</h2>
             <p className="text-gray-400 text-sm mb-6">You've used your {MAX_FREE_USES} free collapses. Upgrade to PRO for unlimited subatomic biological projection.</p>
             
             <div className="bg-white/5 rounded-2xl p-4 mb-6 text-left border border-white/5">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Plan</span>
                  <span className="text-xs font-black text-blue-400">Monthly Pro</span>
                </div>
                <div className="text-2xl font-black">$4.99<span className="text-xs font-normal text-gray-500">/mo</span></div>
             </div>

             <button 
               onClick={simulateCheckout}
               disabled={isProcessingPayment}
               className="w-full py-4 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white font-black rounded-2xl transition-all relative overflow-hidden active:scale-95 disabled:opacity-50"
             >
               {isProcessingPayment ? <i className="fas fa-circle-notch animate-spin"></i> : <span className="flex items-center justify-center gap-2"><i className="fab fa-stripe text-xl"></i> PAY WITH STRIPE</span>}
             </button>
             <button onClick={() => setShowPaywall(false)} className="mt-4 text-[10px] text-gray-500 uppercase font-black tracking-widest hover:text-white transition-colors">Maybe later</button>
          </div>
        </div>
      )}

      {/* Header - Stays at top */}
      <header className="p-4 md:p-8 flex justify-between items-start z-10 shrink-0">
        <div className="group">
          <h1 className="text-2xl md:text-3xl font-black tracking-tighter flex items-center gap-3 cursor-default">
            <span className="bg-blue-600 p-1 rounded-lg group-hover:rotate-12 transition-transform duration-500 shadow-lg shadow-blue-600/30">
              <i className="fas fa-atom"></i>
            </span>
            PROTON<span className="text-blue-500"> FIELD</span> <span className="text-gray-400">Quantum Wave-Collapse Visualizer</span>
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <span className={`w-2 h-2 rounded-full ${isSubscribed ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`}></span>
            <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">
              {isSubscribed ? 'PRO SUBSCRIBER' : `FREE TIER: ${usageCount}/${MAX_FREE_USES} USED`}
            </p>
          </div>
        </div>
        
        <div className="flex gap-4">
          {!isSubscribed && (
            <button 
              onClick={() => setShowPaywall(true)}
              className="liquid-card px-4 py-2 rounded-full border border-blue-500/20 flex items-center gap-2 bg-blue-600/10 hover:bg-blue-600/20 transition-all text-xs font-black text-blue-400 tracking-tighter glow-blue"
            >
              <i className="fas fa-crown"></i> UPGRADE
            </button>
          )}
        </div>
      </header>

      {/* Middle Area - Centered Container for 3D Animations */}
      <main className="flex-1 relative z-0 flex items-center justify-center overflow-hidden">
        {!state.isCollapsed && (
          <div className="w-full h-full relative">
            <AtomScene 
              atomType={selectedAtom} 
              isCollapsing={state.isCollapsing} 
              params={waveParams}
              comfortMode={comfortMode}
            />
          </div>
        )}
      </main>

      {/* Footer/Controls - Stays at bottom */}
      {!state.isCollapsed && (
        <footer className="p-4 md:p-8 shrink-0 w-full max-w-7xl mx-auto z-10">
            <div className="flex flex-wrap gap-4 items-end justify-center md:justify-between w-full">
              {/* Selectors */}
              <div className="flex flex-col gap-3 w-full md:w-auto">
                <div className="liquid-card p-4 rounded-3xl">
                  <p className="text-[10px] text-blue-400/70 uppercase font-black mb-3 tracking-[0.2em]">Atomic Species</p>
                <div className="flex flex-wrap gap-2">
                  {(['Hydrogen', 'Helium', 'Lithium', 'Carbon', 'Oxygen'] as AtomType[]).map(atom => (
                    <button
                      key={atom}
                      onClick={() => setSelectedAtom(atom)}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all border ${
                        selectedAtom === atom 
                          ? 'bg-blue-600 border-blue-400 text-white glow-blue' 
                          : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      {atom.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="liquid-card p-4 rounded-3xl w-full border-blue-500/20">
                <p className="text-[10px] text-blue-400/70 uppercase font-black mb-4 tracking-[0.2em]">Field Strength</p>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-[10px] font-mono mb-1">
                      <span className="text-gray-400">λ SCALE</span>
                      <span className="text-blue-400 font-black">{waveParams.wavelength.toFixed(2)}</span>
                    </div>
                    <input
                      type="range" min="0.5" max="2.5" step="0.05"
                      value={waveParams.wavelength}
                      onChange={(e) => setWaveParams(p => ({ ...p, wavelength: parseFloat(e.target.value) }))}
                      className="w-full accent-blue-600 h-1 bg-white/10 rounded-lg cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] font-mono mb-1">
                      <span className="text-gray-400">Ψ DENSITY</span>
                      <span className="text-blue-400 font-black">{waveParams.amplitude.toFixed(2)}</span>
                    </div>
                    <input
                      type="range" min="0.5" max="2.5" step="0.05"
                      value={waveParams.amplitude}
                      onChange={(e) => setWaveParams(p => ({ ...p, amplitude: parseFloat(e.target.value) }))}
                      className="w-full accent-blue-600 h-1 bg-white/10 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div className="liquid-card p-4 rounded-3xl space-y-3">
                <p className="text-[10px] text-blue-300 uppercase font-black tracking-[0.2em]">Comfort + Selfie Imprint</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setComfortMode(c => !c)}
                    className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border ${comfortMode ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'}`}
                  >
                    Comfort Mode: {comfortMode ? 'On' : 'Off'}
                  </button>
                  <p className="text-[11px] text-gray-500">Softens motion/glow for gentler viewing.</p>
                </div>
                <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] uppercase font-black tracking-[0.2em] text-gray-300">Selfie Merge (optional)</p>
                    {selfieData && (
                      <button className="text-[10px] text-red-400 uppercase font-black" onClick={() => setSelfieData(null)}>Clear</button>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400 mb-2">Uploads your face to blend onto the generated subject. Sent to the image API only for generation and deleted immediately after a successful render.</p>
                  <label className="flex items-center gap-2 text-[11px] text-gray-300 mb-2">
                    <input
                      type="checkbox"
                      checked={selfieConsent}
                      onChange={(e) => {
                        setSelfieConsent(e.target.checked);
                        if (!e.target.checked) {
                          setSelfieData(null);
                          setSelfieUrl('');
                        }
                      }}
                      className="accent-blue-500"
                    />
                    I consent to send my selfie to the image API for one-time generation.
                  </label>
                  <input
                    type="url"
                    placeholder="Optional: paste a public image URL (recommended for img2img)"
                    value={selfieUrl}
                    onChange={(e) => setSelfieUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-[11px] text-gray-200 placeholder:text-gray-500 mb-2"
                    disabled={!selfieConsent}
                  />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleSelfieUpload(e.target.files?.[0] || null)}
                    className="text-[11px] text-gray-300"
                    disabled={!selfieConsent}
                  />
                  {(selfieUrl.trim() || selfieData) && <p className="text-[11px] text-emerald-400 mt-1">Selfie attached.</p>}
                  {!selfieData && !selfieConsent && <p className="text-[11px] text-gray-500 mt-1">Enable consent to attach a photo.</p>}
                </div>
              </div>
            </div>

            {/* Trigger */}
            <div className="w-full md:w-64">
              <button
                onClick={handleCollapse}
                disabled={state.isCollapsing}
                className={`liquid-card w-full py-5 rounded-3xl text-[10px] uppercase font-bold tracking-widest transition-all relative overflow-hidden active:scale-95 group glow-blue ${
                  state.isCollapsing 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:bg-white/10'
                }`}
              >
                {state.isCollapsing ? (
                  <span className="flex items-center justify-center gap-2">
                    <i className="fas fa-circle-notch animate-spin text-blue-500"></i>
                    DECOHERING...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <i className="fas fa-compress-alt"></i> COLLAPSE WAVE
                  </span>
                )}
              </button>
              {state.error && <p className="text-[10px] text-red-500 font-bold text-center mt-2 animate-bounce">{state.error}</p>}
            </div>
          </div>
        </footer>
      )}

      {/* Result View Overlay */}
      {state.isCollapsed && (
        <div className="absolute inset-0 z-50 bg-[#030303] flex items-center justify-center p-4 md:p-8 overflow-y-auto animate-in fade-in zoom-in duration-700">
          <div className="max-w-7xl w-full grid md:grid-cols-2 gap-8 md:gap-16 items-center">
            {/* Visual */}
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-tr from-blue-600 to-emerald-400 rounded-[3rem] blur-2xl opacity-10"></div>
              <div className="relative liquid-card rounded-[3rem] overflow-hidden aspect-video shadow-2xl bg-black">
                {state.collapsedImage ? (
                  <img src={state.collapsedImage} alt="Manifestation" className="w-full h-full object-cover animate-in fade-in duration-1000" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 gap-4">
                    <i className="fas fa-spinner animate-spin text-4xl text-blue-500"></i>
                    <p className="font-mono text-xs uppercase tracking-widest">Stabilizing Phase...</p>
                  </div>
                )}
                <div className="absolute top-4 left-4 bg-blue-600/90 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md">
                   PROJECTION: {selectedEntity}
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="space-y-6 md:space-y-10">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="h-[2px] w-12 bg-blue-500"></span>
                  <span className="text-blue-500 font-black text-sm tracking-[0.3em] uppercase">Observation Success</span>
                </div>
                <h2 className="text-5xl md:text-7xl font-black tracking-tighter mt-2 leading-none uppercase">
                  Wave<br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-emerald-400">COLLAPSE</span>
                </h2>
              </div>

              <div className="liquid-card p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <i className="fas fa-microchip text-6xl"></i>
                </div>
                <p className="text-lg md:text-2xl text-gray-100 leading-relaxed font-light italic">"{state.explanation}"</p>
              </div>

              <div className="grid grid-cols-3 gap-4 md:gap-6">
                <div className="liquid-card p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem]">
                  <p className="text-[10px] text-gray-500 uppercase font-black mb-1 md:mb-2 tracking-widest">Coherence</p>
                  <p className="text-sm md:text-xl font-black text-white">Stable</p>
                </div>
                <div className="liquid-card p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem]">
                  <p className="text-[10px] text-gray-500 uppercase font-black mb-1 md:mb-2 tracking-widest">Purity</p>
                  <p className="text-sm md:text-xl font-black text-emerald-400">99%</p>
                </div>
                <div className="liquid-card p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem]">
                  <p className="text-[10px] text-gray-500 uppercase font-black mb-1 md:mb-2 tracking-widest">Modality</p>
                  <p className="text-sm md:text-xl font-black text-blue-400">High</p>
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={resetExperiment}
                  className="flex-1 py-4 md:py-5 bg-white text-black font-black rounded-[1.5rem] md:rounded-[2rem] hover:bg-blue-50 transition-all active:scale-95 shadow-xl"
                >
                  NEW EXPERIMENT
                </button>
                <button 
                  className="px-6 md:px-10 py-4 md:py-5 liquid-card text-white font-black rounded-[1.5rem] md:rounded-[2rem] active:scale-95 flex items-center justify-center group disabled:opacity-50"
                  onClick={downloadImage}
                  disabled={!state.collapsedImage}
                >
                  <i className="fas fa-download text-lg group-hover:scale-125 transition-transform"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Aesthetic Scientific Overlays */}
      <div className="fixed inset-0 pointer-events-none border-[10px] border-[#030303] z-40 opacity-50"></div>
    </div>
  );
};

export default App;
