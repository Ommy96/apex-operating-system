import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Building2, 
  BarChart3, 
  FolderKanban, 
  DollarSign, 
  FileBarChart, 
  Shield, 
  ArrowRight, 
  CheckCircle2,
  Target,
  Zap,
  Lock
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const coreFeatures = [
    { icon: Building2, title: "Multi-Organization Ready", description: "Secure workspaces with full data isolation" },
    { icon: BarChart3, title: "M&E Engine", description: "Custom indicators, targets, and progress tracking" },
    { icon: FolderKanban, title: "Program Management", description: "Programs, timelines, and activity-level data" },
    { icon: DollarSign, title: "Donor Tracking", description: "Link donors and generate accountability reports" },
    { icon: FileBarChart, title: "Reports & Dashboards", description: "Export to Excel and PDF with one click" },
    { icon: Shield, title: "Roles & Permissions", description: "Granular access control for your team" }
  ];

  const benefits = [
    "Designed for NGOs, not generic businesses",
    "Built with M&E best practices",
    "Affordable for local organizations",
    "Works in low-resource settings"
  ];

  return (
    <div className="min-h-screen" style={{ background: 'var(--gradient-hero)' }}>
      <a href="#landing-main" className="skip-to-content">
        Skip to main content
      </a>
      {/* Header */}
      <header role="banner" aria-label="Site header" className="backdrop-blur-md border-b sticky top-0 z-50" style={{ background: 'rgba(10,15,30,0.7)', borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl" style={{ background: 'rgba(29,158,138,0.15)', border: '1px solid rgba(29,158,138,0.25)' }}>
                <Target className="w-7 h-7" style={{ color: 'var(--accent-mid)' }} />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-white tracking-tight" style={{ letterSpacing: '-0.3px' }}>Ufanisi</h1>
                <p className="text-[11px]" style={{ color: 'var(--accent-mid)' }}>Data that drives real impact</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => navigate('/donor/login')}
                variant="outline"
                size="sm"
                className="bg-transparent border-white/20 text-white/80 hover:bg-white/10 hover:text-white whitespace-nowrap"
              >
                Donor Portal
              </Button>
              <Button 
                onClick={() => navigate(user ? '/dashboard' : '/auth')}
                size="sm"
                className="text-white border-0"
                style={{ background: 'var(--accent-brand)' }}
              >
                {user ? 'Dashboard' : 'Sign In'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main id="landing-main" role="main">
      <section aria-labelledby="hero-heading" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="text-center animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] mb-6" style={{ background: 'rgba(29,158,138,0.12)', border: '1px solid rgba(29,158,138,0.25)', color: 'var(--accent-mid)' }}>
            <Zap className="w-4 h-4" />
            One platform. Many organizations. Measurable impact.
          </div>
          <h1 id="hero-heading" className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-white mb-6 leading-tight" style={{ letterSpacing: '-1px' }}>
            Empower Your NGO with
            <br />
            <span style={{ color: 'var(--accent-mid)' }}>
              Data-Driven Impact
            </span>
          </h1>
          <p className="text-lg sm:text-xl mb-10 max-w-3xl mx-auto leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Ufanisi helps NGOs, CBOs, and social impact organizations manage programs, donors, 
            indicators, and reports — all in one secure system built for real-world field work.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="lg" 
              onClick={() => navigate('/auth')}
              className="text-white shadow-lg px-8 border-0"
              style={{ background: 'var(--accent-brand)', boxShadow: '0 8px 24px rgba(15,123,108,0.3)' }}
            >
              Request a Demo
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="text-white hover:bg-white/5 px-8"
              style={{ borderColor: 'rgba(255,255,255,0.15)' }}
            >
              See How It Works
            </Button>
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section aria-labelledby="features-heading" className="backdrop-blur-sm py-16" style={{ background: 'rgba(255,255,255,0.03)', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 id="features-heading" className="text-3xl font-semibold text-white mb-2">Core Features</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)' }}>Everything you need to manage programs effectively</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {coreFeatures.map((feature, index) => (
              <Card key={index} className="border-0 transition-colors" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg" style={{ background: 'rgba(29,158,138,0.12)', border: '1px solid rgba(29,158,138,0.2)' }}>
                      <feature.icon className="w-5 h-5" style={{ color: 'var(--accent-mid)' }} />
                    </div>
                    <CardTitle className="text-white text-[15px] font-semibold">{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription style={{ color: 'rgba(255,255,255,0.5)' }}>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose + Security */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="rounded-2xl p-8" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 className="text-2xl font-semibold text-white mb-6">Why Choose Ufanisi?</h3>
              <div className="space-y-3">
                {benefits.map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--accent-mid)' }} />
                    <span style={{ color: 'rgba(255,255,255,0.7)' }}>{item}</span>
                  </div>
                ))}
              </div>
              <p className="mt-6 text-[13px] italic" style={{ color: 'var(--accent-mid)' }}>
                Built by practitioners, for practitioners.
              </p>
            </div>
            <div className="rounded-2xl p-8" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-3 mb-6">
                <Lock className="w-6 h-6" style={{ color: 'var(--status-warning)' }} />
                <h3 className="text-2xl font-semibold text-white">Data Security</h3>
              </div>
              <div className="space-y-3">
                {["Organization-level data isolation", "Role-based access control", "Secure authentication", "Your data stays yours"].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Shield className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--status-warning)' }} />
                    <span style={{ color: 'rgba(255,255,255,0.7)' }}>{item}</span>
                  </div>
                ))}
              </div>
              <p className="mt-6 font-medium" style={{ color: 'var(--status-warning)' }}>Your data. Your impact. Your control.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section aria-labelledby="cta-heading" className="py-16" style={{ background: 'rgba(15,123,108,0.08)', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 id="cta-heading" className="text-2xl sm:text-3xl font-semibold text-white mb-6">
            Ready to strengthen your monitoring, reporting, and impact?
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={() => navigate('/auth')}
              className="text-white shadow-lg px-8 border-0"
              style={{ background: 'var(--accent-brand)', boxShadow: '0 8px 24px rgba(15,123,108,0.3)' }}
            >
              Request a Demo
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button size="lg" variant="outline" className="text-white hover:bg-white/5 px-8" style={{ borderColor: 'rgba(255,255,255,0.15)' }}>
              Join the Pilot Program
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      </main>
      <footer role="contentinfo" className="py-8" style={{ background: 'rgba(10,15,30,0.5)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <Target className="w-5 h-5" style={{ color: 'var(--accent-mid)' }} />
              <span className="text-white font-semibold">Ufanisi</span>
              <span style={{ color: 'rgba(255,255,255,0.3)' }}>•</span>
              <span className="text-[13px]" style={{ color: 'rgba(255,255,255,0.5)' }}>A product of Infera Tech Solutions</span>
            </div>
            <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.35)' }}>© 2026 — Empowering measurable impact</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;