import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";

export function useCommunications() {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const orgId = currentOrganization?.organization_id;
  const queryClient = useQueryClient();

  // Notifications
  const { data: notifications = [], isLoading: loadingNotifications } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const unreadCount = notifications.filter((n: any) => !n.is_read).length;

  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", notificationId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  // Messages
  const { data: messages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ["stakeholder-messages", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("stakeholder_messages")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });

  const createMessage = useMutation({
    mutationFn: async (msg: {
      channel: string;
      recipient_type: string;
      recipient_name: string;
      recipient_contact?: string;
      subject?: string;
      body: string;
      direction?: string;
    }) => {
      if (!orgId || !user?.id) throw new Error("Not authenticated");
      const { error } = await supabase.from("stakeholder_messages").insert({
        organization_id: orgId,
        sender_id: user.id,
        ...msg,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Message logged successfully");
      queryClient.invalidateQueries({ queryKey: ["stakeholder-messages"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Campaigns
  const { data: campaigns = [], isLoading: loadingCampaigns } = useQuery({
    queryKey: ["campaigns", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });

  const createCampaign = useMutation({
    mutationFn: async (campaign: {
      name: string;
      description?: string;
      channel: string;
      subject?: string;
      body: string;
      target_audience: string;
      recipients: { name: string; email?: string; phone?: string; channel: string }[];
    }) => {
      if (!orgId || !user?.id) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("campaigns")
        .insert({
          organization_id: orgId,
          created_by: user.id,
          name: campaign.name,
          description: campaign.description,
          channel: campaign.channel,
          subject: campaign.subject,
          body: campaign.body,
          target_audience: campaign.target_audience,
          total_recipients: campaign.recipients.length,
        })
        .select()
        .single();
      if (error) throw error;

      // Insert recipients
      if (campaign.recipients.length > 0) {
        const { error: recipError } = await supabase
          .from("campaign_recipients")
          .insert(
            campaign.recipients.map((r) => ({
              campaign_id: data.id,
              organization_id: orgId,
              recipient_name: r.name,
              recipient_email: r.email || null,
              recipient_phone: r.phone || null,
              channel: r.channel,
            }))
          );
        if (recipError) throw recipError;
      }
      return data;
    },
    onSuccess: () => {
      toast.success("Campaign created");
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const sendCampaign = useMutation({
    mutationFn: async (campaignId: string) => {
      const { data, error } = await supabase.functions.invoke("send-campaign", {
        body: { campaign_id: campaignId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Campaign sent: ${data.sent} delivered, ${data.failed} failed`);
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Real-time subscriptions for communications tables
  useRealtimeSubscription([
    { table: "notifications", queryKeys: [["notifications", user?.id || ""]], filterColumn: "user_id", filterValue: user?.id, enabled: !!user?.id },
    { table: "stakeholder_messages", queryKeys: [["stakeholder-messages", orgId || ""]], orgId, enabled: !!orgId },
    { table: "campaigns", queryKeys: [["campaigns", orgId || ""]], orgId, enabled: !!orgId },
  ]);

  const deleteCampaign = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("campaigns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campaign deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMessage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("stakeholder_messages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stakeholder-messages"] });
      toast.success("Message deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return {
    notifications, unreadCount, loadingNotifications, markAsRead, markAllRead,
    messages, loadingMessages, createMessage, deleteMessage,
    campaigns, loadingCampaigns, createCampaign, sendCampaign, deleteCampaign,
  };
}
