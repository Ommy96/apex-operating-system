import { Link, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { ApexLogo } from "@/components/brand/ApexLogo";
import { PRODUCT_NAME, VENDOR } from "@/config/brand";

/**
 * Lightweight legal pages backing the auth footer links.
 * Rendered for both /privacy and /terms.
 */
export default function Legal() {
  const { pathname } = useLocation();
  const isPrivacy = pathname.startsWith("/privacy");

  return (
    <main className="min-h-screen bg-background px-4 py-12 sm:px-6">
      <div className="mx-auto w-full max-w-2xl space-y-8">
        <Link to="/auth" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to sign in
        </Link>
        <ApexLogo />
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          {isPrivacy ? "Privacy Policy" : "Terms of Service"}
        </h1>
        {isPrivacy ? (
          <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p>
              {PRODUCT_NAME} is operated by {VENDOR}. We process organisational and programme data
              solely on behalf of the organisation that owns it. Each organisation&apos;s data is
              isolated at the database level and accessible only to its authorised members.
            </p>
            <p>
              Personal data relating to children and other vulnerable participants is treated as
              sensitive: it is encrypted in transit and at rest, stored in private buckets, and
              exposed only through time-limited, access-controlled links.
            </p>
            <p>
              We do not sell personal data or use it to train third-party models. To request access,
              correction, export or deletion of your data, contact your organisation administrator
              or {VENDOR}.
            </p>
          </div>
        ) : (
          <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p>
              By creating an account you agree to use {PRODUCT_NAME} lawfully and only for the
              programme, funding and impact management purposes of your organisation.
            </p>
            <p>
              You are responsible for the accuracy of the data you enter, for keeping your
              credentials secure, and for ensuring that anyone you invite is authorised to access
              your organisation&apos;s records.
            </p>
            <p>
              Service availability, support and data-retention commitments are set out in your
              organisation&apos;s subscription agreement with {VENDOR}.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}