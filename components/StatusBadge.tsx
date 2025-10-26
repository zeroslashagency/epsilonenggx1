interface StatusBadgeProps {
  status: "in" | "out" | "check-in" | "check-out";
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalizedStatus = status === "check-in" ? "in" : status === "check-out" ? "out" : status;
  
  const styles = {
    in: "bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm",
    out: "bg-gradient-to-r from-orange-50 to-orange-100 text-orange-700 border border-orange-200 shadow-sm",
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
