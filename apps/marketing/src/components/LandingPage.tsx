"use client";

import Image from "next/image";
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

const reveal = { hidden: { opacity: 0, y: 26 }, visible: { opacity: 1, y: 0 } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.1 } } };

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
  return <article className={styles.stepRow}>
    <div className={styles.stepCopy}><span className={styles.stepNumber}>{step}</span><h3>{title}</h3><p>{children}</p></div>
    <div className={styles.stepImageFrame}><Image src={image} alt={imageAlt} fill sizes="260px" /></div>
  </article>;
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
      <section className={styles.hero}><Blueprint /><motion.div className={styles.heroInner} initial={initial} animate={animate} variants={stagger} transition={{ duration: 0.7 }}>
        <motion.span variants={reveal} className={styles.badge}>Beta</motion.span><motion.h1 variants={reveal}>Free job &amp; profit tracker</motion.h1>
        <motion.p variants={reveal} className={styles.kicker}>Built for independent tradespeople. Designed for the field.</motion.p>
        <motion.p variants={reveal} className={styles.heroLead}>Know what you actually made on every job to price smarter.</motion.p>
        <motion.p variants={reveal} className={styles.tradeTicker}>Plumbing · Electrical · HVAC · Handyman · Carpentry · Contractor · Painting · Roofing · Flooring · Drywall · Landscaping · Appliances · Auto Repair</motion.p>
        <motion.div variants={reveal} className={styles.heroActions}><NavLink id="waitlist"><span className={styles.primaryButton}>Join the waitlist <ArrowRight size={19} /></span></NavLink><NavLink id="how-it-works"><span className={styles.secondaryButton}>See how it works</span></NavLink></motion.div>
      </motion.div>
      <div className={styles.valueGrid}>{[[LayoutDashboard,"Log jobs","Mobile-optimized UX to log jobs, time, materials, notes, and payments."],[DollarSign,"Track profit","Understand revenue, material costs, profit, and payments at a glance."],[Sparkles,"Price smarter","Use profit insights to identify bad jobs and improve your margins over time."]].map(([Icon, title, copy]) => { const CardIcon = Icon as typeof LayoutDashboard; return <article className={styles.valueCard} key={String(title)}><CardIcon /><h2>{title as string}</h2><p>{copy as string}</p></article>; })}</div>
      </section>

      <section className={styles.problem}><div><h2>Busy does not mean profitable.</h2><p className={styles.sectionLead}>FieldSolo helps you work smarter, not harder:</p><ul>{["Know your net", "Track expenses", "Say no to unprofitable jobs", "Price smarter", "Grow your margins", "Get paid faster"].map((item) => <li key={item}><CheckCircle2 />{item}</li>)}</ul></div><div className={styles.problemImage}><Image src="/images/source-0.png" alt="Tradesperson working on an electrical installation" fill sizes="(max-width: 760px) 100vw, 530px" /></div></section>

      <section className={styles.promise}><Blueprint /><div><h2>One place to understand every job</h2><p>Your work comes from everywhere.</p><small>Referrals. Repeat customers. Angi. Thumbtack. Facebook groups. Property managers. Contractors. Calls. Texts. Another job app.</small><blockquote>FieldSolo brings the job economics into one clear view, no matter where the work came from.</blockquote></div></section>

      <section id="how-it-works" className={styles.how}><Blueprint /><div className={styles.content}><h2>How it works</h2><div className={styles.steps}>
        <ProductCard step={1} title="Mobile-optimized tracking" image="/images/source-1.png" imageAlt="Smartphone home screen">Start a live session while you work or log the job later when the day slows down. Add the basics first. Fill in the rest when you have time.</ProductCard>
        <ProductCard step={2} title="Capture what matters" image="/images/source-2.png" imageAlt="Smartphone used in the field">Capture time, materials, notes, revenue, and payment status without the complicated paperwork.</ProductCard>
        <ProductCard step={3} title="Close out loose ends" image="/images/source-3.png" imageAlt="Smartphone displaying a performance chart">Stay on top of unpaid jobs and incomplete records before they’re forgotten.</ProductCard>
        <ProductCard step={4} title="Understand your margins" image="/images/source-4.png" imageAlt="Analytics dashboard">Review revenue, material costs, net profit, and net-per-hour for one job, or the whole month.</ProductCard>
        <ProductCard step={5} title="Learn from your history" image="/images/source-5.png" imageAlt="Smartphone lock screen">Search past jobs, see your best and worst jobs, and price smarter next time.</ProductCard>
      </div></div></section>

      <section id="features" className={styles.features}><div className={styles.content}><h2>Why FieldSolo?</h2><div className={styles.featureGrid}>{[["If you are too small for field service software", "FieldSolo gives you the essentials without slowing you down — for the same price you’re paying today: Free. Better than notes, spreadsheets, and calendar entries. More reliable than trying to remember what happened."], ["If you already pay for field service software", "FieldSolo works alongside the tools you already use. Track the bare minimum for profit insights. Understand which jobs to never take again."], ["If you manage a team or small business", "FieldSolo is designed with solo tradespeople in mind, but sign up for our waitlist to stay in the loop for future offerings."]].map(([title, body]) => <article key={title}><h3>{title}</h3><p>{body}</p></article>)}</div></div></section>

      <section id="pricing" className={styles.pricing}><Blueprint /><div className={styles.content}><h2>Free! Seriously.</h2><p className={styles.pricingLead}>FieldSolo is free because we want to replace your tracking spreadsheet and job notes. And we don’t believe you need expensive software for that.</p><div className={styles.pricingGrid}><article><h3>Included in free</h3><ul>{["Job tracking", "Time tracking", "Materials tracking", "Job notes", "Job & payment status", "Searchable job history", "Reminders & action items", "Simple profit reporting"].map((item) => <li key={item}><Check />{item}</li>)}</ul></article><article className={styles.futureCard}><h3>How do we make money?</h3><p>We don’t believe in charging for the simple stuff. We’re focusing first on building a great free platform for solo operators.</p><p>Expect additional paid tiers in the future to support larger teams, automations, or features designed to run more parts of your business.</p></article></div></div></section>

      <section id="faq" className={styles.faq}><div className={styles.content}><h2>Frequently asked questions</h2><div>{faqs.map(([question, answer], index) => <FaqItem key={question} question={question} answer={answer} open={index === 0} />)}</div></div></section>

      <section className={styles.finalCta}><Blueprint variant="dots" /><div><span className={styles.badge}>Beta available now</span><h2>Know which jobs were worth it</h2><p>Log jobs. Track profit. Price smarter.</p><NavLink id="waitlist"><span className={styles.whiteButton}>Join the waitlist <ArrowRight size={19} /></span></NavLink><small>Free job &amp; profit tracking for independent tradespeople.</small></div></section>
      <Waitlist submitted={submitted} setSubmitted={setSubmitted} trades={trades} setTrades={setTrades} trackingTools={trackingTools} setTrackingTools={setTrackingTools} jobSources={jobSources} setJobSources={setJobSources} onSubmit={submit} />
    </main>
    <footer className={styles.footer}><div><strong>FieldSolo</strong><p>Free job tracking for tradespeople who work for themselves.</p></div><nav aria-label="Footer navigation">{navItems.map(([label, id]) => <NavLink key={id} id={id}>{label}</NavLink>)}<NavLink id="waitlist">Waitlist</NavLink></nav><small>© {new Date().getFullYear()} FieldSolo. All rights reserved.</small></footer>
  </div>;
}

function FaqItem({ question, answer, open }: { question: string; answer: string; open?: boolean }) {
  const [isOpen, setOpen] = useState(open); const id = useId();
  return <article className={styles.faqItem}><button aria-expanded={isOpen} aria-controls={id} onClick={() => setOpen(!isOpen)}><span>{question}</span><span className={styles.faqMark}>{isOpen ? "−" : "+"}</span></button><div id={id} hidden={!isOpen}><p>{answer}</p></div></article>;
}

function Waitlist({ submitted, setSubmitted, trades, setTrades, trackingTools, setTrackingTools, jobSources, setJobSources, onSubmit }: {
  submitted: boolean; setSubmitted: (value: boolean) => void; trades: string[]; setTrades: (next: string[]) => void; trackingTools: string[]; setTrackingTools: (next: string[]) => void; jobSources: string[]; setJobSources: (next: string[]) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  if (submitted) return <section id="waitlist" className={`${styles.waitlist} ${styles.success}`}><Blueprint /><div><span className={styles.successIcon}><Check /></span><h2>You’re on the list!</h2><p>Thanks for joining the FieldSolo waitlist. We’ll be in touch with early access and product updates.</p><button className={styles.primaryButton} onClick={() => { setSubmitted(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Back to top</button></div></section>;
  return <section id="waitlist" className={styles.waitlist}><Blueprint variant="dots" /><div className={styles.waitlistGrid}><div><span className={styles.earlyBadge}><b>Beta</b> Early access</span><h2>Join the FieldSolo waitlist</h2><p>FieldSolo is still in beta, but is growing fast. If you’re interested in helping shape the future of FieldSolo with us, we’d love to have you.</p><aside><Check /> Secure your spot for early access.</aside></div>
    <form className={styles.form} onSubmit={onSubmit}>
      <label>First name<input name="firstName" required autoComplete="given-name" placeholder="Enter your first name" /></label>
      <label>Email address<input name="email" type="email" required autoComplete="email" placeholder="Enter your email" /></label>
      <label>Trade <MultiSelect label="your trade(s)" name="trades" options={tradeOptions} value={trades} onChange={setTrades} /><span className={styles.validation}>{trades.length ? "" : "Choose at least one trade"}</span></label>
      <fieldset><legend>Do you currently pay for field service software?</legend><label><input name="usesSoftware" value="no" type="radio" required /> No</label><label><input name="usesSoftware" value="yes" type="radio" required /> Yes</label></fieldset>
      <label>What do you use today to track jobs? <MultiSelect label="tracking tool(s)" name="trackingTools" options={trackingToolOptions} value={trackingTools} onChange={setTrackingTools} /><span className={styles.validation}>{trackingTools.length ? "" : "Choose at least one option"}</span></label>
      <label>Where do most of your jobs come from? <MultiSelect label="job source(s)" name="jobSources" options={jobSourceOptions} value={jobSources} onChange={setJobSources} /><span className={styles.validation}>{jobSources.length ? "" : "Choose at least one option"}</span></label>
      <button className={styles.primaryButton} type="submit">Join the waitlist <ArrowRight size={19} /></button><small>No spam. Just early access, product updates, and opportunities to share your feedback.</small>
    </form>
  </div></section>;
}
