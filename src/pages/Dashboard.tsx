import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  GraduationCap, 
  UtensilsCrossed, 
  Heart,
  TrendingUp,
  FileText,
  Plus,
  Eye
} from "lucide-react";

const Dashboard = () => {
  const stats = [
    {
      title: "Total Children",
      value: "847",
      description: "Active beneficiaries",
      icon: Users,
      gradient: "bg-gradient-primary",
      change: "+23 this month"
    },
    {
      title: "Education Program",
      value: "623",
      description: "Children in school",
      icon: GraduationCap,
      gradient: "bg-gradient-secondary",
      change: "+12 this month"
    },
    {
      title: "Feeding Program",
      value: "502",
      description: "Daily meals served",
      icon: UtensilsCrossed,
      gradient: "bg-gradient-warm",
      change: "+8 this month"
    },
    {
      title: "Kipawa Program",
      value: "156",
      description: "Talent development",
      icon: Heart,
      gradient: "bg-accent",
      change: "+5 this month"
    }
  ];

  const recentActivities = [
    {
      title: "New child registration",
      description: "Mary Wanjiku (Age 8) added to Education Program",
      time: "2 hours ago",
      type: "success"
    },
    {
      title: "School visit completed",
      description: "Kibera Primary School - 15 children visited",
      time: "4 hours ago",
      type: "info"
    },
    {
      title: "Feeding report submitted",
      description: "Kawangware site - 89 meals served today",
      time: "6 hours ago",
      type: "success"
    },
    {
      title: "Home visit scheduled",
      description: "5 families in Kibera - Tomorrow 9:00 AM",
      time: "1 day ago",
      type: "warning"
    }
  ];

  const quickActions = [
    { title: "Add New Child", icon: Plus, variant: "default" as const },
    { title: "Submit Report", icon: FileText, variant: "secondary" as const },
    { title: "View Reports", icon: Eye, variant: "outline" as const },
    { title: "Schedule Visit", icon: Users, variant: "accent" as const }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Welcome back, Admin
        </h1>
        <p className="text-muted-foreground">
          Here's what's happening with Heart to Heart Organization today.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={stat.title} className="shadow-soft hover:shadow-medium transition-all duration-200 animate-scale-in" style={{animationDelay: `${index * 100}ms`}}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-md ${stat.gradient}`}>
                <stat.icon className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground mb-1">
                {stat.value}
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                {stat.description}
              </p>
              <p className="text-xs text-success font-medium">
                {stat.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Actions */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Common tasks and operations
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            {quickActions.map((action, index) => (
              <Button
                key={action.title}
                variant={action.variant}
                className="h-20 flex-col gap-2 text-xs"
              >
                <action.icon className="h-5 w-5" />
                {action.title}
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card className="lg:col-span-2 shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Recent Activities
            </CardTitle>
            <CardDescription>
              Latest updates from all programs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity, index) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    activity.type === 'success' ? 'bg-success' :
                    activity.type === 'warning' ? 'bg-warning' :
                    'bg-primary'
                  }`} />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      {activity.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activity.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4">
              View All Activities
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Program Overview */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Program Distribution</CardTitle>
            <CardDescription>
              Children enrolled by program type
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-primary rounded-full"></div>
                  <span className="text-sm">Education Program</span>
                </div>
                <span className="font-medium">623 (73.6%)</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-secondary rounded-full"></div>
                  <span className="text-sm">Feeding Program</span>
                </div>
                <span className="font-medium">502 (59.3%)</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-accent rounded-full"></div>
                  <span className="text-sm">Kipawa Program</span>
                </div>
                <span className="font-medium">156 (18.4%)</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-warning rounded-full"></div>
                  <span className="text-sm">Empowerment</span>
                </div>
                <span className="font-medium">89 (10.5%)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Recent Reports</CardTitle>
            <CardDescription>
              Latest program reports and visits
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {["Monthly Education Report", "Feeding Program Update", "Home Visit Summary", "Kipawa Progress Report"].map((report, index) => (
                <div key={index} className="flex items-center justify-between p-2 rounded-md bg-muted/30">
                  <span className="text-sm">{report}</span>
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4">
              View All Reports
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;