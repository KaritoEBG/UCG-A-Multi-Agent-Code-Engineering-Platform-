import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import UserMenu from '../components/UserMenu';
import './LandingPage.css';

/* =========================================
   ICONS & ASSETS
   ========================================= */
const UCGLogo = ({ size = 32, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className}>
    <defs>
      <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#818cf8" />
        <stop offset="100%" stopColor="#c084fc" />
      </linearGradient>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    <rect width="40" height="40" rx="12" fill="url(#logoGrad)" fillOpacity="0.15" stroke="url(#logoGrad)" strokeWidth="1" />
    <path d="M12 14L20 10L28 14V22L20 26L12 22V14Z" stroke="url(#logoGrad)" strokeWidth="1.5" fill="none" opacity="0.6" />
    <path d="M14 16L20 13L26 16V21L20 24L14 21V16Z" stroke="url(#logoGrad)" strokeWidth="1.5" fill="none" opacity="0.9" />
    <path d="M16 18L20 16L24 18V20.5L20 22.5L16 20.5V18Z" fill="url(#logoGrad)" filter="url(#glow)" />
    <circle cx="20" cy="19" r="1.5" fill="currentColor" className="text-slate-900 dark:text-white" />
  </svg>
);

const Icons = {
  Terminal: () => <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" /></svg>,
  CheckCircle: () => <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>,
  Activity: () => <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" /></svg>,
  Shield: () => <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" /></svg>,
  Bolt: () => <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" /></svg>,
  Layers: () => <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" /></svg>,
  Eye: () => <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>,
  Server: () => <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 0 1-3-3m3 3a3 3 0 1 0 0 6h13.5a3 3 0 1 0 0-6m-16.5-3a3 3 0 0 1 3-3h13.5a3 3 0 0 1 3 3m-19.5 0a4.5 4.5 0 0 1 .9-2.7L5.737 5.1a3.375 3.375 0 0 1 2.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 0 1 .9 2.7m0 0a3 3 0 0 1-3 3m0 3h.008v.008h-.008v-.008Zm0-6h.008v.008h-.008v-.008Zm-3 6h.008v.008h-.008v-.008Zm0-6h.008v.008h-.008v-.008Z" /></svg>,
  Sun: () => <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" /></svg>,
  Moon: () => <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" /></svg>,
};

/* =========================================
   ANIMATION COMPONENTS
   ========================================= */
const ParticleBackground = ({ isDarkMode }) => {
  const canvasRef = useRef(null);
  const themeRef = useRef(isDarkMode);
  useEffect(() => { themeRef.current = isDarkMode; }, [isDarkMode]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId, particles = [];
    const resize = () => { canvas.width = window.innerWidth; canvas.height = Math.max(document.body.scrollHeight, window.innerHeight); };
    window.addEventListener('resize', resize); resize();
    let mouse = { x: null, y: null, radius: 120 };
    const onMove = (e) => { mouse.x = e.x; mouse.y = e.y; };
    const onLeave = () => { mouse.x = null; mouse.y = null; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseout', onLeave);
    class P {
      constructor() { this.x = Math.random()*canvas.width; this.y = Math.random()*canvas.height; this.s = Math.random()*1.5+0.5; this.d = Math.random()*30+1; this.vx = (Math.random()-0.5)*0.5; this.vy = (Math.random()-0.5)*0.5; }
      draw() { ctx.fillStyle = themeRef.current ? 'rgba(129,140,248,0.4)' : 'rgba(99,102,241,0.3)'; ctx.beginPath(); ctx.arc(this.x,this.y,this.s,0,Math.PI*2); ctx.fill(); }
      update() {
        this.x += this.vx; this.y += this.vy;
        if (this.x<0||this.x>canvas.width) this.vx=-this.vx;
        if (this.y<0||this.y>canvas.height) this.vy=-this.vy;
        if (mouse.x!=null) { let dx=mouse.x-this.x,dy=mouse.y-this.y,dist=Math.sqrt(dx*dx+dy*dy); if(dist<mouse.radius){let f=(mouse.radius-dist)/mouse.radius; this.x-=(dx/dist)*f*this.d; this.y-=(dy/dist)*f*this.d;}}
      }
    }
    const init = () => { particles=[]; for(let i=0;i<Math.floor((canvas.width*canvas.height)/10000);i++) particles.push(new P()); };
    const animate = () => {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      for(let i=0;i<particles.length;i++){particles[i].update();particles[i].draw();for(let j=i;j<particles.length;j++){let dx=particles[i].x-particles[j].x,dy=particles[i].y-particles[j].y,dist=Math.sqrt(dx*dx+dy*dy);if(dist<120){ctx.beginPath();ctx.strokeStyle=themeRef.current?`rgba(129,140,248,${0.15-dist/800})`:`rgba(99,102,241,${0.15-dist/800})`;ctx.lineWidth=1;ctx.moveTo(particles[i].x,particles[i].y);ctx.lineTo(particles[j].x,particles[j].y);ctx.stroke();}}}
      animId = requestAnimationFrame(animate);
    };
    init(); animate();
    return () => { window.removeEventListener('resize',resize); window.removeEventListener('mousemove',onMove); window.removeEventListener('mouseout',onLeave); cancelAnimationFrame(animId); };
  }, []);
  return <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full z-[1] pointer-events-none opacity-30 md:opacity-60 dark:mix-blend-screen transition-opacity duration-500" />;
};

const PremiumPipelineAnimation = () => {
  const t1="M -100 450 C 300 450, 400 150, 720 150 C 1040 150, 1140 450, 1540 450";
  const t2="M -100 490 C 320 490, 420 190, 720 190 C 1020 190, 1120 490, 1540 490";
  const t3="M -100 530 C 340 530, 440 230, 720 230 C 1000 230, 1100 530, 1540 530";
  return (
    <div className="fixed inset-0 w-full h-screen pointer-events-none z-0 overflow-hidden opacity-40 md:opacity-80 dark:opacity-60 dark:md:opacity-100 transition-opacity duration-500">
      {/* Mobile: shift viewBox to show only center portion */}
      <svg viewBox="0 0 1440 800" className="hidden md:block w-full h-full" preserveAspectRatio="none">
        <defs>
          <filter id="premium-glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="10" result="blur"/><feComposite in="SourceGraphic" in2="blur" operator="over"/></filter>
          <linearGradient id="comet-gradient" x1="100%" y1="0%" x2="0%" y2="0%"><stop offset="0%" stopColor="#a855f7"/><stop offset="50%" stopColor="#6366f1"/><stop offset="100%" stopColor="transparent"/></linearGradient>
        </defs>
        <g className="text-slate-300/40 dark:text-white/5"><path d={t1} stroke="currentColor" strokeWidth="48" strokeLinecap="round" fill="none"/><path d={t2} stroke="currentColor" strokeWidth="32" strokeLinecap="round" fill="none"/><path d={t3} stroke="currentColor" strokeWidth="24" strokeLinecap="round" fill="none"/></g>
        <g className="text-indigo-400/40 dark:text-indigo-500/20"><path d={t1} stroke="currentColor" strokeWidth="2" fill="none"/><path d={t2} stroke="currentColor" strokeWidth="2" fill="none"/><path d={t3} stroke="currentColor" strokeWidth="2" fill="none"/></g>
        <motion.path d={t1} stroke="url(#comet-gradient)" strokeWidth="6" strokeLinecap="round" fill="none" initial={{pathLength:0,pathOffset:1}} animate={{pathLength:0.15,pathOffset:0}} transition={{duration:1.5,repeat:Infinity,ease:"linear"}} filter="url(#premium-glow)"/>
        <motion.path d={t2} stroke="url(#comet-gradient)" strokeWidth="4" strokeLinecap="round" fill="none" initial={{pathLength:0,pathOffset:1}} animate={{pathLength:0.2,pathOffset:0}} transition={{duration:1.2,repeat:Infinity,ease:"linear",delay:0.3}} filter="url(#premium-glow)"/>
        <motion.path d={t3} stroke="url(#comet-gradient)" strokeWidth="3" strokeLinecap="round" fill="none" initial={{pathLength:0,pathOffset:1}} animate={{pathLength:0.1,pathOffset:0}} transition={{duration:2,repeat:Infinity,ease:"linear",delay:0.8}} filter="url(#premium-glow)"/>
        <g filter="url(#premium-glow)">
          <g transform="translate(250,450)"><circle r="14" className="fill-slate-100 dark:fill-[#0f172a] stroke-indigo-400 dark:stroke-indigo-500" strokeWidth="4"/><circle r="22" fill="none" className="stroke-indigo-400/50 dark:stroke-indigo-500/80 animate-[spin_2s_linear_infinite]" strokeWidth="1.5" strokeDasharray="4 6"/></g>
          <g transform="translate(560,250)"><circle r="14" className="fill-slate-100 dark:fill-[#0f172a] stroke-purple-400 dark:stroke-purple-500" strokeWidth="4"/><circle r="24" fill="none" className="stroke-purple-400/50 dark:stroke-purple-500/80 animate-[spin_1.5s_linear_infinite]" strokeWidth="1.5" strokeDasharray="8 4"/></g>
          <g transform="translate(880,150)"><circle r="14" className="fill-slate-100 dark:fill-[#0f172a] stroke-emerald-400 dark:stroke-emerald-500" strokeWidth="4"/><circle r="22" fill="none" className="stroke-emerald-400/50 dark:stroke-emerald-500/80 animate-[spin_2.5s_linear_reverse_infinite]" strokeWidth="1.5" strokeDasharray="4 8"/></g>
          <g transform="translate(1140,400)"><circle r="14" className="fill-slate-100 dark:fill-[#0f172a] stroke-amber-400 dark:stroke-amber-500" strokeWidth="4"/><circle r="26" fill="none" className="stroke-amber-400/50 dark:stroke-amber-500/80 animate-[spin_2s_linear_infinite]" strokeWidth="1.5" strokeDasharray="10 6"/></g>
        </g>
      </svg>
      {/* Mobile: cropped to center, only showing the convergence area */}
      <svg viewBox="360 50 720 700" className="block md:hidden w-full h-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <filter id="premium-glow-m" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="8" result="blur"/><feComposite in="SourceGraphic" in2="blur" operator="over"/></filter>
          <linearGradient id="comet-gradient-m" x1="100%" y1="0%" x2="0%" y2="0%"><stop offset="0%" stopColor="#a855f7"/><stop offset="50%" stopColor="#6366f1"/><stop offset="100%" stopColor="transparent"/></linearGradient>
        </defs>
        <g className="text-slate-300/40 dark:text-white/5"><path d={t1} stroke="currentColor" strokeWidth="48" strokeLinecap="round" fill="none"/><path d={t2} stroke="currentColor" strokeWidth="32" strokeLinecap="round" fill="none"/><path d={t3} stroke="currentColor" strokeWidth="24" strokeLinecap="round" fill="none"/></g>
        <g className="text-indigo-400/40 dark:text-indigo-500/20"><path d={t1} stroke="currentColor" strokeWidth="2" fill="none"/><path d={t2} stroke="currentColor" strokeWidth="2" fill="none"/><path d={t3} stroke="currentColor" strokeWidth="2" fill="none"/></g>
        <motion.path d={t1} stroke="url(#comet-gradient-m)" strokeWidth="5" strokeLinecap="round" fill="none" initial={{pathLength:0,pathOffset:1}} animate={{pathLength:0.15,pathOffset:0}} transition={{duration:1.5,repeat:Infinity,ease:"linear"}} filter="url(#premium-glow-m)"/>
        <motion.path d={t2} stroke="url(#comet-gradient-m)" strokeWidth="3" strokeLinecap="round" fill="none" initial={{pathLength:0,pathOffset:1}} animate={{pathLength:0.2,pathOffset:0}} transition={{duration:1.2,repeat:Infinity,ease:"linear",delay:0.3}} filter="url(#premium-glow-m)"/>
        <motion.path d={t3} stroke="url(#comet-gradient-m)" strokeWidth="2.5" strokeLinecap="round" fill="none" initial={{pathLength:0,pathOffset:1}} animate={{pathLength:0.1,pathOffset:0}} transition={{duration:2,repeat:Infinity,ease:"linear",delay:0.8}} filter="url(#premium-glow-m)"/>
        <g filter="url(#premium-glow-m)">
          <g transform="translate(560,250)"><circle r="12" className="fill-slate-100 dark:fill-[#0f172a] stroke-purple-400 dark:stroke-purple-500" strokeWidth="3.5"/><circle r="20" fill="none" className="stroke-purple-400/50 dark:stroke-purple-500/80 animate-[spin_1.5s_linear_infinite]" strokeWidth="1.5" strokeDasharray="8 4"/></g>
          <g transform="translate(720,155)"><circle r="12" className="fill-slate-100 dark:fill-[#0f172a] stroke-emerald-400 dark:stroke-emerald-500" strokeWidth="3.5"/><circle r="18" fill="none" className="stroke-emerald-400/50 dark:stroke-emerald-500/80 animate-[spin_2.5s_linear_reverse_infinite]" strokeWidth="1.5" strokeDasharray="4 8"/></g>
          <g transform="translate(880,250)"><circle r="12" className="fill-slate-100 dark:fill-[#0f172a] stroke-amber-400 dark:stroke-amber-500" strokeWidth="3.5"/><circle r="20" fill="none" className="stroke-amber-400/50 dark:stroke-amber-500/80 animate-[spin_2s_linear_infinite]" strokeWidth="1.5" strokeDasharray="10 6"/></g>
        </g>
      </svg>
    </div>
  );
};

const Reveal = ({ children, delay=0, y=40, className="" }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once:true, margin:"-100px" });
  return <motion.div ref={ref} initial={{opacity:0,y,filter:"blur(12px)"}} animate={inView?{opacity:1,y:0,filter:"blur(0px)"}:{}} transition={{duration:0.8,delay,ease:[0.16,1,0.3,1]}} className={className}>{children}</motion.div>;
};

const SlideIn = ({ children, direction="left", delay=0, className="" }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once:true, margin:"-100px" });
  return <motion.div ref={ref} initial={{opacity:0,x:direction==="left"?-80:80}} animate={inView?{opacity:1,x:0}:{}} transition={{duration:0.8,delay,ease:[0.16,1,0.3,1]}} className={className}>{children}</motion.div>;
};

const TimelineStepItem = ({ step, i }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { margin:"-45% 0px -45% 0px", once:false });
  return (
    <div ref={ref} className="relative flex items-center gap-4 sm:gap-6 md:gap-8 mb-5 sm:mb-8 pl-1 sm:pl-2 group cursor-default">
      <div className={`w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full border-2 flex items-center justify-center text-sm sm:text-base font-bold z-10 shrink-0 transition-all duration-500 ease-out group-hover:scale-110 group-hover:shadow-[0_0_25px_rgba(99,102,241,0.6)] ${inView?'bg-indigo-600 border-indigo-400 text-white shadow-[0_0_20px_rgba(99,102,241,0.6)] scale-110':'bg-slate-100 dark:bg-[#0a0a0f] border-slate-300 dark:border-white/10 text-slate-400 dark:text-slate-600 scale-100 group-hover:border-indigo-400 group-hover:text-indigo-500 dark:group-hover:text-indigo-400'}`}>{i+1}</div>
      <div className={`p-3 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl flex-1 transition-all duration-500 ease-out border overflow-hidden relative backdrop-blur-md ${inView?'bg-indigo-50/70 dark:bg-[#12121a]/90 border-indigo-300 dark:border-indigo-500/50 shadow-lg dark:shadow-[0_0_30px_rgba(99,102,241,0.15)] scale-[1.02]':'bg-white/60 dark:bg-[#0a0a0f]/60 border-slate-200 dark:border-white/5 opacity-80 dark:opacity-60 scale-100 group-hover:opacity-100 group-hover:border-indigo-500/30'}`}>
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 to-indigo-500/0 group-hover:from-indigo-500/5 dark:group-hover:from-indigo-500/10 transition-colors duration-500 pointer-events-none"/>
        <p className={`relative z-10 text-sm sm:text-base md:text-lg font-medium transition-colors duration-500 ${inView?'text-slate-900 dark:text-white':'text-slate-600 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200'}`}>{step}</p>
      </div>
    </div>
  );
};

/* TYPEWRITER */
const RotatingPromptTypewriter = () => {
  const prompts = ["Build a REST API with auth and rate limiting in FastAPI...","Create a React dashboard with Framer Motion and Tailwind...","Generate a Node.js microservice for Stripe payments...","Write a Python script to scrape and aggregate news data..."];
  const [text,setText] = useState('');
  const [idx,setIdx] = useState(0);
  const [del,setDel] = useState(false);
  useEffect(() => {
    const cur = prompts[idx]; let t;
    if(del){t=text.length>0?setTimeout(()=>setText(text.slice(0,-1)),20):undefined;if(text.length===0){setDel(false);setIdx(p=>(p+1)%prompts.length);}}
    else{t=text.length<cur.length?setTimeout(()=>setText(cur.slice(0,text.length+1)),40):setTimeout(()=>setDel(true),2000);}
    return()=>clearTimeout(t);
  },[text,del,idx,prompts]);
  return <div className="relative font-mono text-sm sm:text-base md:text-xl lg:text-2xl text-left inline-flex"><span className="text-indigo-600 dark:text-indigo-300 font-semibold">{text}</span><span className="animate-blink text-indigo-500 dark:text-indigo-400 font-light -ml-1">|</span></div>;
};

const TypewriterTerminal = ({ lines }) => {
  const [li,setLi] = useState(0);
  const [ci,setCi] = useState(0);
  useEffect(()=>{setLi(0);setCi(0);},[lines]);
  useEffect(()=>{
    if(li>=lines.length) return;
    const cur=lines[li]; if(!cur) return;
    const d=cur.text.startsWith('//')||cur.text===''?100:12;
    const t=setTimeout(()=>{if(ci<cur.text.length)setCi(p=>p+1);else{setLi(p=>p+1);setCi(0);}},d);
    return()=>clearTimeout(t);
  },[li,ci,lines]);
  const shown=lines.slice(0,li), cur=lines[li];
  return (
    <div className="font-mono text-sm leading-relaxed text-left">
      {shown.map((l,i)=><div key={i} className={`flex ${l.color||'text-slate-300'}`}><span className="w-8 shrink-0 text-slate-600 select-none opacity-50">{i+1}</span><span className="whitespace-pre-wrap break-all">{l.text}</span></div>)}
      {li<lines.length&&cur&&<div className={`flex ${cur.color||'text-slate-300'}`}><span className="w-8 shrink-0 text-slate-600 select-none opacity-50">{li+1}</span><span className="whitespace-pre-wrap break-all">{cur.text.substring(0,ci)}<span className="inline-block w-2 h-4 bg-indigo-400 ml-1 align-middle animate-pulse"/></span></div>}
      {li>=lines.length&&<div className="flex text-slate-300 mt-2"><span className="w-8 shrink-0 text-slate-600 select-none opacity-50">{lines.length+1}</span><span className="inline-block w-2 h-4 bg-indigo-400 ml-1 align-middle animate-pulse"/></div>}
    </div>
  );
};

/* DATA */
const diffCards = [
  {color:'indigo',icon:Icons.Layers,title:'Not a chatbot',desc:"It's a pipeline. Every output passes through 4 autonomous quality gates before it ever reaches you."},
  {color:'purple',icon:Icons.Server,title:'Not single-file',desc:"Generates complete project structures with proper separation of concerns, entry points, configs, and utilities."},
  {color:'emerald',icon:Icons.Eye,title:'Not blind',desc:"Users watch agents work in real-time. Live SSE streaming displays exactly what each agent is evaluating and fixing."},
  {color:'amber',icon:Icons.Bolt,title:'Not slow',desc:"Powered by Groq LPU inference. Generates tokens at roughly 10\u00d7 the speed of standard GPU-based alternatives."}
];

const agents = [
  {id:'gen',icon:Icons.Terminal,title:'Code Generation Engine',sub:'Groq LPU-accelerated inference',desc:'Accepts natural language prompts and translates them into multi-file, structured code. Powered by Groq LPU for sub-second inference \u2014 roughly 10\u00d7 faster than GPU alternatives.',cmd:'>_ generator.agent',lines:[{text:'$ Analyzing prompt framework...',color:'text-slate-400'},{text:'initializing Groq LPU inference pipeline...',color:'text-indigo-400'},{text:'generating project structure and files...',color:'text-indigo-400'},{text:''},{text:'def create_app() -> FastAPI:',color:'text-white'},{text:'    app = FastAPI(title="Generated Project")',color:'text-blue-300'},{text:'    app.include_router(auth_router)',color:'text-blue-300'},{text:'    return app',color:'text-pink-400'},{text:''},{text:'\u2713 Complete project structure generated in 0.92s',color:'text-emerald-400'}]},
  {id:'val',icon:Icons.CheckCircle,title:'Validation Pipeline',sub:'AST-level linting & auto-fix',desc:'Performs static analysis, AST-level linting, and structural validation on every generated file. Auto-fixes issues before the user sees the output.',cmd:'>_ validator.agent',lines:[{text:'$ Running AST structural analysis...',color:'text-slate-400'},{text:'linting against project consistency rules...',color:'text-purple-400'},{text:''},{text:'\u26a0  Code smell detected: Unused import in utils.py',color:'text-yellow-400'},{text:'\u26a0  Style issue: Missing return type hint in main.py:12',color:'text-yellow-400'},{text:'Applying automatic fixes...',color:'text-slate-300'},{text:'+ def get_db(...) -> Session:',color:'text-emerald-400'},{text:''},{text:'\u2713 Issues resolved. Code style enforced.',color:'text-emerald-400'}]},
  {id:'test',icon:Icons.Activity,title:'Testing Framework',sub:'Auto-generates unit tests',desc:'Auto-generates unit tests tailored to the generated code. Executes tests in-pipeline and reports coverage metrics.',cmd:'>_ tester.agent',lines:[{text:'$ Generating unit tests for all endpoints...',color:'text-slate-400'},{text:'executing isolated test suite...',color:'text-emerald-400'},{text:''},{text:'test_user_registration ... ok',color:'text-slate-300'},{text:'test_rate_limit_exceeded ... ok',color:'text-slate-300'},{text:'test_invalid_token_rejection ... ok',color:'text-slate-300'},{text:''},{text:'Ran 24 tests in 1.205s',color:'text-white'},{text:''},{text:'\u2713 Coverage: 96.5% (Edge cases covered)',color:'text-emerald-400'}]},
  {id:'sec',icon:Icons.Shield,title:'Security Scanner',sub:'CVE-aware dependency auditing',desc:'Scans for injection attacks, dependency vulnerabilities, and insecure patterns. Auto-patches security issues before final delivery.',cmd:'>_ security.agent',lines:[{text:'$ Initiating deep vulnerability scan...',color:'text-slate-400'},{text:'scanning dependencies for CVEs...',color:'text-rose-400'},{text:'analyzing AST for injection vulnerabilities...',color:'text-rose-400'},{text:''},{text:'\u26a0  Risk: Hardcoded environment variable detected',color:'text-rose-400'},{text:'Auto-patching secure configurations...',color:'text-slate-300'},{text:'- JWT_SECRET = "my_dev_secret"',color:'text-rose-400'},{text:'+ JWT_SECRET = os.getenv("JWT_SECRET")',color:'text-emerald-400'},{text:''},{text:'\u2713 Security audit passed. Artifact is production-ready.',color:'text-emerald-400'}]}
];

/* MAIN */
const LandingPage = () => {
  const { isAuthenticated } = useAuth();
  const [activeAgent, setActiveAgent] = useState(0);
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('ucg-theme');
    return saved ? saved === 'dark' : true;
  });

  const toggleTheme = () => {
    setIsDark(prev => {
      const next = !prev;
      localStorage.setItem('ucg-theme', next ? 'dark' : 'light');
      return next;
    });
  };

  return (
    <div className={isDark?'dark':''}>
      <div className="landing-page-root relative min-h-screen bg-slate-50 dark:bg-[#030305] text-slate-900 dark:text-slate-200 font-sans overflow-x-hidden transition-colors duration-500">
        <div className="fixed inset-0 z-0 pointer-events-none"><div className="absolute inset-0 bg-grid opacity-60"/><div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] md:w-[1000px] h-[300px] md:h-[600px] bg-indigo-500/10 dark:bg-indigo-600/10 blur-[80px] md:blur-[120px] rounded-full"/><div className="absolute top-[2000px] left-[-200px] w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-purple-500/10 dark:bg-purple-600/10 blur-[100px] md:blur-[150px] rounded-full"/></div>
        <ParticleBackground isDarkMode={isDark}/>

        {/* NAV */}
        <motion.nav initial={{y:-30,opacity:0}} animate={{y:0,opacity:1}} transition={{duration:0.8,ease:"easeOut"}} className="fixed top-3 md:top-6 inset-x-0 mx-auto z-50 w-[96%] max-w-5xl rounded-2xl md:rounded-full border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-white/[0.02] backdrop-blur-2xl px-4 md:px-6 py-2.5 md:py-3 flex items-center justify-between shadow-sm dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-colors duration-500">
          <Link to="/" className="flex items-center gap-3 text-slate-900 dark:text-white font-bold tracking-wide"><UCGLogo size={28}/><span className="hidden sm:inline-block">UCG</span></Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600 dark:text-slate-400">
            <a href="#differentiators" className="hover:text-indigo-600 dark:hover:text-white transition-colors">Why UCG?</a>
            <a href="#pipeline" className="hover:text-indigo-600 dark:hover:text-white transition-colors">Agents</a>
            <a href="#how-it-works" className="hover:text-indigo-600 dark:hover:text-white transition-colors">How it works</a>
            <a href="#about" className="hover:text-indigo-600 dark:hover:text-white transition-colors">About</a>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
            <button onClick={toggleTheme} className="p-1.5 sm:p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 transition-colors text-slate-500 dark:text-slate-300 shrink-0" aria-label="Toggle Theme">{isDark?<Icons.Sun/>:<Icons.Moon/>}</button>
            {isAuthenticated?(<><Link to="/chat" className="inline-flex items-center justify-center text-xs sm:text-sm font-bold bg-slate-900 dark:bg-white text-white dark:text-black px-3 sm:px-5 h-7 sm:h-9 rounded-full hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0 leading-none">Open Editor</Link><UserMenu/></>):(<><Link to="/login" className="inline-flex items-center justify-center text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 h-7 sm:h-9 leading-none">Sign In</Link><Link to="/chat" className="inline-flex items-center justify-center text-xs sm:text-sm font-bold bg-slate-900 dark:bg-white text-white dark:text-black px-3 sm:px-6 h-7 sm:h-9 rounded-full hover:scale-105 active:scale-95 transition-transform shadow-[0_0_20px_rgba(0,0,0,0.1)] dark:shadow-[0_0_20px_rgba(255,255,255,0.1)] whitespace-nowrap shrink-0 leading-none">Start Building</Link></>)}
          </div>
        </motion.nav>

        <main className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 pt-24 sm:pt-32 md:pt-40 pb-16 sm:pb-24 md:pb-32">
          {/* HERO */}
          <section className="flex flex-col items-center text-center pb-8 sm:pb-12 md:pb-16 pt-4 sm:pt-6 md:pt-10 relative z-20">
            <PremiumPipelineAnimation/>
            <Reveal y={20}><div className="inline-flex items-center gap-2 px-3 sm:px-5 py-1.5 sm:py-2 rounded-full border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 text-[10px] sm:text-xs font-bold tracking-widest uppercase mb-6 sm:mb-10 shadow-sm transition-colors"><span className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-indigo-500 dark:bg-indigo-400 animate-pulse"/>Multi-Agent Code Engineering Platform</div></Reveal>
            <Reveal delay={0.1} y={30}><h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-[80px] font-extrabold tracking-tight text-slate-900 dark:text-white mb-4 sm:mb-6 leading-[1.1] sm:leading-[1.05] relative z-10 drop-shadow-sm dark:drop-shadow-[0_0_30px_rgba(0,0,0,0.8)]">Ship production code <br className="hidden sm:block"/><span className="text-gradient">with AI agents.</span></h1></Reveal>
            <Reveal delay={0.2} y={30}><p className="text-sm sm:text-base md:text-lg lg:text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto mb-6 sm:mb-8 leading-relaxed relative z-10 font-medium px-2 sm:px-0">Describe what you want. Watch four specialized agents generate, validate, test, and secure your code live through an orchestrated DAG pipeline.</p></Reveal>
            <Reveal delay={0.3} y={30} className="w-full max-w-4xl mx-auto mb-8 sm:mb-12 px-1 sm:px-0"><div className="rounded-xl sm:rounded-2xl border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-black/60 backdrop-blur-xl p-4 sm:p-6 md:p-8 shadow-xl dark:shadow-[0_0_40px_rgba(0,0,0,0.6)] flex items-center justify-center min-h-[80px] sm:min-h-[120px] md:min-h-[140px] text-center hover:-translate-y-2 hover:shadow-2xl transition-all duration-500 cursor-default relative z-10"><span className="text-slate-400 dark:text-slate-500 font-mono text-xl mr-4 hidden md:inline-block">{'>'}</span><RotatingPromptTypewriter/></div></Reveal>
            <Reveal delay={0.4} y={30}><div className="flex flex-col items-center justify-center gap-3 sm:gap-4 relative z-10 w-full px-4 sm:px-0"><Link to="/chat" className="group liquid-glass-btn inline-flex items-center justify-center gap-2 sm:gap-3 w-full sm:w-auto px-8 sm:px-10 py-4 sm:py-5 rounded-full text-base sm:text-lg font-bold text-slate-900 dark:text-white"><span className="relative z-10">Launch Generator</span><svg className="w-5 sm:w-6 h-5 sm:h-6 relative z-10 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/></svg></Link><span className="text-xs sm:text-sm text-slate-500 font-medium text-center">No credit card required. Try 1 free generation.</span></div></Reveal>
          </section>

          {/* DIFFERENTIATORS */}
          <section id="differentiators" className="py-12 sm:py-16 md:py-24 border-t border-slate-200 dark:border-white/5 relative overflow-hidden">
            <Reveal><div className="text-center mb-8 sm:mb-12 md:mb-16 max-w-3xl mx-auto px-4 sm:px-6"><h2 className="text-xs sm:text-sm font-bold tracking-widest text-indigo-500 dark:text-indigo-400 uppercase mb-2 sm:mb-3">Core Value Proposition</h2><h3 className="text-2xl sm:text-3xl md:text-5xl font-extrabold text-slate-900 dark:text-white mb-4 sm:mb-6">Not just generated. <br/>Validated, tested, and secured.</h3><p className="text-sm sm:text-base md:text-lg text-slate-600 dark:text-slate-400">Traditional AI code tools generate raw output and hope for the best. UCG treats code generation as a rigorous pipeline problem.</p></div></Reveal>
            <div className="relative w-full flex items-center overflow-hidden py-8">
              <div className="absolute top-0 left-0 w-16 md:w-48 h-full bg-gradient-to-r from-slate-50 dark:from-[#030305] to-transparent z-10 pointer-events-none"/>
              <div className="absolute top-0 right-0 w-16 md:w-48 h-full bg-gradient-to-l from-slate-50 dark:from-[#030305] to-transparent z-10 pointer-events-none"/>
              <div className="flex animate-marquee w-max gap-6 px-3">
                {[...diffCards,...diffCards,...diffCards,...diffCards].map((c,i)=>{
                  const hm={indigo:'hover:shadow-[0_20px_40px_rgba(99,102,241,0.15)] hover:border-indigo-400 dark:hover:border-indigo-500/40',purple:'hover:shadow-[0_20px_40px_rgba(168,85,247,0.15)] hover:border-purple-400 dark:hover:border-purple-500/40',emerald:'hover:shadow-[0_20px_40px_rgba(16,185,129,0.15)] hover:border-emerald-400 dark:hover:border-emerald-500/40',amber:'hover:shadow-[0_20px_40px_rgba(245,158,11,0.15)] hover:border-amber-400 dark:hover:border-amber-500/40'};
                  const cm={indigo:'text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30',purple:'text-purple-500 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/30',emerald:'text-emerald-500 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30',amber:'text-amber-500 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30'};
                  const Ic=c.icon;
                  return <div key={i} className={`relative w-[260px] sm:w-[300px] md:w-[340px] shrink-0 p-5 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-gradient-to-br dark:from-[#12121a] dark:to-[#050508] transition-all duration-300 ${hm[c.color]} overflow-hidden group cursor-pointer hover:-translate-y-2`}><div className={`relative z-10 w-10 sm:w-12 md:w-14 h-10 sm:h-12 md:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-6 border transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3 ${cm[c.color]}`}><Ic/></div><h4 className="relative z-10 text-lg sm:text-xl md:text-2xl font-bold text-slate-900 dark:text-white mb-2 sm:mb-3 tracking-tight">{c.title}</h4><p className="relative z-10 text-slate-600 dark:text-slate-400 text-xs sm:text-sm leading-relaxed">{c.desc}</p></div>;
                })}
              </div>
            </div>
          </section>

          {/* AGENTS */}
          <section id="pipeline" className="py-12 sm:py-16 md:py-24 relative border-t border-slate-200 dark:border-white/5">
            <Reveal><div className="text-center mb-8 sm:mb-12 md:mb-16 px-4 sm:px-0"><h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white mb-3 sm:mb-4">The Four AI Agents</h2><p className="text-sm sm:text-base md:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">Each agent is responsible for a distinct phase of the software delivery lifecycle — orchestrated through a stateful DAG pipeline.</p></div></Reveal>
            <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-5 sm:gap-8 lg:gap-16 items-center px-2 sm:px-0">
              <div className="w-full lg:w-[45%] flex flex-col gap-3 sm:gap-4 z-10">
                {agents.map((a,i)=>{const act=activeAgent===i;const Ic=a.icon;return(
                  <motion.div key={a.id} onMouseEnter={()=>setActiveAgent(i)} onClick={()=>setActiveAgent(i)} className={`relative p-4 sm:p-5 md:p-6 rounded-2xl sm:rounded-3xl cursor-pointer transition-all duration-300 border ${act?'bg-slate-900 text-white dark:bg-white dark:text-black border-transparent shadow-xl scale-[1.02]':'bg-white dark:bg-[#0a0a0f] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5'}`}>
                    <div className="flex items-start gap-5"><div className={`mt-1 p-3 rounded-2xl ${act?'bg-slate-800 dark:bg-slate-100 text-white dark:text-black shadow-inner':'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white'}`}><Ic/></div><div><h3 className={`font-bold text-xl mb-1 ${act?'text-white dark:text-black':'text-slate-900 dark:text-white'}`}>{a.title}</h3><p className={`text-sm font-semibold mb-3 ${act?'text-indigo-300 dark:text-indigo-600':'text-indigo-500 dark:text-indigo-400'}`}>{a.sub}</p><AnimatePresence>{act&&<motion.p initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}} className="text-sm leading-relaxed overflow-hidden text-slate-300 dark:text-slate-700">{a.desc}</motion.p>}</AnimatePresence></div></div>
                  </motion.div>);})}
              </div>
              <Reveal className="w-full lg:w-[55%] z-10" delay={0.2} y={0}>
                <div className="rounded-2xl sm:rounded-3xl border border-slate-300 dark:border-white/10 bg-[#050508] overflow-hidden shadow-2xl dark:shadow-[0_0_50px_rgba(0,0,0,0.8)] relative min-h-[300px] sm:min-h-[400px] md:min-h-[500px] flex flex-col">
                  <div className="flex items-center gap-2 px-5 py-4 border-b border-white/10 bg-white/5"><div className="flex gap-2"><div className="w-3 h-3 rounded-full bg-red-500/80"/><div className="w-3 h-3 rounded-full bg-yellow-500/80"/><div className="w-3 h-3 rounded-full bg-green-500/80"/></div><AnimatePresence mode="wait"><motion.div key={activeAgent} initial={{opacity:0,y:5}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-5}} className="mx-auto text-xs text-slate-400 font-mono font-semibold tracking-widest uppercase">{agents[activeAgent].cmd}</motion.div></AnimatePresence></div>
                  <div className="flex-1 p-8 relative bg-gradient-to-b from-transparent to-[#030305]/80 overflow-hidden text-slate-300"><AnimatePresence mode="wait"><motion.div key={activeAgent} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.2}}><TypewriterTerminal lines={agents[activeAgent].lines}/></motion.div></AnimatePresence></div>
                </div>
              </Reveal>
            </div>
          </section>

          {/* HOW IT WORKS */}
          <section id="how-it-works" className="py-12 sm:py-16 md:py-24 relative border-t border-slate-200 dark:border-white/5">
            <Reveal><div className="text-center mb-10 sm:mb-16 md:mb-20 px-4 sm:px-0"><h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white mb-3 sm:mb-4">How It Works</h2><p className="text-sm sm:text-base md:text-lg text-slate-600 dark:text-slate-400">The 8-step journey from natural language to production code.</p></div></Reveal>
            <div className="max-w-4xl mx-auto relative px-2 sm:px-0">
              <div className="absolute left-[28px] md:left-[36px] top-4 bottom-10 w-1 bg-gradient-to-b from-indigo-500 via-purple-500 to-transparent rounded-full shadow-[0_0_15px_rgba(99,102,241,0.4)]"/>
              {["User lands on the homepage","Clicks 'Start Building' \u2192 enters the GenUI chat interface","Types a natural language prompt (e.g., 'Build a REST API...')","Code Generation agent produces multi-file code, streamed live","Validation agent automatically lints and fixes issues","Testing agent generates and runs unit tests in-pipeline","Security agent scans for vulnerabilities and patches them","User receives final output: clean code + test results + setup guide"].map((s,i)=><TimelineStepItem key={i} step={s} i={i}/>)}
            </div>
          </section>

          {/* TECH */}
          <section id="tech" className="py-12 sm:py-16 md:py-24 relative border-t border-slate-200 dark:border-white/5">
            <Reveal><div className="text-center mb-8 sm:mb-12 md:mb-16 px-4 sm:px-0"><h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white mb-3 sm:mb-4">Technical Architecture</h2><p className="text-sm sm:text-base md:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">Engineered for low-latency streaming and complex multi-agent orchestration.</p></div></Reveal>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-8 max-w-5xl mx-auto px-2 sm:px-0">
              <SlideIn direction="left"><div className="rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0a0a0f] p-6 sm:p-8 md:p-10 h-full relative overflow-hidden"><div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-[40px]"/><h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-8 border-b border-slate-100 dark:border-white/10 pb-4">Backend Engine</h3><ul className="space-y-6"><li><strong className="text-indigo-600 dark:text-indigo-400 block text-lg">DAG Orchestration</strong><span className="text-slate-600 dark:text-slate-400 text-sm">Stateful multi-agent DAG with conditional routing, parallel execution, and intelligent handoffs.</span></li><li><strong className="text-indigo-600 dark:text-indigo-400 block text-lg">Groq LPU Inference</strong><span className="text-slate-600 dark:text-slate-400 text-sm">Llama 3.3 running on Language Processing Units for sub-second token generation.</span></li><li><strong className="text-indigo-600 dark:text-indigo-400 block text-lg">FastAPI + MongoDB</strong><span className="text-slate-600 dark:text-slate-400 text-sm">Async Python backend with Mongo for session persistence.</span></li></ul></div></SlideIn>
              <SlideIn direction="right"><div className="rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0a0a0f] p-6 sm:p-8 md:p-10 h-full relative overflow-hidden"><div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-[40px]"/><h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-8 border-b border-slate-100 dark:border-white/10 pb-4">Frontend Stack</h3><ul className="space-y-6"><li><strong className="text-purple-600 dark:text-purple-400 block text-lg">AG-UI Protocol</strong><span className="text-slate-600 dark:text-slate-400 text-sm">Agent-Generated UI: Backend agents stream structured data into reactive components.</span></li><li><strong className="text-purple-600 dark:text-purple-400 block text-lg">SSE Streaming</strong><span className="text-slate-600 dark:text-slate-400 text-sm">Server-Sent Events deliver incremental updates with zero polling.</span></li><li><strong className="text-purple-600 dark:text-purple-400 block text-lg">React + Framer Motion</strong><span className="text-slate-600 dark:text-slate-400 text-sm">Split-panel Generative UI with tabbed code blocks and interactive guides.</span></li></ul></div></SlideIn>
            </div>
          </section>

          {/* ABOUT — last section before footer */}
          <section id="about" className="py-12 sm:py-16 md:py-24 relative border-t border-slate-200 dark:border-white/5">
            <Reveal><div className="text-center mb-8 sm:mb-12 md:mb-16 px-4 sm:px-0"><h2 className="text-xs sm:text-sm font-bold tracking-widest text-indigo-500 dark:text-indigo-400 uppercase mb-2 sm:mb-3">About UCG</h2><h3 className="text-2xl sm:text-3xl md:text-5xl font-extrabold text-slate-900 dark:text-white">Built for engineers who <br className="hidden sm:block"/>ship production code.</h3></div></Reveal>
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-5 sm:gap-8 px-2 sm:px-0">
              <Reveal className="lg:col-span-3">
                <div className="relative rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-[#0a0a0f]/80 backdrop-blur-xl p-5 sm:p-8 md:p-10 h-full overflow-hidden">
                  <div className="absolute -top-24 -left-24 w-64 h-64 bg-indigo-500/15 dark:bg-indigo-500/10 rounded-full blur-[60px]"/>
                  <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-purple-500/15 dark:bg-purple-500/10 rounded-full blur-[60px]"/>
                  <div className="relative z-10 space-y-5">
                    <h4 className="text-2xl font-bold text-slate-900 dark:text-white">Why we built this</h4>
                    <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed"><strong className="text-indigo-600 dark:text-indigo-400">UCG</strong> was born from a simple observation: AI coding assistants are fast at generating boilerplate, but lack the quality control pipeline needed for production-ready software.</p>
                    <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed">Instead of relying on a single model to guess the right implementation, we built a <strong className="text-slate-900 dark:text-white">multi-agent pipeline</strong> — specializing Generation, Validation, Testing, and Security as separate agents orchestrated through a stateful DAG.</p>
                    <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed">Powered by Groq LPU inference for sub-second speeds and our custom AG-UI protocol for real-time streaming, UCG brings CI/CD rigor directly into the generative process.</p>
                  </div>
                </div>
              </Reveal>
              <Reveal delay={0.1} className="lg:col-span-2">
                <div className="flex flex-col gap-6 h-full justify-between">
                  {[{num:'4',label:'Specialized AI Agents',sub:'Generator, Validator, Tester, Security'},{num:'10×',label:'Faster Inference',sub:'Groq LPU vs standard GPU'},{num:'96%',label:'Avg Test Coverage',sub:'Auto-generated unit tests'},{num:'<1s',label:'Time to First Token',sub:'Sub-second response latency'}].map((s,i)=>(
                    <div key={i} className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-[#0a0a0f]/60 backdrop-blur-md p-5 flex items-center gap-5 group hover:border-indigo-500/30 hover:shadow-lg dark:hover:shadow-[0_0_20px_rgba(99,102,241,0.1)] transition-all duration-300">
                      <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400 min-w-[3.5rem] text-center">{s.num}</div>
                      <div><p className="font-bold text-slate-900 dark:text-white text-sm">{s.label}</p><p className="text-xs text-slate-500 dark:text-slate-500">{s.sub}</p></div>
                    </div>
                  ))}
                </div>
              </Reveal>
            </div>
          </section>
        </main>

        {/* FOOTER */}
        <footer className="relative z-10 border-t border-slate-200 dark:border-white/10 bg-white dark:bg-black py-6 sm:py-8 md:py-10 mt-8 sm:mt-12 transition-colors duration-500">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6">
            <div className="flex items-center gap-3 text-slate-900 dark:text-white font-bold opacity-80"><UCGLogo size={24}/><span className="text-base tracking-wider">UCG</span></div>
            <p className="text-sm text-slate-500 font-medium tracking-wide">Multi-Agent Code Engineering Platform</p>
            <div className="flex items-center gap-6"><Link to="/login" className="text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">Sign In</Link><Link to="/chat" className="text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">Start Building</Link></div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export { UCGLogo };
export default LandingPage;
