interface StatusBadgeProps {
  status: "in" | "out" | "check-in" | "check-out";
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalizedStatus = status === "check-in" ? "in" : status === "check-out" ? "out" : status;
  
  const styles = {
    in: "bg-[hsl(var(--green-light))] text-[hsl(var(--green-dark))] border border-[hsl(var(--green))]/20",
    out: "bg-[hsl(var(--orange-light))] text-[hsl(var(--orange-dark))] border border-[hsl(var(--orange))]/20",
  };

  const labels = {
    in: "Check In",
    out: "Check Out",
  };

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${styles[normalizedStatus]}`}>
      {labels[normalizedStatus]}
    </span>
  );
}
