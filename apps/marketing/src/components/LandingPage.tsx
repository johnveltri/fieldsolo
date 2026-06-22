"use client";

import { FormEvent, KeyboardEvent, ReactNode, useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowRight, Check, CheckCircle2, ChevronDown, DollarSign, LayoutDashboard,
  Menu, Sparkles, X,
} from "lucide-react";
import { faqs, jobSourceOptions, SelectOption, trackingToolOptions, tradeOptions } from "../lib/marketing-content";
import styles from "./LandingPage.module.css";

const navItems = [
  ["How it works", "how-it-works"], ["Why FieldSolo", "features"], ["Pricing", "pricing"], ["FAQ", "faq"],
] as const;

const reveal = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};
const stagger = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.1 } } };
const pulse = {
  scale: [1, 1.03, 1],
  boxShadow: ["0px 4px 15px rgba(196, 75, 43, 0.2)", "0px 8px 30px rgba(196, 75, 43, 0.4)", "0px 4px 15px rgba(196, 75, 43, 0.2)"],
};

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function Blueprint({ variant = "grid" }: { variant?: "grid" | "dots" }) {
  return <div aria-hidden className={variant === "grid" ? styles.blueprint : styles.pegboard} />;
}

function NavLink({ id, children, onNavigate }: { id: string; children: ReactNode; onNavigate?: () => void }) {
  return <a href={`#${id}`} onClick={(event) => { event.preventDefault(); onNavigate?.(); scrollToSection(id); }}>{children}</a>;
}

function MultiSelect({ label, name, options, value, onChange }: {
  label: string; name: string; options: SelectOption[]; value: string[]; onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const menuId = useId();
  useEffect(() => {
    const close = (event: MouseEvent) => { if (!box.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close); return () => document.removeEventListener("mousedown", close);
  }, []);
  const toggle = (option: string) => onChange(value.includes(option) ? value.filter((item) => item !== option) : [...value, option]);
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => { if (event.key === "Escape") setOpen(false); };
  const display = value.length === 0 ? `Select ${label.toLowerCase()}...` : value.length === 1 ? options.find((item) => item.value === value[0])?.label : `${value.length} selected`;
  return <div className={styles.selectWrap} ref={box}>
    <input type="hidden" name={name} value={value.join(",")} />
    <button type="button" className={styles.selectButton} aria-expanded={open} aria-controls={menuId} onClick={() => setOpen(!open)} onKeyDown={onKeyDown}>
      <span className={value.length ? undefined : styles.placeholder}>{display}</span><ChevronDown size={19} aria-hidden className={open ? styles.chevronOpen : undefined} />
    </button>
    <AnimatePresence>
      {open && <motion.div id={menuId} className={styles.selectMenu} role="group" aria-label={label} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.16 }}>
        {options.map((option) => <label key={option.value} className={styles.selectOption}>
          <input type="checkbox" checked={value.includes(option.value)} onChange={() => toggle(option.value)} />
          <span className={styles.checkbox}>{value.includes(option.value) && <Check size={14} />}</span><span>{option.label}</span>
        </label>)}
      </motion.div>}
    </AnimatePresence>
  </div>;
}

function ProductCard({ step, title, children, image, imageAlt }: { step: number; title: string; children: ReactNode; image: string; imageAlt: string }) {
  return <motion.article className={styles.stepRow} variants={reveal}>
    <div className={styles.stepCopy}><motion.span className={styles.stepNumber} initial={{ scale: 0 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ delay: 0.3, type: "spring", stiffness: 200 }}>{step}</motion.span><h3>{title}</h3><p>{children}</p></div>
    <motion.div className={styles.stepImageFrame} whileHover={{ scale: 1.05, rotateY: step % 2 ? -5 : 5, rotateX: 5 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}><img src={image} alt={imageAlt} /></motion.div>
  </motion.article>;
}

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [trades, setTrades] = useState<string[]>([]);
  const [trackingTools, setTrackingTools] = useState<string[]>([]);
  const [jobSources, setJobSources] = useState<string[]>([]);
  const reducedMotion = useReducedMotion();
  const animate = reducedMotion ? undefined : "visible";
  const initial = reducedMotion ? false : "hidden";
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!trades.length || !trackingTools.length || !jobSources.length) return; setSubmitted(true); };

  return <div className={styles.page}>
    <header className={styles.header}>
      <div className={styles.navShell}><a className={styles.wordmark} href="#top" onClick={(e) => { e.preventDefault(); setMenuOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}>FieldSolo <em>Beta</em></a>
        <nav className={styles.desktopNav} aria-label="Main navigation">{navItems.map(([label, id]) => <NavLink key={id} id={id}>{label}</NavLink>)}<NavLink id="waitlist"><span className={styles.navCta}>Join waitlist</span></NavLink></nav>
        <button className={styles.menuButton} aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
      </div>
      <AnimatePresence>{menuOpen && <motion.nav className={styles.mobileNav} aria-label="Mobile navigation" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
        {navItems.map(([label, id]) => <NavLink key={id} id={id} onNavigate={() => setMenuOpen(false)}>{label}</NavLink>)}<NavLink id="waitlist" onNavigate={() => setMenuOpen(false)}><span className={styles.mobileCta}>Join waitlist</span></NavLink>
      </motion.nav>}</AnimatePresence>
    </header>

    <main id="top">
      <section className={styles.hero}><Blueprint />
        <motion.div aria-hidden className={`${styles.heroGlow} ${styles.heroGlowRust}`} animate={{ x: [-20, 20, -20], y: [-10, 10, -10], rotate: [0, 5, 0] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} />
        <motion.div aria-hidden className={`${styles.heroGlow} ${styles.heroGlowInk}`} animate={{ x: [20, -20, 20], y: [10, -10, 10], rotate: [0, -5, 0] }} transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }} />
        <motion.div className={styles.heroInner} initial={initial} animate={animate} variants={stagger}>
        <motion.span variants={reveal} className={styles.badge}>Beta</motion.span><motion.h1 variants={reveal}>Free job &amp; profit tracker</motion.h1>
        <motion.p variants={reveal} className={styles.kicker}>Built for independent tradespeople. Designed for the field.</motion.p>
        <motion.p variants={reveal} className={styles.heroLead}>Know what you actually made on every job to price smarter.</motion.p>
        <motion.div variants={reveal} className={styles.tradeTicker} aria-label="Trades supported by FieldSolo"><motion.div animate={{ x: ["0%", "-50%"] }} transition={{ repeat: Infinity, ease: "linear", duration: 30 }}><span>{"Plumbing · Electrical · HVAC · Handyman · Carpentry · Contractor · Painting · Roofing · Flooring · Drywall · Landscaping · Appliances · Auto Repair · "}</span><span>{"Plumbing · Electrical · HVAC · Handyman · Carpentry · Contractor · Painting · Roofing · Flooring · Drywall · Landscaping · Appliances · Auto Repair · "}</span></motion.div></motion.div>
        <motion.div variants={reveal} className={styles.heroActions}><NavLink id="waitlist"><motion.span className={styles.primaryButton} animate={reducedMotion ? undefined : pulse} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>Join the waitlist <ArrowRight size={19} /></motion.span></NavLink><NavLink id="how-it-works"><motion.span className={styles.secondaryButton} whileHover={{ scale: 1.05, backgroundColor: "#faf6f0" }} whileTap={{ scale: 0.95 }}>See how it works</motion.span></NavLink></motion.div>
      </motion.div>
      <motion.div className={styles.valueGrid} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={stagger}>{[[LayoutDashboard,"Log Jobs","Mobile-optimized UX to log jobs, time, materials, notes, and payments."],[DollarSign,"Track profit","Understand revenue, material costs, profit, and payments at a glance."],[Sparkles,"Price smarter","Use profit insights to identify bad jobs and improve your margins over time."]].map(([Icon, title, copy], index) => { const CardIcon = Icon as typeof LayoutDashboard; return <motion.article variants={reveal} whileHover={{ y: -10, boxShadow: "0 20px 25px -5px rgba(43, 52, 65, 0.1), 0 10px 10px -5px rgba(43, 52, 65, 0.04)", borderColor: "rgba(196, 75, 43, 0.2)" }} transition={{ duration: 0.3 }} className={styles.valueCard} key={String(title)}><motion.span className={styles.valueIcon} animate={reducedMotion ? undefined : { y: index % 2 === 0 ? [0, -5, 0] : [0, 5, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: index * 0.5 }}><CardIcon /></motion.span><h2>{title as string}</h2><p>{copy as string}</p></motion.article>; })}</motion.div>
      </section>

      <section className={styles.problem}><motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: .3 }} variants={stagger}><motion.h2 variants={reveal}>Busy does not mean profitable.</motion.h2><motion.div variants={reveal}><p className={styles.sectionLead}>FieldSolo helps you work smarter, not harder:</p><ul>{["Know your net", "Track expenses", "Say no to unprofitable jobs", "Price smarter", "Grow your margins", "Get paid faster"].map((item) => <li key={item}><CheckCircle2 />{item}</li>)}</ul></motion.div></motion.div><motion.div initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: .3 }} transition={{ duration: .8, ease: [0.22, 1, .36, 1] }} className={styles.problemImage}><motion.span aria-hidden className={styles.problemAccentRust} animate={{ rotate: [3, 5, 3] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} /><motion.span aria-hidden className={styles.problemAccentPaper} animate={{ rotate: [-2, -4, -2] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }} /><motion.div whileHover={{ scale: 1.02, rotate: -1 }} transition={{ type: "spring", stiffness: 300, damping: 20 }} className={styles.problemPhoto}><img src="/images/source-0.png" alt="Tradesperson working on an electrical installation" /></motion.div></motion.div></section>

      <section className={styles.promise}><Blueprint /><motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: .4 }} variants={stagger}><motion.h2 variants={reveal}>One place to understand every job</motion.h2><motion.p variants={reveal}>Your work comes from everywhere.</motion.p><motion.small variants={reveal}>Referrals. Repeat customers. Angi. Thumbtack. Facebook groups. Property managers. Contractors. Calls. Texts. Another job app.</motion.small><motion.blockquote variants={reveal}>FieldSolo brings the job economics into one clear view, no matter where the work came from.</motion.blockquote></motion.div></section>

      <section id="how-it-works" className={styles.how}><Blueprint /><div className={styles.content}><motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: .3 }} variants={reveal}><h2>How it works</h2></motion.div><motion.div className={styles.steps} initial="hidden" whileInView="visible" viewport={{ once: true, amount: .1 }} variants={stagger}>
        <ProductCard step={1} title="Mobile-optimized tracking" image="/images/source-1.png" imageAlt="Smartphone home screen">Start a live session while you work or log the job later when the day slows down. Add the basics first. Fill in the rest when you have time.</ProductCard>
        <ProductCard step={2} title="Capture what matters" image="/images/source-2.png" imageAlt="Smartphone used in the field">Capture time, materials, notes, revenue, and payment status without the complicated paperwork.</ProductCard>
        <ProductCard step={3} title="Close out loose ends" image="/images/source-3.png" imageAlt="Smartphone displaying a performance chart">Stay on top of unpaid jobs and incomplete records before they’re forgotten.</ProductCard>
        <ProductCard step={4} title="Understand your margins" image="/images/source-4.png" imageAlt="Analytics dashboard">Review revenue, material costs, net profit, and net-per-hour for one job, or the whole month.</ProductCard>
        <ProductCard step={5} title="Learn from your history" image="/images/source-5.png" imageAlt="Smartphone lock screen">Search past jobs, see your best and worst jobs, and price smarter next time.</ProductCard>
      </motion.div></div></section>

      <section id="features" className={styles.features}><div className={styles.content}><motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: .3 }} variants={reveal}><h2>Why FieldSolo?</h2></motion.div><motion.div className={styles.featureGrid} initial="hidden" whileInView="visible" viewport={{ once: true, amount: .1 }} variants={stagger}>{[["If you are too small for field service software", "FieldSolo gives you the essentials without slowing you down — for the same price you’re paying today: Free. Better than notes, spreadsheets, and calendar entries. More reliable than trying to remember what happened."], ["If you already pay for field service software", "FieldSolo works alongside the tools you already use. Track the bare minimum for profit insights. Understand which jobs to never take again."], ["If you manage a team or small business", "FieldSolo is designed with solo tradespeople in mind, but sign up for our waitlist to stay in the loop for future offerings."]].map(([title, body]) => <motion.article variants={reveal} key={title}><h3>{title}</h3><p>{body}</p></motion.article>)}</motion.div></div></section>

      <section id="pricing" className={styles.pricing}><Blueprint /><div className={styles.content}><motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: .3 }} variants={reveal}><h2>Free! Seriously.</h2><p className={styles.pricingLead}>FieldSolo is free because we want to replace your tracking spreadsheet and job notes. And we don’t believe you need expensive software for that.</p></motion.div><div className={styles.pricingGrid}><motion.article initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: .8 }}><h3>Included in free</h3><ul>{["Job tracking", "Time tracking", "Materials tracking", "Job notes", "Job & payment status", "Searchable job history", "Reminders & action items", "Simple profit reporting"].map((item) => <li key={item}><Check />{item}</li>)}</ul></motion.article><motion.article className={styles.futureCard} initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: .8 }}><h3>How do we make money?</h3><p>We don’t believe in charging for the simple stuff. We’re focusing first on building a great free platform for solo operators.</p><p>Expect additional paid tiers in the future to support larger teams, automations, or features designed to run more parts of your business.</p></motion.article></div></div></section>

      <section id="faq" className={styles.faq}><div className={styles.content}><motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .3 }} transition={{ duration: .8, ease: [0.22, 1, .36, 1] }}>Frequently asked questions</motion.h2><motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: .1 }} variants={stagger}>{faqs.map(([question, answer], index) => <FaqItem key={question} question={question} answer={answer} open={index === 0} />)}</motion.div></div></section>

      <section className={styles.finalCta}><Blueprint variant="dots" /><motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: .4 }} variants={stagger}><motion.span variants={reveal} className={styles.badge}>Beta available now</motion.span><motion.h2 variants={reveal}>Know which jobs were worth it</motion.h2><motion.p variants={reveal}>Log jobs. Track profit. Price smarter.</motion.p><motion.div variants={reveal}><NavLink id="waitlist"><motion.span className={styles.whiteButton} whileHover={{ scale: 1.05, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)" }} whileTap={{ scale: .95 }}>Join the waitlist <ArrowRight size={19} /></motion.span></NavLink></motion.div><motion.small variants={reveal}>Free job &amp; profit tracking for independent tradespeople.</motion.small></motion.div></section>
      <Waitlist submitted={submitted} setSubmitted={setSubmitted} trades={trades} setTrades={setTrades} trackingTools={trackingTools} setTrackingTools={setTrackingTools} jobSources={jobSources} setJobSources={setJobSources} onSubmit={submit} />
    </main>
    <footer className={styles.footer}><div><strong>FieldSolo</strong><p>Free job tracking for tradespeople who work for themselves.</p></div><nav aria-label="Footer navigation">{navItems.map(([label, id]) => <NavLink key={id} id={id}>{label}</NavLink>)}<NavLink id="waitlist">Waitlist</NavLink></nav><small>© {new Date().getFullYear()} FieldSolo. All rights reserved.</small></footer>
  </div>;
}

function FaqItem({ question, answer, open }: { question: string; answer: string; open?: boolean }) {
  const [isOpen, setOpen] = useState(open); const id = useId();
  return <motion.article variants={reveal} whileHover={{ scale: 1.01, backgroundColor: "rgba(250, 246, 240, 0.8)" }} className={styles.faqItem}><button aria-expanded={isOpen} aria-controls={id} onClick={() => setOpen(!isOpen)}><span>{question}</span><span className={styles.faqMark}>{isOpen ? "−" : "+"}</span></button><div id={id} hidden={!isOpen}><p>{answer}</p></div></motion.article>;
}

function Waitlist({ submitted, setSubmitted, trades, setTrades, trackingTools, setTrackingTools, jobSources, setJobSources, onSubmit }: {
  submitted: boolean; setSubmitted: (value: boolean) => void; trades: string[]; setTrades: (next: string[]) => void; trackingTools: string[]; setTrackingTools: (next: string[]) => void; jobSources: string[]; setJobSources: (next: string[]) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  if (submitted) return <section id="waitlist" className={`${styles.waitlist} ${styles.success}`}><Blueprint /><motion.div initial={{ opacity: 0, scale: .8, y: 40 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 200, damping: 20 }}><motion.span className={styles.successIcon} initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: .2, type: "spring", stiffness: 200, damping: 15 }}><Check /></motion.span><motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .4 }}>You’re on the list!</motion.h2><motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .5 }}>Thanks for joining the FieldSolo waitlist. We’ll be in touch with early access and product updates.</motion.p><motion.button className={styles.primaryButton} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .6 }} whileHover={{ scale: 1.03 }} whileTap={{ scale: .97 }} onClick={() => { setSubmitted(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Back to top</motion.button></motion.div></section>;
  return <section id="waitlist" className={styles.waitlist}><Blueprint variant="dots" /><div className={styles.waitlistGrid}><motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: .2 }} variants={stagger}><motion.span variants={reveal} className={styles.earlyBadge}><b>Beta</b> Early access</motion.span><motion.h2 variants={reveal}>Join the FieldSolo waitlist</motion.h2><motion.p variants={reveal}>FieldSolo is still in beta, but is growing fast. If you’re interested in helping shape the future of FieldSolo with us, we’d love to have you.</motion.p><motion.aside variants={reveal} animate={{ y: [-5, 5, -5] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}><Check /> Secure your spot for early access.</motion.aside></motion.div>
    <motion.form className={styles.form} onSubmit={onSubmit} initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: .2 }} transition={{ duration: .8, ease: [0.22, 1, .36, 1], delay: .2 }} whileHover={{ boxShadow: "0 25px 50px -12px rgba(43, 52, 65, 0.15)" }}>
      <label>First name<input name="firstName" required autoComplete="given-name" placeholder="Enter your first name" /></label>
      <label>Email address<input name="email" type="email" required autoComplete="email" placeholder="Enter your email" /></label>
      <label>Trade <MultiSelect label="your trade(s)" name="trades" options={tradeOptions} value={trades} onChange={setTrades} /><span className={styles.validation}>{trades.length ? "" : "Choose at least one trade"}</span></label>
      <fieldset><legend>Do you currently pay for field service software?</legend><motion.label whileHover={{ scale: 1.02, backgroundColor: "rgba(250, 246, 240, 1)" }} whileTap={{ scale: .98 }}><input name="usesSoftware" value="no" type="radio" required /> No</motion.label><motion.label whileHover={{ scale: 1.02, backgroundColor: "rgba(250, 246, 240, 1)" }} whileTap={{ scale: .98 }}><input name="usesSoftware" value="yes" type="radio" required /> Yes</motion.label></fieldset>
      <label>What do you use today to track jobs? <MultiSelect label="tracking tool(s)" name="trackingTools" options={trackingToolOptions} value={trackingTools} onChange={setTrackingTools} /><span className={styles.validation}>{trackingTools.length ? "" : "Choose at least one option"}</span></label>
      <label>Where do most of your jobs come from? <MultiSelect label="job source(s)" name="jobSources" options={jobSourceOptions} value={jobSources} onChange={setJobSources} /><span className={styles.validation}>{jobSources.length ? "" : "Choose at least one option"}</span></label>
      <motion.button className={styles.primaryButton} type="submit" whileHover={{ scale: 1.03, boxShadow: "0 10px 15px -3px rgba(196, 75, 43, 0.3)" }} whileTap={{ scale: .97 }}>Join the waitlist <ArrowRight size={19} /></motion.button><small>No spam. Just early access, product updates, and opportunities to share your feedback.</small>
    </motion.form>
  </div></section>;
}
