import { useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, CheckCircle2, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function SatisfactionForm() {
  // token param encodes `${complaintId}.${satisfactionToken}` separated by a dot
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
        throw new Error("Invalid satisfaction link.");
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
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
        <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-2xl font-bold uppercase tracking-wider text-center mb-2">Feedback Received</h1>
        <p className="text-muted-foreground text-center max-w-sm">
          Thank you for taking the time to share your experience. Your feedback helps improve
          power sector accountability.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <div className="bg-primary text-primary-foreground p-4 sticky top-0 z-10 shadow-md">
        <h1 className="text-xl font-bold uppercase tracking-wider text-center">Service Satisfaction</h1>
      </div>

      <div className="max-w-md mx-auto p-4 mt-8">
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <h2 className="text-center font-bold text-lg mb-6">How was your issue handled?</h2>

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className="p-2 transition-transform hover:scale-110"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                  >
                    <Star
                      className={`w-10 h-10 ${
                        (hoverRating || rating) >= star
                          ? "fill-primary text-primary"
                          : "text-muted-foreground"
                      }`}
                    />
                  </button>
                ))}
              </div>

              <div className="text-center font-bold text-primary uppercase tracking-widest text-sm h-6">
                {rating === 1 && "Very Poor"}
                {rating === 2 && "Poor"}
                {rating === 3 && "Average"}
                {rating === 4 && "Good"}
                {rating === 5 && "Excellent"}
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">
                  Additional Comments (Optional)
                </label>
                <Textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Tell us what went well or what could be improved..."
                  className="bg-background min-h-[120px]"
                />
              </div>

              {errorMsg && (
                <p className="text-sm text-destructive text-center font-medium">{errorMsg}</p>
              )}

              <Button
                type="submit"
                className="w-full bg-primary font-bold py-6 text-lg"
                disabled={rating === 0 || submitting}
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                SUBMIT FEEDBACK
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-[10px] text-muted-foreground font-mono mt-8 uppercase tracking-widest">
          Ref: {token}
        </p>
      </div>
    </div>
  );
}
