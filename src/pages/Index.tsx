import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  ShieldCheck,
  Wifi,
  LineChart,
  Users,
} from "lucide-react";
import heroImg from "@/assets/landing-hero.jpg";
import portraitImg from "@/assets/landing-portrait.jpg";
import fieldImg from "@/assets/landing-field.jpg";

/**
 * Sun-Drenched Editorial — Ufanisi landing page.
 * Warm cream paper, Playfair Display serif headlines, terracotta + deep teal accents.
 * Speaks to NGO leaders and donors with a documentary, magazine-quality voice.
 */
const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    document.title = "Ufanisi — Data that documents human impact";
  }, []);

  const primaryCta = () => navigate(user ? "/dashboard" : "/auth");

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#1A2B3B] antialiased selection:bg-[#2D7D8E]/20" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        .font-display { font-family: 'Playfair Display', Georgia, serif; font-feature-settings: 'lnum'; }
        .tracking-editorial { letter-spacing: 0.22em; }
        .ink { color: #1A2B3B; }
        .clay { color: #C17D5C; }
        .teal-deep { color: #2D7D8E; }
      `}</style>

      <a href="#landing-main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-[#1A2B3B] focus:text-[#FDFBF7] focus:px-3 focus:py-2 focus:rounded">
        Skip to main content
      </a>

      {/* ─── Navigation ─────────────────────────────────────────────────── */}
      <nav className="sticky top-0 w-full z-50 bg-[#FDFBF7]/85 backdrop-blur-md border-b border-[#1A2B3B]/8">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-display text-2xl font-semibold tracking-tight">Ufanisi</span>
            <span className="hidden sm:inline-block w-px h-5 bg-[#1A2B3B]/15" />
            <span className="hidden sm:inline-block text-[11px] uppercase tracking-editorial text-[#1A2B3B]/50">Data Management</span>
          </div>
          <div className="flex items-center gap-4 lg:gap-12">
            <div className="hidden lg:flex items-center gap-9 text-[12px] font-medium uppercase tracking-editorial">
              <a href="#philosophy" className="hover:text-[#2D7D8E] transition-colors">Philosophy</a>
              <a href="#impact" className="hover:text-[#2D7D8E] transition-colors">Impact</a>
              <a href="#system" className="hover:text-[#2D7D8E] transition-colors">The System</a>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/auth")}
                className="hidden sm:inline-flex text-sm font-medium hover:text-[#2D7D8E] transition-colors px-2 py-2"
              >
                Sign in
              </button>
              <button
                onClick={primaryCta}
                className="bg-[#1A2B3B] text-[#FDFBF7] px-5 sm:px-6 py-2.5 text-sm font-medium hover:bg-[#2D7D8E] transition-colors"
              >
                Request a demo
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main id="landing-main">
        {/* ─── Hero ─────────────────────────────────────────────────────── */}
        <header className="border-b border-[#1A2B3B]/8">
          <div className="grid grid-cols-12 min-h-[85dvh]">
            <div className="col-span-12 lg:col-span-7 relative overflow-hidden bg-[#F2EBE1] order-2 lg:order-1">
              <img
                src={heroImg}
                alt="A community gathered at golden hour"
                className="w-full h-full object-cover"
                width={1600}
                height={1280}
              />
              <div className="absolute inset-0 bg-[#C17D5C]/8 mix-blend-multiply" aria-hidden />
              <div className="absolute bottom-6 left-6 sm:bottom-8 sm:left-8 text-[11px] uppercase tracking-editorial text-[#FDFBF7]/85 bg-[#1A2B3B]/35 backdrop-blur px-3 py-1.5">
                Tana River, Kenya · 2025
              </div>
            </div>

            <div className="col-span-12 lg:col-span-5 flex flex-col justify-center px-8 sm:px-12 lg:px-16 py-16 lg:py-20 order-1 lg:order-2">
              <span className="block text-[#C17D5C] font-medium tracking-editorial uppercase text-[11px] mb-6">
                Metrics with Meaning
              </span>
              <h1 className="font-display text-5xl sm:text-6xl xl:text-7xl leading-[1.04] text-balance mb-8">
                Cultivating <span className="italic font-medium text-[#2D7D8E]">clarity</span> in the heart of impact.
              </h1>
              <p className="text-lg text-[#1A2B3B]/75 leading-relaxed max-w-[46ch] mb-10 text-pretty">
                Beyond spreadsheets and static rows, Ufanisi bridges the gap between digital
                precision and grassroots action — a data system designed for the human experience.
              </p>
              <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
                <button
                  onClick={primaryCta}
                  className="group inline-flex items-center gap-3 border-b-2 border-[#1A2B3B] pb-1.5 font-semibold hover:text-[#2D7D8E] hover:border-[#2D7D8E] transition-colors"
                >
                  Explore the platform
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
                <span className="text-[#1A2B3B]/25">/</span>
                <button
                  onClick={() => navigate("/donor/login")}
                  className="border-b-2 border-[#1A2B3B] pb-1.5 font-semibold hover:text-[#2D7D8E] hover:border-[#2D7D8E] transition-colors"
                >
                  Donor portal
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* ─── Impact Numbers ───────────────────────────────────────────── */}
        <section id="impact" className="px-6 lg:px-10">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16 border-b border-[#1A2B3B]/10 py-20 md:py-24">
            <Stat figure="84.2%" colorClass="text-[#2D7D8E]" label="Efficiency Gain" copy="Reduction in administrative friction for field officers across East Africa." />
            <Stat figure="12.4k" colorClass="text-[#C17D5C]" label="Lives Visualized" copy="Unique individuals supported through precise, real-time resource allocation." />
            <Stat figure="$1.8M" colorClass="text-[#1A2B3B]" label="Donor Confidence" copy="Increased funding transparency through our verified outcome ledger." />
          </div>
        </section>

        {/* ─── Editorial Quote ──────────────────────────────────────────── */}
        <section id="philosophy" className="px-6 lg:px-10 py-24 md:py-32">
          <div className="max-w-7xl mx-auto grid grid-cols-12 gap-10 lg:gap-16 items-center">
            <div className="col-span-12 lg:col-span-5">
              <div className="bg-[#F2EBE1] p-1">
                <img
                  src={portraitImg}
                  alt="Portrait of Ngozi Abara, NGO director"
                  className="w-full aspect-[4/5] object-cover"
                  loading="lazy"
                  width={800}
                  height={1024}
                />
              </div>
              <div className="mt-6 flex items-center justify-between text-[11px] uppercase tracking-editorial text-[#1A2B3B]/40">
                <span>Plate I</span>
                <span>The Director</span>
              </div>
            </div>
            <div className="col-span-12 lg:col-span-7 lg:pl-8">
              <span className="block text-[#C17D5C] font-medium tracking-editorial uppercase text-[11px] mb-6">
                In conversation
              </span>
              <blockquote className="font-display text-3xl md:text-4xl xl:text-5xl leading-[1.15] mb-10 text-balance">
                “Ufanisi didn't just give us a dashboard — they gave us a lens to see the
                true impact of our hands. We no longer report on numbers; we share stories
                of change <span className="italic">undeniably</span> backed by truth.”
              </blockquote>
              <div className="flex flex-col gap-1">
                <span className="font-semibold ink uppercase tracking-wide text-sm">Ngozi Abara</span>
                <span className="text-[#1A2B3B]/55 text-sm">Director, The Green Canopy Initiative</span>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Feature Grid (dark) ──────────────────────────────────────── */}
        <section id="system" className="bg-[#1A2B3B] text-[#FDFBF7] px-6 lg:px-10 py-24 md:py-32">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8 mb-16 md:mb-20">
              <div className="max-w-2xl">
                <span className="block text-[#C17D5C] font-medium tracking-editorial uppercase text-[11px] mb-5">
                  The Architecture
                </span>
                <h2 className="font-display text-4xl md:text-5xl leading-tight mb-5">
                  Precision meets the field.
                </h2>
                <p className="text-[#FDFBF7]/60 text-lg leading-relaxed">
                  Built for environments where connectivity is scarce but purpose is abundant.
                </p>
              </div>
              <span className="font-display italic text-2xl text-[#C17D5C] whitespace-nowrap hidden md:block">
                — Built for the last mile
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-[#FDFBF7]/10 border border-[#FDFBF7]/10">
              <Feature index="01" title="Offline Synchronicity" Icon={Wifi}>
                Data entry that breathes with your environment. Save locally, sync when the sky opens up to signal.
              </Feature>
              <Feature index="02" title="Visual Narratives" Icon={LineChart}>
                Automated impact reporting that transforms dry metrics into beautiful, donor-ready visual stories.
              </Feature>
              <Feature index="03" title="Guardian Security" Icon={ShieldCheck}>
                State-of-the-art encryption protecting the most sensitive community data with uncompromising ethics.
              </Feature>
              <Feature index="04" title="Built for Teams" Icon={Users}>
                Granular roles, audit trails, and multi-organization workspaces — from one volunteer to a thousand.
              </Feature>
            </div>
          </div>
        </section>

        {/* ─── Field photo + caption strip ──────────────────────────────── */}
        <section className="px-6 lg:px-10 py-24 md:py-32">
          <div className="max-w-7xl mx-auto grid grid-cols-12 gap-10 lg:gap-16 items-center">
            <div className="col-span-12 lg:col-span-7 order-2 lg:order-1">
              <span className="block text-[#C17D5C] font-medium tracking-editorial uppercase text-[11px] mb-6">
                Plate II · The Field
              </span>
              <h3 className="font-display text-4xl md:text-5xl leading-tight mb-8 text-balance">
                Where the data is gathered, with the people it represents.
              </h3>
              <p className="text-lg text-[#1A2B3B]/75 leading-relaxed max-w-[55ch] mb-10">
                Every household visit, every harvest measured, every child enrolled — captured
                with dignity by the officers who know the community best, then woven into a
                ledger that funders, boards, and beneficiaries can all trust.
              </p>
              <button
                onClick={primaryCta}
                className="group inline-flex items-center gap-3 text-sm font-semibold uppercase tracking-editorial hover:text-[#2D7D8E] transition-colors"
              >
                Read a case study
                <ArrowUpRight className="w-4 h-4 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
            <div className="col-span-12 lg:col-span-5 order-1 lg:order-2">
              <div className="bg-[#F2EBE1] p-1">
                <img
                  src={fieldImg}
                  alt="Field officer reviewing data with a farmer at golden hour"
                  className="w-full aspect-[4/5] object-cover"
                  loading="lazy"
                  width={1200}
                  height={900}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ─── Final CTA ────────────────────────────────────────────────── */}
        <section className="px-6 lg:px-10 pb-24 md:pb-32">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="font-display text-4xl sm:text-5xl md:text-6xl mb-10 text-balance leading-[1.08]">
              Ready to transform how you measure <span className="italic text-[#2D7D8E]">the possible</span>?
            </h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
              <Button
                onClick={primaryCta}
                size="lg"
                className="w-full sm:w-auto bg-[#2D7D8E] text-[#FDFBF7] hover:bg-[#1A2B3B] rounded-none px-10 py-6 text-base font-medium shadow-xl shadow-[#2D7D8E]/15 transition-colors"
              >
                Request a personal tour
              </Button>
              <Button
                onClick={() => navigate("/auth")}
                variant="outline"
                size="lg"
                className="w-full sm:w-auto border-[#1A2B3B]/25 text-[#1A2B3B] hover:bg-[#1A2B3B] hover:text-[#FDFBF7] rounded-none px-10 py-6 text-base font-medium bg-transparent"
              >
                Sign in to your workspace
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* ─── Footer ─────────────────────────────────────────────────────── */}
      <footer className="border-t border-[#1A2B3B]/10 px-6 lg:px-10 py-14">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-10">
          <div className="flex flex-col gap-3 max-w-xs">
            <div className="font-display text-3xl font-semibold">Ufanisi</div>
            <p className="text-[#1A2B3B]/50 text-sm leading-relaxed">
              Empowering the architects of social change with data they can trust.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-14 gap-y-6">
            <FooterCol head="Global HQ" body="Nairobi, Kenya" />
            <FooterCol head="Contact" body={<a href="mailto:hello@ufanisi.inferatechs.com" className="underline decoration-[#C17D5C]/40 underline-offset-4 hover:text-[#2D7D8E]">hello@ufanisi.inferatechs.com</a>} />
            <FooterCol head="Trust" body={<button onClick={() => navigate("/auth")} className="underline decoration-[#C17D5C]/40 underline-offset-4 hover:text-[#2D7D8E]">Ethical data policy</button>} />
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-12 pt-6 border-t border-[#1A2B3B]/8 flex flex-col sm:flex-row justify-between items-center gap-3 text-[11px] uppercase tracking-editorial text-[#1A2B3B]/40">
          <span>© {new Date().getFullYear()} Ufanisi · Infera Tech Solutions</span>
          <span className="font-display italic normal-case tracking-normal text-sm">Documentation is an act of hope.</span>
        </div>
      </footer>
    </div>
  );
};

/* ─── Subcomponents ───────────────────────────────────────────────────── */

const Stat = ({ figure, label, copy, colorClass }: { figure: string; label: string; copy: string; colorClass: string }) => (
  <div className="flex flex-col">
    <span className={`font-display text-6xl md:text-7xl mb-5 tabular-nums leading-none ${colorClass}`} style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
      {figure}
    </span>
    <p className="text-[11px] font-bold uppercase tracking-editorial text-[#1A2B3B]/55 mb-3">{label}</p>
    <p className="text-[#1A2B3B]/75 text-pretty leading-relaxed">{copy}</p>
  </div>
);

const Feature = ({
  index,
  title,
  Icon,
  children,
}: {
  index: string;
  title: string;
  Icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) => (
  <div className="bg-[#1A2B3B] p-10 hover:bg-[#2D7D8E]/15 transition-colors group">
    <div className="flex items-center justify-between mb-10">
      <span className="text-[#C17D5C] text-xs font-bold tracking-editorial">{index}</span>
      <Icon className="w-5 h-5 text-[#FDFBF7]/40 group-hover:text-[#C17D5C] transition-colors" />
    </div>
    <h3 className="font-display text-2xl mb-4 group-hover:italic transition-all" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
      {title}
    </h3>
    <p className="text-[#FDFBF7]/55 leading-relaxed text-sm">{children}</p>
  </div>
);

const FooterCol = ({ head, body }: { head: string; body: React.ReactNode }) => (
  <div className="flex flex-col gap-2 min-w-[140px]">
    <span className="text-[10px] font-bold uppercase tracking-editorial text-[#1A2B3B]/40">{head}</span>
    <span className="text-sm text-[#1A2B3B]/70">{body}</span>
  </div>
);

export default Index;
