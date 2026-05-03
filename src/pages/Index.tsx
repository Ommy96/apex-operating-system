import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { ArrowRight } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const id = "ufanisi-editorial-fonts";
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Source+Sans+3:wght@300;400;500;600&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  const goAuth = () => navigate(user ? "/dashboard" : "/auth");

  return (
    <div
      className="min-h-dvh antialiased selection:bg-[#B35C44]/20"
      style={{
        backgroundColor: "#F9F8F3",
        color: "#141B26",
        fontFamily: "'Source Sans 3', system-ui, sans-serif",
      }}
    >
      <style>{`
        .ed-serif { font-family: 'Instrument Serif', Georgia, serif; }
      `}</style>

      {/* Nav */}
      <nav className="px-6 md:px-10 py-8 md:py-10 flex justify-between items-baseline border-b border-[#141B26]/5">
        <div className="ed-serif text-2xl md:text-3xl tracking-tight italic">Ufanisi.</div>
        <div className="hidden md:flex gap-10 text-[12px] uppercase tracking-[0.2em] font-medium text-[#141B26]/60">
          <a href="#archive" className="hover:text-[#141B26] transition-colors">The Archive</a>
          <a href="#methodology" className="hover:text-[#141B26] transition-colors">Methodology</a>
          <a href="#impact" className="hover:text-[#141B26] transition-colors">Annual Report</a>
        </div>
        <button
          onClick={goAuth}
          className="px-5 md:px-6 py-2 border border-[#141B26]/20 hover:border-[#141B26] rounded-full text-[12px] uppercase tracking-[0.2em] transition-all"
        >
          {user ? "Dashboard" : "Access Console"}
        </button>
      </nav>

      {/* Hero */}
      <header className="relative px-6 md:px-10 pt-16 md:pt-24 pb-24 md:pb-32 max-w-7xl mx-auto">
        <div className="grid grid-cols-12 gap-8 items-end">
          <div className="col-span-12 lg:col-span-7">
            <span className="block text-[#B35C44] font-medium uppercase tracking-[0.25em] mb-6 text-xs md:text-sm">
              NGO Information Architecture
            </span>
            <h1 className="ed-serif text-6xl md:text-8xl lg:text-9xl leading-[0.85] tracking-tight mb-8 text-balance">
              Data is the <span className="italic">heartbeat</span> of human progress.
            </h1>
            <p className="text-lg md:text-xl max-w-[45ch] leading-relaxed text-[#141B26]/80">
              Ufanisi transforms abstract development metrics into clear, actionable
              narratives of change. A data management system built for the field, the
              clinic, and the community.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <button
                onClick={goAuth}
                className="group inline-flex items-center gap-3 px-7 py-4 bg-[#141B26] text-[#F9F8F3] text-[12px] uppercase tracking-[0.2em] hover:bg-[#B35C44] transition-colors"
              >
                {user ? "Open Dashboard" : "Request a Demonstration"}
                <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <a
                href="#impact"
                className="inline-flex items-center px-7 py-4 border border-[#141B26]/20 text-[12px] uppercase tracking-[0.2em] hover:bg-[#141B26] hover:text-[#F9F8F3] transition-all"
              >
                Read the Field Notes
              </a>
            </div>
          </div>
          <div className="col-span-12 lg:col-span-5">
            <div className="relative bg-[#EDEBDF] p-4 shadow-2xl rotate-2 hover:rotate-0 transition-transform duration-700 ease-out">
              <img
                src="https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=900&q=80&fm=jpg"
                loading="lazy"
                alt="Community health assessment, field documentation"
                className="w-full aspect-[3/4] object-cover grayscale contrast-125"
              />
              <div className="mt-4 ed-serif italic text-base md:text-lg text-[#141B26]/60 text-center">
                Fig 01. Community Health Assessment, Rift Valley.
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Ledger / Metrics */}
      <section id="impact" className="bg-[#141B26] text-[#F9F8F3] py-24 md:py-32 px-6 md:px-10">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16 max-w-2xl">
            <span className="block text-[#B35C44] uppercase tracking-[0.25em] mb-4 text-xs">The Ledger</span>
            <h2 className="ed-serif text-4xl md:text-6xl leading-tight">
              Real numbers from <span className="italic">real fieldwork.</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-8">
            {[
              {
                n: "18,442",
                k: "Records Processed / Month",
                d: "Real-time validation ensuring every intervention is recorded with 99.8% accuracy at the point of care.",
              },
              {
                n: "$4.2M",
                k: "Direct Resource Allocation",
                d: "Automated auditing bridging the gap between donor funding and local distribution without administrative drift.",
              },
              {
                n: "12",
                k: "Active Regional Hubs",
                d: "Offline-first sync allows field workers to maintain the narrative even in zero-connectivity zones.",
              },
            ].map((m) => (
              <div key={m.k} className="border-t border-[#F9F8F3]/20 pt-8">
                <div className="tabular-nums text-5xl md:text-6xl ed-serif mb-4">{m.n}</div>
                <div className="text-[11px] uppercase tracking-[0.25em] text-[#F9F8F3]/50 mb-4">{m.k}</div>
                <p className="text-sm leading-relaxed text-[#F9F8F3]/70 max-w-xs italic">{m.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Story / Narrative */}
      <section id="archive" className="py-24 md:py-32 px-6 md:px-10 max-w-7xl mx-auto overflow-hidden">
        <div className="flex flex-col lg:flex-row gap-16 lg:gap-24 items-center">
          <div className="w-full lg:w-1/2 relative">
            <div className="absolute -left-12 top-0 w-64 h-64 bg-[#EDEBDF] rounded-full -z-10 blur-3xl opacity-50" />
            <div className="bg-white p-2 shadow-xl -rotate-3 mb-12">
              <img
                src="https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=900&q=80&fm=jpg"
                loading="lazy"
                alt="Field team reviewing data"
                className="w-full aspect-video object-cover"
              />
            </div>
            <div className="bg-white p-2 shadow-xl rotate-2 ml-8 md:ml-12">
              <img
                src="https://images.unsplash.com/photo-1577563908411-5077b6dc7624?w=900&q=80&fm=jpg"
                loading="lazy"
                alt="Children at a community school"
                className="w-full aspect-video object-cover"
              />
            </div>
          </div>

          <div className="w-full lg:w-1/2">
            <span className="block text-[#B35C44] uppercase tracking-[0.25em] mb-4 text-xs">A Case Study</span>
            <h2 className="ed-serif text-4xl md:text-5xl tracking-tight leading-tight mb-8">
              Witnessing the transformation
              <br />
              <span className="italic text-[#B35C44]">of an entire province.</span>
            </h2>
            <div className="space-y-6 text-base md:text-lg text-[#141B26]/80 max-w-[55ch]">
              <p>
                In the Maradi region, data was once a burden of paperwork — lost
                ledgers, mismatched IDs, and delayed relief. We built Ufanisi to be
                the invisible infrastructure that restores dignity to the numbers.
              </p>
              <p>
                When a child is immunized, it is no longer a tally mark. It is a
                timestamped event that triggers supply chain updates, nutritional
                follow-ups, and maternal health alerts across a unified ledger.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Methodology / What we built */}
      <section id="methodology" className="border-t border-[#141B26]/10 px-6 md:px-10 py-24 md:py-32">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-12 gap-8 mb-16">
            <div className="col-span-12 lg:col-span-5">
              <span className="block text-[#B35C44] uppercase tracking-[0.25em] mb-4 text-xs">Methodology</span>
              <h2 className="ed-serif text-4xl md:text-6xl leading-[0.95]">
                Built around the <span className="italic">work</span>, not the workflow.
              </h2>
            </div>
            <p className="col-span-12 lg:col-span-6 lg:col-start-7 text-lg text-[#141B26]/70 leading-relaxed self-end">
              Eight modules, one continuous record. Designed alongside frontline NGO
              teams in East Africa — every screen earned its place.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-[#141B26]/10 border border-[#141B26]/10">
            {[
              { n: "01", t: "Beneficiary Records", d: "A unified care file across programs, households, and lifecycle." },
              { n: "02", t: "Programs & Projects", d: "Hierarchical workplans with budget rollups and indicator targets." },
              { n: "03", t: "Monitoring & Evaluation", d: "Custom indicators, theory of change, and traffic-light targets." },
              { n: "04", t: "Financial Suite", d: "Master ledger, donor grants, petty cash, and cost-per-beneficiary." },
              { n: "05", t: "Field Mode (PWA)", d: "Offline check-ins, data collection, and background sync." },
              { n: "06", t: "Donor & Sponsorships", d: "Donor portal, allocations, and program-linked income." },
              { n: "07", t: "HR & Volunteers", d: "Staff directory, performance contracts, and field hours." },
              { n: "08", t: "Compliance & Safeguarding", d: "Whistleblower intake, KRA tracking, role-based access." },
            ].map((m) => (
              <div key={m.n} className="bg-[#F9F8F3] p-8 hover:bg-[#EDEBDF] transition-colors">
                <div className="ed-serif italic text-3xl text-[#B35C44] mb-6">{m.n}</div>
                <div className="text-sm uppercase tracking-[0.15em] font-semibold mb-3">{m.t}</div>
                <p className="text-sm text-[#141B26]/70 leading-relaxed">{m.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="px-6 md:px-10 py-24 md:py-32 border-t border-[#141B26]/5 bg-[#EDEBDF]/40">
        <div className="max-w-4xl mx-auto text-center">
          <div className="ed-serif text-6xl text-[#B35C44] leading-none mb-6">&ldquo;</div>
          <blockquote className="ed-serif italic text-2xl md:text-4xl lg:text-5xl leading-tight mb-12">
            The software feels like an extension of our notebook. It doesn&rsquo;t get
            in the way of the patient; it remembers the patient so we don&rsquo;t
            have to rely on memory alone.
          </blockquote>
          <div className="flex flex-col items-center">
            <div className="text-xs uppercase tracking-[0.25em] font-bold">Dr. Amara Okoro</div>
            <div className="text-xs text-[#141B26]/50 mt-2 uppercase tracking-widest">
              Field Logistics Coordinator, West Africa
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA / Footer */}
      <footer className="bg-[#EDEBDF] px-6 md:px-10 py-20 md:py-24 border-t border-[#141B26]/10">
        <div className="max-w-7xl mx-auto grid grid-cols-12 gap-12">
          <div className="col-span-12 lg:col-span-6">
            <h3 className="ed-serif text-4xl md:text-6xl italic mb-8 leading-[0.95]">
              Ready to document
              <br />
              the next chapter?
            </h3>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={goAuth}
                className="px-8 py-4 bg-[#141B26] text-[#F9F8F3] text-[12px] uppercase tracking-[0.2em] hover:bg-[#B35C44] transition-colors"
              >
                {user ? "Open Dashboard" : "Sign In"}
              </button>
              <button
                onClick={() => navigate("/register-organization")}
                className="px-8 py-4 border border-[#141B26]/30 text-[12px] uppercase tracking-[0.2em] hover:bg-[#141B26] hover:text-[#F9F8F3] transition-all"
              >
                Register Organization
              </button>
            </div>
          </div>
          <div className="col-span-12 lg:col-span-6 flex flex-col justify-end">
            <div className="grid grid-cols-2 gap-12 text-[10px] uppercase tracking-[0.25em] font-medium text-[#141B26]/40">
              <div className="space-y-3">
                <p className="text-[#141B26]/80">Platform</p>
                <a href="#methodology" className="block hover:text-[#B35C44] transition-colors">Modules</a>
                <a href="#impact" className="block hover:text-[#B35C44] transition-colors">Impact</a>
                <a href="#archive" className="block hover:text-[#B35C44] transition-colors">Case Studies</a>
              </div>
              <div className="space-y-3">
                <p className="text-[#141B26]/80">Organization</p>
                <a href="/auth" className="block hover:text-[#B35C44] transition-colors">Sign In</a>
                <a href="/donor/login" className="block hover:text-[#B35C44] transition-colors">Donor Portal</a>
                <a href="/whistleblower" className="block hover:text-[#B35C44] transition-colors">Report a Concern</a>
              </div>
            </div>
            <div className="mt-12 pt-6 border-t border-[#141B26]/10 flex flex-wrap justify-between items-center text-[10px] text-[#141B26]/30 uppercase tracking-[0.25em] gap-4">
              <p>&copy; {new Date().getFullYear()} Ufanisi Systems</p>
              <p>Built for the humanity behind the metrics.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
