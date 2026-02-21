import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Navigation, Clock, LogOut } from "lucide-react";
import { useHR } from "@/hooks/useHR";
import { format } from "date-fns";
import { toast } from "sonner";

const typeColors: Record<string, string> = {
  field_visit: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  office: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  meeting: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  training: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  other: "bg-muted text-muted-foreground",
};

export function FieldCheckIns() {
  const { checkIns, createCheckIn, checkOut, orgMembers } = useHR();
  const [showManual, setShowManual] = useState(false);
  const [form, setForm] = useState({ check_in_type: "field_visit", location_name: "", notes: "" });
  const [gettingLocation, setGettingLocation] = useState(false);

  const handleGPSCheckIn = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported by your browser");
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        createCheckIn.mutate({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy_meters: pos.coords.accuracy,
          check_in_type: form.check_in_type as any,
          location_name: form.location_name || undefined,
          notes: form.notes || undefined,
        }, {
          onSettled: () => setGettingLocation(false),
          onSuccess: () => setShowManual(false),
        });
      },
      (err) => {
        toast.error("Location access denied: " + err.message);
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const members = orgMembers.data || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">GPS Field Verification</h3>
          <p className="text-sm text-muted-foreground">Track field staff locations and visits</p>
        </div>
        <Dialog open={showManual} onOpenChange={setShowManual}>
          <DialogTrigger asChild>
            <Button size="sm"><Navigation className="h-4 w-4 mr-1" /> Check In</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>GPS Check-In</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Visit Type</Label>
                <Select value={form.check_in_type} onValueChange={(v) => setForm({ ...form, check_in_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="field_visit">Field Visit</SelectItem>
                    <SelectItem value="office">Office</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="training">Training</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Location Name (optional)</Label><Input value={form.location_name} onChange={(e) => setForm({ ...form, location_name: e.target.value })} placeholder="e.g. Kibera Community Center" /></div>
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Brief description of visit" /></div>
              <Button onClick={handleGPSCheckIn} disabled={gettingLocation || createCheckIn.isPending} className="w-full">
                <MapPin className="h-4 w-4 mr-1" /> {gettingLocation ? "Getting location..." : "Record GPS Check-In"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {checkIns.isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : !checkIns.data?.length ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <MapPin className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p>No field check-ins recorded</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {checkIns.data.map((ci: any) => {
            const staffMember = members.find((m) => m.user_id === ci.staff_user_id);
            return (
              <Card key={ci.id} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <MapPin className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{staffMember?.full_name || "Staff"}</p>
                        <p className="text-xs text-muted-foreground">
                          {ci.location_name || `${Number(ci.latitude).toFixed(4)}, ${Number(ci.longitude).toFixed(4)}`}
                          {ci.accuracy_meters && ` (±${Math.round(Number(ci.accuracy_meters))}m)`}
                        </p>
                        {ci.notes && <p className="text-xs text-muted-foreground mt-0.5">{ci.notes}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={typeColors[ci.check_in_type] || ""}>{ci.check_in_type.replace("_", " ")}</Badge>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(ci.checked_in_at), "MMM d, HH:mm")}
                      </div>
                      {!ci.checked_out_at && (
                        <Button size="sm" variant="outline" onClick={() => checkOut.mutate(ci.id)}>
                          <LogOut className="h-3.5 w-3.5 mr-1" /> Out
                        </Button>
                      )}
                      {ci.checked_out_at && (
                        <span className="text-xs text-muted-foreground">Out: {format(new Date(ci.checked_out_at), "HH:mm")}</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
