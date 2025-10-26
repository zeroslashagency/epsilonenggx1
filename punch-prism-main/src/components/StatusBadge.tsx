import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: "check-in" | "check-out";
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-success text-success-foreground shadow-sm">
      <CheckCircle2 className="h-3.5 w-3.5" />
      {status === "check-in" ? "Check In" : "Check Out"}
    </span>
  );
}
