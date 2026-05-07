import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, CheckCircle2, Loader2, ChevronLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const RATING_LABELS = ["", "Very Poor", "Poor", "Average", "Good", "Excellent"];

export default function SatisfactionForm() {
  const { token } = useParams<{ token: string }>();

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Parse compound token: "complaintId.satisfactionToken"
  const dotIndex = token?.indexOf(".") ?? -1;
  const complaintId = dotIndex > 0 ? token!.substring(0, dotIndex) : null;
  const satisfactionToken = dotIndex > 0 ? token!.substring(dotIndex + 1) : token ?? null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;

    setSubmitting(true);
    setErrorMsg(null);

    try {
      if (!complaintId || !satisfactionToken) {
        throw new Error("Invalid satisfaction link. Please use the link sent to you.");
      }

      const res = await fetch(`/api/v1/complaints/${complaintId}/satisfaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: satisfactionToken, score: rating, feedback }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: { message?: string } };
        throw new Error(body.error?.message ?? `Server error ${res.status}`);
      }

      setSubmitted(true);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 gap-6 text-center">
        <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-12 h-12 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-black uppercase tracking-wider mb-2">Thank You!</h1>
          <p className="text-muted-foreground max-w-sm mx-auto text-sm leading-relaxed">
            Your feedback has been recorded. It helps NERC hold DisCos accountable and improve service for all citizens.
          </p>
        </div>
        <Link
          to="/complaints"
          className="text-xs text-primary hover:underline uppercase tracking-widest font-bold mt-4"
        >
          Return to Portal Home
        </Link>
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">
          WestMetro · NERC Consumer Protection
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-4 sticky top-0 z-10 shadow-md">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <Link to="/complaints" className="text-primary-foreground/80 hover:text-primary-foreground">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2 flex-1 justify-center">
            <span className="inline-flex items-center justify-center bg-white rounded-full p-0.5 shrink-0">
              <img src="/ministry-logo.png" alt="WestMetro" className="h-7 w-7 rounded-full object-cover" />
            </span>
            <div>
              <div className="text-sm font-black uppercase tracking-widest leading-none">WestMetro</div>
              <div className="text-[10px] opacity-85 uppercase tracking-wider">Service Satisfaction</div>
            </div>
          </div>
          <div className="w-5" />
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 mt-6">
        <div className="text-center mb-6">
          <h2 className="text-base font-black uppercase tracking-wider mb-1">Rate Your Experience</h2>
          <p className="text-xs text-muted-foreground">How satisfied are you with how your complaint was handled?</p>
        </div>

        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Star rating */}
              <div className="flex justify-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className="p-2 transition-transform hover:scale-110 active:scale-95"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                    aria-label={`Rate ${star} star${star !== 1 ? "s" : ""}`}
                  >
                    <Star
                      className={`w-10 h-10 transition-colors ${
                        (hoverRating || rating) >= star
                          ? "fill-primary text-primary"
                          : "text-muted-foreground"
                      }`}
                    />
                  </button>
                ))}
              </div>

              {/* Rating label */}
              <div className="text-center font-black text-primary uppercase tracking-widest text-sm h-5">
                {RATING_LABELS[hoverRating || rating] ?? ""}
              </div>

              {/* Stars description */}
              <div className="grid grid-cols-5 gap-1 text-center">
                {["Very Poor", "Poor", "Average", "Good", "Excellent"].map((label, i) => (
                  <div key={label} className={`text-[9px] font-bold uppercase leading-tight ${(hoverRating || rating) === i + 1 ? "text-primary" : "text-muted-foreground"}`}>
                    {label}
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest font-bold text-muted-foreground block">
                  Additional Comments <span className="font-normal normal-case">(optional)</span>
                </label>
                <Textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Tell us what went well or what could be improved..."
                  className="bg-background min-h-[120px]"
                />
              </div>

              {errorMsg && (
                <p className="text-sm text-destructive text-center font-medium bg-destructive/10 p-3 rounded-sm">{errorMsg}</p>
              )}

              <Button
                type="submit"
                className="w-full bg-primary font-black py-6 text-base uppercase tracking-wider"
                disabled={rating === 0 || submitting}
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                Submit Feedback
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-[10px] text-muted-foreground font-mono mt-8 uppercase tracking-widest">
          Ref: {token ? `${token.substring(0, 8)}…` : "invalid"}
        </p>
      </div>
    </div>
  );
}
