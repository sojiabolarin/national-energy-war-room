import { Link } from "react-router-dom";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-foreground gap-4">
      <AlertCircle className="h-12 w-12 text-destructive" />
      <h1 className="text-4xl font-bold font-mono">404</h1>
      <p className="text-muted-foreground uppercase tracking-widest text-sm">Page not found</p>
      <Link to="/" className="text-xs text-primary uppercase tracking-wider hover:underline mt-4">
        Return to War Room
      </Link>
    </div>
  );
}
