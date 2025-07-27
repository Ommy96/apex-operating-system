import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Users, GraduationCap, UtensilsCrossed, Shield, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Fetch real-time statistics
  const { data: childrenCount } = useQuery({
    queryKey: ['children-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('children')
        .select('*', { count: 'exact', head: true });
      return count || 0;
    },
  });

  const { data: educationCount } = useQuery({
    queryKey: ['education-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('children')
        .select('*', { count: 'exact', head: true })
        .not('academic_level', 'is', null);
      return count || 0;
    },
  });

  const { data: feedingCount } = useQuery({
    queryKey: ['feeding-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('feeding_program')
        .select('*', { count: 'exact', head: true });
      return count || 0;
    },
  });

  const { data: talentCount } = useQuery({
    queryKey: ['talent-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('kipawa_sato')
        .select('*', { count: 'exact', head: true });
      return count || 0;
    },
  });

  const features = [
    {
      icon: Users,
      title: "Child Management",
      description: "Comprehensive profiles and tracking for all beneficiaries"
    },
    {
      icon: GraduationCap,
      title: "Education Programs",
      description: "Monitor academic progress and school support"
    },
    {
      icon: UtensilsCrossed,
      title: "Feeding Programs",
      description: "Track nutrition support across Kibera and Kawangware"
    },
    {
      icon: Shield,
      title: "Secure & Reliable",
      description: "Role-based access with comprehensive reporting"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Heart className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Heart to Heart</h1>
                <p className="text-sm text-white/80">Organization</p>
              </div>
            </div>
            <Button 
              onClick={() => navigate(user ? '/dashboard' : '/auth')}
              className="bg-white/20 hover:bg-white/30 text-white border-white/30"
              variant="outline"
            >
              {user ? 'Dashboard' : 'Staff Login'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16 animate-fade-in">
          <h1 className="text-5xl font-bold text-white mb-6">
            Supporting Vulnerable Children
            <br />
            <span className="text-accent-light">in Nairobi</span>
          </h1>
          <p className="text-xl text-white/90 mb-8 max-w-3xl mx-auto">
            Heart to Heart Organization's comprehensive management system for 
            tracking education, feeding programs, talent development, and family assistance 
            across Kibera and Kawangware communities.
          </p>
          <div className="flex gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={() => navigate(user ? '/dashboard' : '/auth')}
              className="bg-white text-primary hover:bg-white/90 shadow-strong"
            >
              {user ? 'Go to Dashboard' : 'Access System'}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10"
              onClick={() => window.open('https://www.hearttoheartorganization.org', '_blank')}
            >
              Learn More
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {features.map((feature, index) => (
            <Card 
              key={feature.title} 
              className="bg-white/10 backdrop-blur-sm border-white/20 shadow-strong text-white animate-scale-in"
              style={{animationDelay: `${index * 150}ms`}}
            >
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 bg-white/20 rounded-full w-16 h-16 flex items-center justify-center">
                  <feature.icon className="w-8 h-8" />
                </div>
                <CardTitle className="text-white">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-white/80 text-center">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Stats Section */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 shadow-strong animate-fade-in">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">Making a Difference</h2>
            <p className="text-white/80">Our impact across Nairobi's communities</p>
          </div>
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div className="bg-gradient-card p-6 rounded-xl backdrop-blur-sm border border-white/10 hover:bg-white/15 transition-all duration-300 hover:scale-105 animate-scale-in shadow-elevation-2 hover:shadow-elevation-4" style={{animationDelay: '0ms'}}>
              <div className="text-4xl font-bold text-primary mb-2 transition-colors duration-300">{childrenCount || 0}</div>
              <div className="text-primary font-medium">Children Supported</div>
            </div>
            <div className="bg-gradient-card p-6 rounded-xl backdrop-blur-sm border border-white/10 hover:bg-white/15 transition-all duration-300 hover:scale-105 animate-scale-in shadow-elevation-2 hover:shadow-elevation-4" style={{animationDelay: '100ms'}}>
              <div className="text-4xl font-bold text-primary mb-2 transition-colors duration-300">{educationCount || 0}</div>
              <div className="text-primary font-medium">In Education</div>
            </div>
            <div className="bg-gradient-card p-6 rounded-xl backdrop-blur-sm border border-white/10 hover:bg-white/15 transition-all duration-300 hover:scale-105 animate-scale-in shadow-elevation-2 hover:shadow-elevation-4" style={{animationDelay: '200ms'}}>
              <div className="text-4xl font-bold text-primary mb-2 transition-colors duration-300">{feedingCount || 0}</div>
              <div className="text-primary font-medium">Daily Meals</div>
            </div>
            <div className="bg-gradient-card p-6 rounded-xl backdrop-blur-sm border border-white/10 hover:bg-white/15 transition-all duration-300 hover:scale-105 animate-scale-in shadow-elevation-2 hover:shadow-elevation-4" style={{animationDelay: '300ms'}}>
              <div className="text-4xl font-bold text-primary mb-2 transition-colors duration-300">{talentCount || 0}</div>
              <div className="text-primary font-medium">Talent Development</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white/5 backdrop-blur-sm border-t border-white/20 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-white/60 mb-4">
              Empowering vulnerable children through education, nutrition, and talent development
            </p>
            <div className="flex items-center justify-center gap-2 text-white/80">
              <span>Powered by</span>
              <span className="font-semibold text-accent-light">Infera Tech Solutions</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
