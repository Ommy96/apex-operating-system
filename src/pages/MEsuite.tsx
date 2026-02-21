import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GitBranch, FileText, ClipboardList, AlertTriangle } from "lucide-react";
import { LogFrameBuilder } from "@/components/me/LogFrameBuilder";
import { TheoryOfChange } from "@/components/me/TheoryOfChange";
import { SurveySystem } from "@/components/me/SurveySystem";
import { RiskTracking } from "@/components/me/RiskTracking";

export default function MESuite() {
  const [activeTab, setActiveTab] = useState("logframe");

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">M&E Suite</h1>
        <p className="text-sm text-muted-foreground mt-1">
          LogFrames, Theory of Change, Surveys & Beneficiary Risk Tracking
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto gap-1 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="logframe" className="flex items-center gap-2 text-xs md:text-sm py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <GitBranch className="h-4 w-4" />
            <span className="hidden sm:inline">LogFrame</span>
          </TabsTrigger>
          <TabsTrigger value="toc" className="flex items-center gap-2 text-xs md:text-sm py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Theory of Change</span>
          </TabsTrigger>
          <TabsTrigger value="surveys" className="flex items-center gap-2 text-xs md:text-sm py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">Surveys</span>
          </TabsTrigger>
          <TabsTrigger value="risk" className="flex items-center gap-2 text-xs md:text-sm py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <AlertTriangle className="h-4 w-4" />
            <span className="hidden sm:inline">Risk Tracking</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="logframe" className="mt-6">
          <LogFrameBuilder />
        </TabsContent>
        <TabsContent value="toc" className="mt-6">
          <TheoryOfChange />
        </TabsContent>
        <TabsContent value="surveys" className="mt-6">
          <SurveySystem />
        </TabsContent>
        <TabsContent value="risk" className="mt-6">
          <RiskTracking />
        </TabsContent>
      </Tabs>
    </div>
  );
}
