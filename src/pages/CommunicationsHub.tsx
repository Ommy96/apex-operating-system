import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageCircle, Megaphone, Bell } from "lucide-react";
import { PageHeroHeader } from "@/components/PageHeroHeader";
import { StakeholderMessages } from "@/components/communications/StakeholderMessages";
import { CampaignManager } from "@/components/communications/CampaignManager";
import { useCommunications } from "@/hooks/useCommunications";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export default function CommunicationsHub() {
  const [activeTab, setActiveTab] = useState("messages");
  const { notifications, unreadCount, markAsRead } = useCommunications();

  const tabs = [
    { id: "messages", label: "Messages", icon: MessageCircle },
    { id: "campaigns", label: "Campaigns", icon: Megaphone },
    { id: "notifications", label: `Notifications${unreadCount > 0 ? ` (${unreadCount})` : ""}`, icon: Bell },
  ];

  return (
    <div className="space-y-6 pb-8">
      <PageHeroHeader
        icon={MessageCircle}
        title="Communication Hub"
        description="Stakeholder messaging, email & SMS campaigns, and notification center"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="inline-flex h-auto gap-1 p-1 bg-muted/50">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="flex items-center gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="messages">
          <StakeholderMessages />
        </TabsContent>

        <TabsContent value="campaigns">
          <CampaignManager />
        </TabsContent>

        <TabsContent value="notifications">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">All Notifications</h3>
            {notifications.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">No notifications yet</div>
            ) : (
              notifications.map((n: any) => (
                <Card key={n.id} className={cn("border-0 shadow-sm cursor-pointer", !n.is_read && "ring-1 ring-accent/20")}
                  onClick={() => !n.is_read && markAsRead.mutate(n.id)}>
                  <CardContent className="p-3 flex items-start gap-3">
                    <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", !n.is_read ? "bg-accent" : "bg-transparent")} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium">{n.title}</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{n.category}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
