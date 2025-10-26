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
  purple: "bg-gradient-to-br from-[hsl(var(--purple-light))] to-[hsl(var(--purple-light))]/80 text-[hsl(var(--purple-dark))] border border-[hsl(var(--purple))]/10",
  green: "bg-gradient-to-br from-[hsl(var(--green-light))] to-[hsl(var(--green-light))]/80 text-[hsl(var(--green-dark))] border border-[hsl(var(--green))]/10",
  orange: "bg-gradient-to-br from-[hsl(var(--orange-light))] to-[hsl(var(--orange-light))]/80 text-[hsl(var(--orange-dark))] border border-[hsl(var(--orange))]/10",
  blue: "bg-gradient-to-br from-[hsl(var(--blue-light))] to-[hsl(var(--blue-light))]/80 text-[hsl(var(--blue-dark))] border border-[hsl(var(--blue))]/10",
  indigo: "bg-gradient-to-br from-[hsl(var(--indigo-light))] to-[hsl(var(--indigo-light))]/80 text-[hsl(var(--indigo-dark))] border border-[hsl(var(--indigo))]/10",
};

const iconBgStyles = {
  purple: "bg-[hsl(var(--purple))]/10",
  green: "bg-[hsl(var(--green))]/10",
  orange: "bg-[hsl(var(--orange))]/10",
  blue: "bg-[hsl(var(--blue))]/10",
  indigo: "bg-[hsl(var(--indigo))]/10",
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
