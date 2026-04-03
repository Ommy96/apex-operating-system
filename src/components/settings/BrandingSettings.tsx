import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useBranding } from "@/hooks/useBranding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Palette, Upload, X, Target } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export function BrandingSettings() {
  const { currentOrganization } = useOrganization();
  const { primaryColor, logoUrl, orgName } = useBranding();
  const queryClient = useQueryClient();
  const orgId = currentOrganization?.organization_id;

  const [color, setColor] = useState(primaryColor || "#059669");
  const [hexInput, setHexInput] = useState(primaryColor || "#059669");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewLogo, setPreviewLogo] = useState(logoUrl);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (primaryColor) { setColor(primaryColor); setHexInput(primaryColor); }
    setPreviewLogo(logoUrl);
  }, [primaryColor, logoUrl]);

  const handleColorChange = (val: string) => {
    setColor(val);
    setHexInput(val);
  };

  const handleHexInput = (val: string) => {
    setHexInput(val);
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) setColor(val);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !orgId) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("File too large — max 2MB"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${orgId}/logo.${ext}`;
      const { error: upErr } = await supabase.storage.from("org-logos").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("org-logos").getPublicUrl(path);
      setPreviewLogo(urlData.publicUrl);
      toast.success("Logo uploaded");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const removeLogo = () => setPreviewLogo(null);

  const handleSave = async () => {
    if (!orgId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("organizations").update({
        primary_color: color,
        logo_url: previewLogo,
      }).eq("id", orgId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["org-branding"] });
      toast.success("Branding saved");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Logo Upload */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Organisation Logo</Label>
        {previewLogo ? (
          <div className="flex items-center gap-4">
            <img src={previewLogo} alt="Logo" className="h-12 w-auto object-contain rounded border p-1" />
            <Button variant="outline" size="sm" onClick={removeLogo}><X className="h-3 w-3 mr-1" /> Remove</Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No logo uploaded</p>
        )}
        <div>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleLogoUpload} />
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
            <Upload className="h-4 w-4 mr-1" /> {uploading ? "Uploading..." : "Upload Logo"}
          </Button>
          <p className="text-[11px] text-muted-foreground mt-1">PNG, JPG or WebP. Max 2MB.</p>
        </div>
      </div>

      {/* Colour */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Brand Colour</Label>
        <div className="flex items-center gap-3">
          <input type="color" value={color} onChange={e => handleColorChange(e.target.value)} className="h-10 w-20 rounded cursor-pointer border" />
          <Input value={hexInput} onChange={e => handleHexInput(e.target.value)} className="w-28 font-mono" placeholder="#059669" />
        </div>
      </div>

      {/* Live Preview */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Live Preview</Label>
        <Card className="w-[220px]">
          <div className="h-10 rounded-t-lg flex items-center px-3 gap-2" style={{ backgroundColor: color }}>
            {previewLogo ? (
              <img src={previewLogo} alt="" className="h-6 w-6 object-contain rounded" />
            ) : (
              <div className="h-6 w-6 rounded bg-white/20 flex items-center justify-center">
                <Target className="h-3 w-3 text-white" />
              </div>
            )}
            <span className="text-white text-xs font-semibold truncate">{orgName}</span>
          </div>
          <CardContent className="p-3">
            <div className="h-2 w-3/4 rounded bg-muted mb-2" />
            <div className="h-2 w-1/2 rounded bg-muted" />
          </CardContent>
        </Card>
      </div>

      <Button onClick={handleSave} disabled={saving}>
        <Palette className="h-4 w-4 mr-1" /> {saving ? "Saving..." : "Save Branding"}
      </Button>
    </div>
  );
}
