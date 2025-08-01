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

  // Fetch real-time statistics (only when user is authenticated)
  const { data: childrenCount } = useQuery({
    queryKey: ['children-count'],
    queryFn: async () => {
      if (!user) return 48; // Show static count for unauthenticated users
      const { count } = await supabase
        .from('children')
        .select('*', { count: 'exact', head: true });
      return count || 0;
    },
  });

  const { data: educationCount } = useQuery({
    queryKey: ['education-count'],
    queryFn: async () => {
      if (!user) return 48; // Show static count for unauthenticated users
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
      if (!user) return 2; // Show static count for unauthenticated users
      const { count } = await supabase
        .from('feeding_program')
        .select('*', { count: 'exact', head: true });
      return count || 0;
    },
  });

  const { data: talentCount } = useQuery({
    queryKey: ['talent-count'],
    queryFn: async () => {
      if (!user) return 1; // Show static count for unauthenticated users
      const { count } = await supabase
        .from('kipawa_sato')
        .select('*', { count: 'exact', head: true });
      return count || 0;
    },
  });

  // Fetch active programs for dynamic features
  const { data: programsData } = useQuery({
    queryKey: ['active-programs'],
    queryFn: async () => {
      const { data } = await supabase
        .from('programs')
        .select('*')
        .eq('is_active', true)
        .limit(4);
      return data || [];
    },
  });

  // Create dynamic features based on programs, with fallback to static content
  const features = programsData && programsData.length > 0 ? [
    ...programsData.map((program, index) => {
      const icons = [Users, GraduationCap, UtensilsCrossed, Shield];
      return {
        icon: icons[index % icons.length],
        title: program.name,
        description: program.description || "Supporting our community through dedicated programs"
      };
    }),
    // Add any additional static features if we have less than 4 programs
    ...(programsData.length < 4 ? [
      {
        icon: Shield,
        title: "Secure & Reliable",
        description: "Role-based access with comprehensive reporting"
      }
    ].slice(0, 4 - programsData.length) : [])
  ] : [
    // Fallback static features when no programs data
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
          <div className="flex justify-between items-center py-4 sm:py-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Heart className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-white">Heart to Heart</h1>
                <p className="text-xs sm:text-sm text-white/80">Organization</p>
              </div>
            </div>
            <Button 
              onClick={() => navigate(user ? '/dashboard' : '/auth')}
              className="bg-white/20 hover:bg-white/30 text-white border-white/30 text-sm sm:text-base px-3 sm:px-4"
              variant="outline"
              size="sm"
            >
              <span className="hidden sm:inline">{user ? 'Dashboard' : 'Staff Login'}</span>
              <span className="sm:hidden">{user ? 'Dashboard' : 'Login'}</span>
              <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1 sm:ml-2" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <div className="text-center mb-12 sm:mb-16 animate-fade-in">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6 leading-tight">
            Supporting Vulnerable Children
            <br />
            <span className="text-accent-light">in Nairobi</span>
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-white/90 mb-6 sm:mb-8 max-w-3xl mx-auto leading-relaxed px-2">
            Heart to Heart Organization's comprehensive management system for 
            tracking education, feeding programs, talent development, and family assistance 
            across Kibera and Kawangware communities.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center max-w-md sm:max-w-none mx-auto">
            <Button 
              size="lg" 
              onClick={() => navigate(user ? '/dashboard' : '/auth')}
              className="bg-white text-primary hover:bg-white/90 shadow-strong w-full sm:w-auto"
            >
              {user ? 'Go to Dashboard' : 'Access System'}
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10 w-full sm:w-auto"
              onClick={() => window.open('https://www.hearttoheartorganization.org', '_blank')}
            >
              Learn More
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-12 sm:mb-16">
          {features.map((feature, index) => (
            <Card 
              key={feature.title} 
              className="bg-white/10 backdrop-blur-sm border-white/20 shadow-strong text-white animate-scale-in"
              style={{animationDelay: `${index * 150}ms`}}
            >
              <CardHeader className="text-center p-4 sm:p-6">
                <div className="mx-auto mb-3 sm:mb-4 p-2 sm:p-3 bg-white/20 rounded-full w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center">
                  <feature.icon className="w-6 h-6 sm:w-8 sm:h-8" />
                </div>
                <CardTitle className="text-white text-lg sm:text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <CardDescription className="text-white/80 text-center text-sm sm:text-base leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
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
