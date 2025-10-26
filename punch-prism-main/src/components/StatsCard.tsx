import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

interface StatsCardProps {
  title: string;
  value: number;
  description: string;
  icon: LucideIcon;
  variant: "purple" | "green" | "orange" | "blue" | "indigo";
}

const variantStyles = {
  purple: "bg-gradient-to-br from-purple-light to-purple-light/80 text-purple-dark border border-purple/10",
  green: "bg-gradient-to-br from-green-light to-green-light/80 text-green-dark border border-green/10",
  orange: "bg-gradient-to-br from-orange-light to-orange-light/80 text-orange-dark border border-orange/10",
  blue: "bg-gradient-to-br from-blue-light to-blue-light/80 text-blue-dark border border-blue/10",
  indigo: "bg-gradient-to-br from-indigo-light to-indigo-light/80 text-indigo-dark border border-indigo/10",
};

const iconBgStyles = {
  purple: "bg-purple/10",
  green: "bg-green/10",
  orange: "bg-orange/10",
  blue: "bg-blue/10",
  indigo: "bg-indigo/10",
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
