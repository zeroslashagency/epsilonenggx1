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
  purple: "bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 text-purple-900 dark:text-purple-100 border border-purple-200 dark:border-purple-800 shadow-purple-100 dark:shadow-purple-900/20",
  green: "bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 text-emerald-900 dark:text-emerald-100 border border-emerald-200 dark:border-emerald-800 shadow-emerald-100 dark:shadow-emerald-900/20",
  orange: "bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 text-orange-900 dark:text-orange-100 border border-orange-200 dark:border-orange-800 shadow-orange-100 dark:shadow-orange-900/20",
  blue: "bg-gradient-to-br from-sky-50 to-sky-100 dark:from-sky-950 dark:to-sky-900 text-sky-900 dark:text-sky-100 border border-sky-200 dark:border-sky-800 shadow-sky-100 dark:shadow-sky-900/20",
  indigo: "bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950 dark:to-indigo-900 text-indigo-900 dark:text-indigo-100 border border-indigo-200 dark:border-indigo-800 shadow-indigo-100 dark:shadow-indigo-900/20",
};

const iconBgStyles = {
  purple: "bg-purple-100 dark:bg-purple-800 text-purple-600 dark:text-purple-200",
  green: "bg-emerald-100 dark:bg-emerald-800 text-emerald-600 dark:text-emerald-200",
  orange: "bg-orange-100 dark:bg-orange-800 text-orange-600 dark:text-orange-200",
  blue: "bg-sky-100 dark:bg-sky-800 text-sky-600 dark:text-sky-200",
  indigo: "bg-indigo-100 dark:bg-indigo-800 text-indigo-600 dark:text-indigo-200",
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
