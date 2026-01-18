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
  Users,
  Globe,
  Heart,
  Lock,
  Zap,
  TrendingUp,
  FileSpreadsheet,
  AlertTriangle,
  Eye,
  Cog
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const problems = [
    { icon: FileSpreadsheet, text: "Scattered data across Excel sheets and tools" },
    { icon: AlertTriangle, text: "Manual, time-consuming donor reporting" },
    { icon: Eye, text: "Weak monitoring & evaluation systems" },
    { icon: TrendingUp, text: "Limited visibility into program performance" },
    { icon: Cog, text: "Tools that are too complex or too expensive" },
  ];

  const coreFeatures = [
    {
      icon: Building2,
      title: "Multi-Organization Ready",
      description: "Each organization gets its own secure workspace with full data isolation."
    },
    {
      icon: BarChart3,
      title: "Monitoring & Evaluation Engine",
      description: "Custom indicators (output & outcome), targets and progress tracking, monthly, quarterly, and annual reporting."
    },
    {
      icon: FolderKanban,
      title: "Program & Project Management",
      description: "Multiple programs per organization, locations, timelines, and donors linked with activity-level data capture."
    },
    {
      icon: DollarSign,
      title: "Donor & Funding Tracking",
      description: "Link donors to programs, generate donor-specific reports, improve accountability and transparency."
    },
    {
      icon: FileBarChart,
      title: "Reports & Dashboards",
      description: "Program performance summaries, indicator progress reports, export to Excel and PDF."
    },
    {
      icon: Shield,
      title: "Roles & Permissions",
      description: "Organization Admins, M&E Officers, Data Entry Officers, and View-only users with granular access control."
    }
  ];

  const targetAudience = [
    "Local & international NGOs",
    "Community-Based Organizations (CBOs)",
    "Faith-Based Organizations (FBOs)",
    "Social impact projects",
    "Donor-funded programs"
  ];

  const whyChoose = [
    "Designed for NGOs, not generic businesses",
    "Lightweight and easy to use",
    "Built with M&E best practices",
    "Affordable for local organizations",
    "Works in low-resource settings",
    "Grows with your organization"
  ];

  const howItWorks = [
    "Create your organization account",
    "Set up users and roles",
    "Define programs and indicators",
    "Capture data from the field",
    "Track progress and generate reports"
  ];

  const securityFeatures = [
    "Organization-level data isolation",
    "Role-based access control",
    "Secure authentication",
    "Data ownership remains with your organization"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900">
      {/* Header */}
      <header className="bg-white/5 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-xl backdrop-blur-sm border border-emerald-500/30">
                <Target className="w-7 h-7 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">Ufanisi</h1>
                <p className="text-xs text-emerald-400/80">Data that drives real impact</p>
              </div>
            </div>
            <nav className="hidden md:flex items-center gap-6 text-sm text-white/70">
              <a href="#features" className="hover:text-white transition-colors">Features</a>
              <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
              <a href="#security" className="hover:text-white transition-colors">Security</a>
            </nav>
            <Button 
              onClick={() => navigate(user ? '/dashboard' : '/auth')}
              className="bg-emerald-500 hover:bg-emerald-600 text-white border-0"
              size="sm"
            >
              {user ? 'Dashboard' : 'Sign In'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-32">
        <div className="text-center animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm mb-6">
            <Zap className="w-4 h-4" />
            One platform. Many organizations. Measurable impact.
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight tracking-tight">
            Empower Your NGO with
            <br />
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              Data-Driven Impact
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-white/70 mb-10 max-w-3xl mx-auto leading-relaxed">
            Ufanisi helps NGOs, CBOs, and social impact organizations manage programs, donors, 
            indicators, and reports — all in one secure system built for real-world field work.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="lg" 
              onClick={() => navigate('/auth')}
              className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 px-8"
            >
              Request a Demo
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10 px-8"
              onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
            >
              See How It Works
            </Button>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="bg-white/5 backdrop-blur-sm border-y border-white/10 py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">The Problem We Solve</h2>
            <p className="text-white/60 text-lg">Many organizations struggle with:</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {problems.map((problem, index) => (
              <div 
                key={index}
                className="flex flex-col items-center text-center p-6 rounded-xl bg-white/5 border border-white/10 hover:border-emerald-500/30 transition-colors"
              >
                <problem.icon className="w-8 h-8 text-orange-400 mb-3" />
                <p className="text-white/80 text-sm">{problem.text}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-emerald-400 mt-8 text-lg font-medium">
            Ufanisi was built to solve these challenges — simply and affordably.
          </p>
        </div>
      </section>

      {/* What Is Ufanisi */}
      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
                What Is <span className="text-emerald-400">Ufanisi</span>?
              </h2>
              <p className="text-white/70 text-lg mb-6 leading-relaxed">
                <strong className="text-white">Ufanisi</strong> (Swahili for <em>effectiveness</em>) is a secure, 
                multi-organization data platform that enables NGOs to:
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  "Manage programs and projects",
                  "Track beneficiaries and activities",
                  "Define and monitor indicators",
                  "Generate donor-ready reports",
                  "Make evidence-based decisions"
                ].map((item, index) => (
                  <li key={index} className="flex items-center gap-3 text-white/80">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="text-emerald-400 font-medium italic">
                Built by practitioners, for practitioners.
              </p>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-3xl blur-3xl" />
              <div className="relative bg-white/5 border border-white/10 rounded-2xl p-8">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
                    <Target className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                    <p className="text-white font-semibold">Multi-Tenant</p>
                    <p className="text-white/60 text-sm">Secure isolation</p>
                  </div>
                  <div className="bg-teal-500/10 border border-teal-500/20 rounded-xl p-4 text-center">
                    <BarChart3 className="w-8 h-8 text-teal-400 mx-auto mb-2" />
                    <p className="text-white font-semibold">M&E Ready</p>
                    <p className="text-white/60 text-sm">Built-in tracking</p>
                  </div>
                  <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4 text-center">
                    <FileBarChart className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                    <p className="text-white font-semibold">Reports</p>
                    <p className="text-white/60 text-sm">Donor-ready</p>
                  </div>
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
                    <Shield className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                    <p className="text-white font-semibold">Secure</p>
                    <p className="text-white/60 text-sm">Role-based access</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section id="features" className="bg-white/5 backdrop-blur-sm border-y border-white/10 py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Core Features</h2>
            <p className="text-white/60 text-lg">Everything you need to manage your programs effectively</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {coreFeatures.map((feature, index) => (
              <Card 
                key={index}
                className="bg-white/5 backdrop-blur-sm border-white/10 hover:border-emerald-500/30 transition-all duration-300"
              >
                <CardHeader>
                  <div className="p-3 bg-emerald-500/10 rounded-xl w-fit border border-emerald-500/20 mb-2">
                    <feature.icon className="w-6 h-6 text-emerald-400" />
                  </div>
                  <CardTitle className="text-white text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-white/60 leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Who Is It For */}
      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">Who Ufanisi Is For</h2>
              <div className="space-y-4 mb-8">
                {targetAudience.map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                      {index === 0 && <Globe className="w-5 h-5 text-emerald-400" />}
                      {index === 1 && <Users className="w-5 h-5 text-emerald-400" />}
                      {index === 2 && <Heart className="w-5 h-5 text-emerald-400" />}
                      {index === 3 && <Target className="w-5 h-5 text-emerald-400" />}
                      {index === 4 && <DollarSign className="w-5 h-5 text-emerald-400" />}
                    </div>
                    <span className="text-white/80 text-lg">{item}</span>
                  </div>
                ))}
              </div>
              <p className="text-white/60 italic">
                Whether you manage one program or many, Ufanisi scales with you.
              </p>
            </div>
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">Why Choose Ufanisi?</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {whyChoose.map((item, index) => (
                  <div key={index} className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <span className="text-white/80 text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-white/5 backdrop-blur-sm border-y border-white/10 py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">How It Works</h2>
            <p className="text-white/60 text-lg">Get started in five simple steps</p>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {howItWorks.map((step, index) => (
              <div key={index} className="flex flex-col items-center text-center flex-1">
                <div className="w-12 h-12 rounded-full bg-emerald-500 text-white font-bold text-lg flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/25">
                  {index + 1}
                </div>
                <p className="text-white/80 text-sm max-w-[150px]">{step}</p>
                {index < howItWorks.length - 1 && (
                  <ArrowRight className="w-6 h-6 text-white/30 hidden md:block absolute right-0 top-1/2 -translate-y-1/2" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security & Trust */}
      <section id="security" className="py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 mb-6">
              <Lock className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Data Security & Trust</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {securityFeatures.map((item, index) => (
              <div key={index} className="flex items-center gap-3 p-5 rounded-xl bg-white/5 border border-white/10">
                <Shield className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <span className="text-white/80">{item}</span>
              </div>
            ))}
          </div>
          <p className="text-center text-emerald-400 font-semibold text-lg">
            Your data. Your impact. Your control.
          </p>
        </div>
      </section>

      {/* Built From Experience */}
      <section className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-y border-white/10 py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">Built From Real NGO Experience</h2>
          <p className="text-white/70 text-lg leading-relaxed mb-4">
            Ufanisi was developed by <strong className="text-white">Inrefa Tech Solutions</strong> from real field experience 
            working with community programs, donors, and monitoring & evaluation teams.
          </p>
          <p className="text-emerald-400 font-medium italic">
            It reflects how NGOs actually work — not how software thinks they should.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 sm:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Ready to strengthen your monitoring, reporting, and impact?
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="lg" 
              onClick={() => navigate('/auth')}
              className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 px-8"
            >
              Request a Demo
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10 px-8"
            >
              Join the Ufanisi Pilot Program
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900/50 backdrop-blur-sm border-t border-white/10 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-500/30">
                <Target className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-white font-semibold">Ufanisi</p>
                <p className="text-white/60 text-sm">A product of Inrefa Tech Solutions</p>
              </div>
            </div>
            <nav className="flex items-center gap-6 text-sm text-white/60">
              <a href="#" className="hover:text-white transition-colors">About</a>
              <a href="#features" className="hover:text-white transition-colors">Features</a>
              <a href="#" className="hover:text-white transition-colors">Demo</a>
              <a href="#" className="hover:text-white transition-colors">Contact</a>
            </nav>
          </div>
          <div className="border-t border-white/10 mt-8 pt-8 text-center">
            <p className="text-white/40 text-sm">
              Ufanisi © 2026 — Empowering organizations to deliver measurable impact
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
