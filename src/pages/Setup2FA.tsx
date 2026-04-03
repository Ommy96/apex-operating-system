import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Setup2FA() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"info" | "enroll" | "verify">("info");
  const [qrSvg, setQrSvg] = useState("");
  const [secret, setSecret] = useState("");
  const [factorId, setFactorId] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEnroll = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
      if (error) throw error;
      setQrSvg(data.totp.qr_code);
      setSecret(data.totp.secret);
      setFactorId(data.id);
      setStep("enroll");
    } catch (e: any) {
      toast.error(e.message || "Failed to enroll");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    try {
      const { data: challengeData, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeErr) throw challengeErr;
      const { error: verifyErr } = await supabase.auth.mfa.verify({ factorId, challengeId: challengeData.id, code });
      if (verifyErr) throw verifyErr;
      toast.success("2FA enabled successfully!");
      setStep("verify");
      setTimeout(() => navigate("/dashboard"), 1500);
    } catch (e: any) {
      toast.error(e.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Two-Factor Authentication Required</CardTitle>
          <CardDescription>Your role requires 2FA for enhanced security</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === "info" && (
            <>
              <p className="text-sm text-muted-foreground">As an administrator or finance role, you must set up two-factor authentication before accessing the dashboard.</p>
              <Button onClick={handleEnroll} disabled={loading} className="w-full">
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null} Set Up 2FA
              </Button>
            </>
          )}
          {step === "enroll" && (
            <>
              <p className="text-sm text-muted-foreground">Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.):</p>
              <div className="flex justify-center p-4 bg-white rounded-lg" dangerouslySetInnerHTML={{ __html: qrSvg }} />
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Or enter this key manually:</p>
                <code className="text-xs bg-muted px-2 py-1 rounded select-all">{secret}</code>
              </div>
              <div>
                <Label>Enter 6-digit code from your app</Label>
                <Input value={code} onChange={e => setCode(e.target.value)} placeholder="000000" maxLength={6} className="text-center text-lg tracking-widest" />
              </div>
              <Button onClick={handleVerify} disabled={code.length !== 6 || loading} className="w-full">
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null} Verify & Enable
              </Button>
            </>
          )}
          {step === "verify" && (
            <div className="text-center space-y-3">
              <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto" />
              <p className="font-medium text-foreground">2FA Enabled Successfully!</p>
              <p className="text-sm text-muted-foreground">Redirecting to dashboard...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
