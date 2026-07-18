import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  CheckCircle2,
  Zap,
  Users,
  Coins,
  Wifi,
  Sparkles,
  BarChart3,
  Layers,
  MapPin,
  Check,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ApexLogo } from "@/components/brand/ApexLogo";
import { PRODUCT_NAME, PRODUCT_TAGLINE, VENDOR } from "@/config/brand";

const differentiators = [
  {
    icon: Coins,
    title: "Impact Allocation Engine",
    body: "Every dollar traceable from donor to beneficiary. Restricted funds flow only where their compliance allows; unrestricted funds top up projects on demand — auditable end-to-end.",
  },
  {
    icon: Wifi,
    title: "Built for Africa",
    body: "Native M-Pesa disbursement, offline-first field capture with background sync, multi-currency ledgers with live FX. Works on a 3G handset in a rural sub-county.",
  },
  {
    icon: Sparkles,
    title: "Practitioner-Built",
    body: "Designed with organizations delivering programs today — not consultants. Beneficiary-first data models, sector-standard M&E, and workflows that match how field teams actually work.",
  },
];

const problems = [
  "Beneficiary lists in one spreadsheet, budgets in another, donor reports in email chains.",
  "Programme managers rekeying field data into indicators; indicators rekeyed into donor reports.",
  "No traceable line from a donation to the beneficiary it served.",
  "Field teams collecting on paper because the tool doesn't work offline.",
];

const screenshots = [
  {
    title: "Beneficiary Care File",
    body: "One profile — enrollments, visits, indicators, guardians, consent, donors and risk in a single timeline.",
    icon: Users,
  },
  {
    title: "Donor Impact Feed",
    body: "Scope-aware reports. Project donors get project reports; program donors get roll-ups; sponsors get their beneficiary's story.",
    icon: BarChart3,
  },
  {
    title: "Impact Allocation Engine",
    body: "Move unrestricted funds to projects, direct grants to beneficiaries, and see restricted-fund compliance in real time.",
    icon: Layers,
  },
  {
    title: "Analytics & Field Mode",
    body: "Live Money, Impact and Operations tabs plus offline Field Mode with GPS-tagged visits — synced when back online.",
    icon: MapPin,
  },
];

const audiences = [
  "NGOs & INGOs",
  "Community-Based Organizations",
  "Foundations & Grantmakers",
  "Faith-Based Organizations",
  "Social Enterprises",
  "Government & Multilateral Partners",
];

const pricingTiers = [
  {
    name: "Pilot",
    price: "Free",
    period: "for 3 months",
    tagline: "For teams evaluating a full deployment.",
    features: [
      "Up to 250 beneficiaries",
      "Up to 5 staff seats",
      "M-Pesa sandbox, offline field mode",
      "Community support",
    ],
    cta: "Start pilot",
    highlight: false,
  },
  {
    name: "Growth",
    price: "Contact us",
    period: "per organization / year",
    tagline: "Full platform for a delivery-focused organization.",
    features: [
      "Unlimited beneficiaries",
      "Up to 50 staff seats",
      "M-Pesa production, donor & board portals",
      "Priority support",
    ],
    cta: "Request a demo",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "multi-org / federation",
    tagline: "For federations, funders and multi-country programs.",
    features: [
      "Multi-branch, multi-country",
      "Unlimited seats, custom roles",
      "SSO, audit exports, dedicated CSM",
      "SLA-backed support",
    ],
    cta: "Talk to us",
    highlight: false,
  },
];

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-hero)" }}>
      <a href="#landing-main" className="skip-to-content">
        Skip to main content
      </a>

      {/* Header */}
      <header
        role="banner"
        className="backdrop-blur-md border-b sticky top-0 z-50"
        style={{ background: "rgba(10,15,30,0.7)", borderColor: "rgba(255,255,255,0.08)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <ApexLogo variant="mark" />
              <div>
                <h1
                  className="text-xl font-semibold text-white tracking-tight"
                  style={{ letterSpacing: "-0.3px" }}
                >
                  {PRODUCT_NAME}
                </h1>
                <p className="text-[11px]" style={{ color: "var(--accent-mid)" }}>
                  {PRODUCT_TAGLINE}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="#product"
                className="hidden md:inline text-sm px-3 py-2 rounded-md"
                style={{ color: "rgba(255,255,255,0.7)" }}
              >
                Product
              </a>
              <a
                href="#pricing"
                className="hidden md:inline text-sm px-3 py-2 rounded-md"
                style={{ color: "rgba(255,255,255,0.7)" }}
              >
                Pricing
              </a>
              <Button
                onClick={() => navigate("/donor/login")}
                variant="outline"
                size="sm"
                className="bg-transparent border-white/20 text-white/80 hover:bg-white/10 hover:text-white whitespace-nowrap"
              >
                Donor Portal
              </Button>
              <Button
                onClick={() => navigate(user ? "/dashboard" : "/auth")}
                size="sm"
                className="text-white border-0"
                style={{ background: "var(--accent-brand)" }}
              >
                {user ? "Dashboard" : "Sign In"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main id="landing-main" role="main">
        {/* Hero */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-10 sm:pt-24 sm:pb-16">
          <div className="grid lg:grid-cols-[1.1fr_1fr] gap-10 items-center">
            <div className="animate-fade-in">
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] mb-6"
                style={{
                  background: "rgba(29,158,138,0.12)",
                  border: "1px solid rgba(29,158,138,0.25)",
                  color: "var(--accent-mid)",
                }}
              >
                <Zap className="w-3.5 h-3.5" />
                Universal · Multi-tenant · Offline-capable · AI-assisted
              </div>
              <h1
                className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-white mb-5 leading-[1.05]"
                style={{ letterSpacing: "-1.2px" }}
              >
                The operating system for
                <br />
                <span style={{ color: "var(--accent-mid)" }}>mission-driven organizations.</span>
              </h1>
              <p
                className="text-lg mb-8 max-w-xl leading-relaxed"
                style={{ color: "rgba(255,255,255,0.65)" }}
              >
                One platform for programs, beneficiaries, donors, finance, M&amp;E and field
                operations — with donor-to-beneficiary traceability built in.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  size="lg"
                  onClick={() => navigate("/register-organization")}
                  className="text-white shadow-lg px-8 border-0"
                  style={{
                    background: "var(--accent-brand)",
                    boxShadow: "0 8px 24px rgba(15,123,108,0.3)",
                  }}
                >
                  Request a Demo
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() =>
                    document.getElementById("product")?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="text-white bg-transparent hover:bg-white/10 hover:text-white px-8"
                  style={{ borderColor: "rgba(255,255,255,0.35)" }}
                >
                  See the product
                </Button>
              </div>
            </div>
            <div className="relative">
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  border: "1px solid rgba(255,255,255,0.1)",
                  boxShadow: "0 24px 60px -20px rgba(0,0,0,0.6)",
                }}
              >
                <img
                  src="/apexos-og.png"
                  alt="ApexOS — The Impact Operating System"
                  width={1200}
                  height={630}
                  className="w-full h-auto block"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Social proof */}
        <section className="py-8 border-y" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-[13px] uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>
              Trusted in production by
            </p>
            <p className="text-white text-lg">
              Heart to Heart Organization,{" "}
              <span style={{ color: "rgba(255,255,255,0.6)" }}>in partnership with</span>{" "}
              NSP-AID Norway
            </p>
          </div>
        </section>

        {/* Problem */}
        <section className="py-20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mb-10">
              <p className="text-[13px] uppercase tracking-widest mb-3" style={{ color: "var(--accent-mid)" }}>
                The problem
              </p>
              <h2 className="text-3xl sm:text-4xl font-semibold text-white leading-tight" style={{ letterSpacing: "-0.6px" }}>
                Impact organizations are running on disconnected tools.
              </h2>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {problems.map((p) => (
                <div
                  key={p}
                  className="rounded-xl p-5 text-[15px] leading-relaxed"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "rgba(255,255,255,0.75)",
                  }}
                >
                  {p}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Differentiators */}
        <section
          id="product"
          className="py-20 border-y"
          style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mb-12">
              <p className="text-[13px] uppercase tracking-widest mb-3" style={{ color: "var(--accent-mid)" }}>
                Why ApexOS
              </p>
              <h2 className="text-3xl sm:text-4xl font-semibold text-white leading-tight" style={{ letterSpacing: "-0.6px" }}>
                Three things no generic PM tool will give you.
              </h2>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {differentiators.map(({ icon: Icon, title, body }) => (
                <div
                  key={title}
                  className="rounded-2xl p-6"
                  style={{
                    background: "rgba(10,15,30,0.6)",
                    border: "1px solid rgba(29,158,138,0.2)",
                  }}
                >
                  <div
                    className="inline-flex p-2.5 rounded-lg mb-4"
                    style={{
                      background: "rgba(29,158,138,0.15)",
                      border: "1px solid rgba(29,158,138,0.3)",
                    }}
                  >
                    <Icon className="w-5 h-5" style={{ color: "var(--accent-mid)" }} />
                  </div>
                  <h3 className="text-white text-xl font-semibold mb-2">{title}</h3>
                  <p className="text-[14.5px] leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
                    {body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Product screenshots */}
        <section className="py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mb-10">
              <p className="text-[13px] uppercase tracking-widest mb-3" style={{ color: "var(--accent-mid)" }}>
                Inside the product
              </p>
              <h2 className="text-3xl sm:text-4xl font-semibold text-white leading-tight" style={{ letterSpacing: "-0.6px" }}>
                Real UI. Real data models. Not a marketing mockup.
              </h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {screenshots.map(({ icon: Icon, title, body }) => (
                <div
                  key={title}
                  className="rounded-2xl p-6 flex gap-4"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div
                    className="shrink-0 h-11 w-11 rounded-lg inline-flex items-center justify-center"
                    style={{
                      background: "rgba(29,158,138,0.15)",
                      border: "1px solid rgba(29,158,138,0.3)",
                    }}
                  >
                    <Icon className="w-5 h-5" style={{ color: "var(--accent-mid)" }} />
                  </div>
                  <div>
                    <h3 className="text-white text-lg font-semibold mb-1">{title}</h3>
                    <p className="text-[14.5px] leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
                      {body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Who it's for */}
        <section
          className="py-20 border-y"
          style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}
        >
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mb-8">
              <p className="text-[13px] uppercase tracking-widest mb-3" style={{ color: "var(--accent-mid)" }}>
                Who it's for
              </p>
              <h2 className="text-3xl sm:text-4xl font-semibold text-white leading-tight" style={{ letterSpacing: "-0.6px" }}>
                One platform, every kind of mission-driven organization.
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {audiences.map((a) => (
                <span
                  key={a}
                  className="px-4 py-2 rounded-full text-sm"
                  style={{
                    background: "rgba(29,158,138,0.08)",
                    border: "1px solid rgba(29,158,138,0.25)",
                    color: "rgba(255,255,255,0.85)",
                  }}
                >
                  {a}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <p className="text-[13px] uppercase tracking-widest mb-3" style={{ color: "var(--accent-mid)" }}>
                Pricing
              </p>
              <h2 className="text-3xl sm:text-4xl font-semibold text-white leading-tight" style={{ letterSpacing: "-0.6px" }}>
                Start with a free pilot. Grow when you're ready.
              </h2>
              <p className="mt-4" style={{ color: "rgba(255,255,255,0.55)" }}>
                All tiers include offline field mode, donor portal, M&amp;E and analytics.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {pricingTiers.map((tier) => (
                <div
                  key={tier.name}
                  className="rounded-2xl p-6 flex flex-col"
                  style={{
                    background: tier.highlight ? "rgba(29,158,138,0.08)" : "rgba(255,255,255,0.04)",
                    border: tier.highlight
                      ? "1px solid rgba(29,158,138,0.5)"
                      : "1px solid rgba(255,255,255,0.08)",
                    boxShadow: tier.highlight ? "0 16px 40px -12px rgba(15,123,108,0.3)" : "none",
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-white text-xl font-semibold">{tier.name}</h3>
                    {tier.highlight && (
                      <span
                        className="text-[11px] px-2 py-0.5 rounded-full"
                        style={{ background: "var(--accent-brand)", color: "white" }}
                      >
                        Most popular
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-3xl font-semibold text-white">{tier.price}</span>
                  </div>
                  <p className="text-[12.5px] mb-4" style={{ color: "rgba(255,255,255,0.5)" }}>
                    {tier.period}
                  </p>
                  <p className="text-[14px] mb-5" style={{ color: "rgba(255,255,255,0.7)" }}>
                    {tier.tagline}
                  </p>
                  <ul className="space-y-2 mb-6 flex-1">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-[14px]" style={{ color: "rgba(255,255,255,0.75)" }}>
                        <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--accent-mid)" }} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    onClick={() => navigate("/register-organization")}
                    className="text-white border-0 w-full"
                    style={{
                      background: tier.highlight ? "var(--accent-brand)" : "rgba(255,255,255,0.08)",
                    }}
                  >
                    {tier.cta}
                  </Button>
                </div>
              ))}
            </div>
            <p className="text-center text-[12.5px] mt-6" style={{ color: "rgba(255,255,255,0.4)" }}>
              Indicative pricing. Contact us for confirmed rates and multi-org discounts.
            </p>
          </div>
        </section>

        {/* Final CTA */}
        <section
          className="py-20"
          style={{
            background: "rgba(15,123,108,0.08)",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl sm:text-4xl font-semibold text-white mb-4" style={{ letterSpacing: "-0.6px" }}>
              Ready to run your programs on one operating system?
            </h2>
            <p className="mb-8 max-w-xl mx-auto" style={{ color: "rgba(255,255,255,0.6)" }}>
              Book a 30-minute walkthrough. We'll set up a pilot workspace with your sector's starter data.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                size="lg"
                onClick={() => navigate("/register-organization")}
                className="text-white shadow-lg px-8 border-0"
                style={{
                  background: "var(--accent-brand)",
                  boxShadow: "0 8px 24px rgba(15,123,108,0.3)",
                }}
              >
                Request a Demo
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => (window.location.href = "mailto:hello@inferatechs.com")}
                className="text-white hover:bg-white/5 px-8"
                style={{ borderColor: "rgba(255,255,255,0.15)" }}
              >
                Contact sales
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer role="contentinfo" className="py-10" style={{ background: "rgba(10,15,30,0.5)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <ApexLogo variant="mark" />
              <span className="text-white font-semibold">{PRODUCT_NAME}</span>
              <span style={{ color: "rgba(255,255,255,0.3)" }}>•</span>
              <span className="text-[13px]" style={{ color: "rgba(255,255,255,0.5)" }}>
                A product of {VENDOR}
              </span>
            </div>
            <div className="flex items-center gap-5 text-[13px]" style={{ color: "rgba(255,255,255,0.5)" }}>
              <a href="mailto:hello@inferatechs.com" className="hover:text-white">hello@inferatechs.com</a>
              <span>© {new Date().getFullYear()} Infera Tech Solutions</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;