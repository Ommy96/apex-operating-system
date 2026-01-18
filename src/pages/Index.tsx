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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900">
      {/* Header */}
      <header className="bg-white/5 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-500/30">
                <Target className="w-7 h-7 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">Ufanisi</h1>
                <p className="text-xs text-emerald-400/80">Data that drives real impact</p>
              </div>
            </div>
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
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
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
            >
              See How It Works
            </Button>
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section className="bg-white/5 backdrop-blur-sm border-y border-white/10 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-white mb-2">Core Features</h2>
            <p className="text-white/60">Everything you need to manage programs effectively</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {coreFeatures.map((feature, index) => (
              <Card key={index} className="bg-white/5 border-white/10 hover:border-emerald-500/30 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                      <feature.icon className="w-5 h-5 text-emerald-400" />
                    </div>
                    <CardTitle className="text-white text-lg">{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-white/60">{feature.description}</CardDescription>
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
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
              <h3 className="text-2xl font-bold text-white mb-6">Why Choose Ufanisi?</h3>
              <div className="space-y-3">
                {benefits.map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <span className="text-white/80">{item}</span>
                  </div>
                ))}
              </div>
              <p className="text-emerald-400 mt-6 text-sm italic">
                Built by practitioners, for practitioners.
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <Lock className="w-6 h-6 text-emerald-400" />
                <h3 className="text-2xl font-bold text-white">Data Security</h3>
              </div>
              <div className="space-y-3">
                {["Organization-level data isolation", "Role-based access control", "Secure authentication", "Your data stays yours"].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Shield className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span className="text-white/80">{item}</span>
                  </div>
                ))}
              </div>
              <p className="text-emerald-400 mt-6 font-medium">Your data. Your impact. Your control.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-y border-white/10 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6">
            Ready to strengthen your monitoring, reporting, and impact?
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={() => navigate('/auth')}
              className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 px-8"
            >
              Request a Demo
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 px-8">
              Join the Pilot Program
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900/50 border-t border-white/10 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <Target className="w-5 h-5 text-emerald-400" />
              <span className="text-white font-semibold">Ufanisi</span>
              <span className="text-white/40">•</span>
              <span className="text-white/60 text-sm">A product of Inrefa Tech Solutions</span>
            </div>
            <p className="text-white/40 text-sm">© 2026 — Empowering measurable impact</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
