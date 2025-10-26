import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

interface StatsCardProps {
  title: string;
  value: number | string;
  description: string;
  icon: LucideIcon;
  variant: "purple" | "green" | "orange" | "blue" | "indigo";
}

const variantStyles = {
  purple: "bg-gradient-to-br from-purple-50 to-purple-100 text-purple-900 border border-purple-200 shadow-purple-100",
  green: "bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-900 border border-emerald-200 shadow-emerald-100",
  orange: "bg-gradient-to-br from-orange-50 to-orange-100 text-orange-900 border border-orange-200 shadow-orange-100",
  blue: "bg-gradient-to-br from-sky-50 to-sky-100 text-sky-900 border border-sky-200 shadow-sky-100",
  indigo: "bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-900 border border-indigo-200 shadow-indigo-100",
};

const iconBgStyles = {
  purple: "bg-purple-100 text-purple-600",
  green: "bg-emerald-100 text-emerald-600",
  orange: "bg-orange-100 text-orange-600",
  blue: "bg-sky-100 text-sky-600",
  indigo: "bg-indigo-100 text-indigo-600",
};

export function StatsCard({ title, value, description, icon: Icon, variant }: StatsCardProps) {
  return (
    <Card className={`p-6 ${variantStyles[variant]} hover:shadow-lg transition-all duration-300 hover:-translate-y-1`}>
      <div className="flex items-start justify-between mb-5">
        <h3 className="text-sm font-semibold tracking-wide uppercase opacity-90">{title}</h3>
        <div className={`p-2.5 rounded-xl ${iconBgStyles[variant]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-4xl font-bold tracking-tight">{value}</p>
        <p className="text-xs opacity-75 font-medium">{description}</p>
      </div>
    </Card>
  );
}
