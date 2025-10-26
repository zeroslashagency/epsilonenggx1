import { useState } from "react";
import { Home, ChevronRight, Activity, Users, AlertCircle, UserX, UserCheck, Clock, Download, RefreshCw, Calendar, ChevronDown } from "lucide-react";
import { StatsCard } from "@/components/StatsCard";
import { AttendanceTable } from "@/components/AttendanceTable";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Index = () => {
  const [dateRange, setDateRange] = useState("last-14-days");
  const [employeeFilter, setEmployeeFilter] = useState("all");

  return (
    <div className="min-h-screen bg-background">
      {/* Breadcrumb */}
      <div className="border-b border-border/50 bg-card shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
            <Home className="h-4 w-4" />
            <ChevronRight className="h-3.5 w-3.5" />
            <span>Dashboard</span>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-foreground font-semibold">Attendance</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-3 tracking-tight">Attendance Dashboard</h1>
            <p className="text-muted-foreground text-lg">Real-time attendance data synced from office computer</p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="flex items-center gap-2 text-sm">
              <Activity className="h-4 w-4 text-primary" />
              <span className="font-semibold text-foreground">Auto-Sync Status</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className="font-medium">Last sync: 8 hours ago</span>
              </div>
              <div className="flex items-center gap-2 text-success font-medium">
                <div className="h-2.5 w-2.5 rounded-full bg-success animate-pulse shadow-sm" />
                <span>Cloud Synced</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 bg-card p-5 rounded-xl border border-border/50 shadow-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[200px] bg-background border-border/50 font-medium shadow-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="last-7-days">Last 7 Days</SelectItem>
                <SelectItem value="last-14-days">Last 14 Days</SelectItem>
                <SelectItem value="last-30-days">Last 30 Days</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
              <SelectTrigger className="w-[180px] bg-background border-border/50 font-medium shadow-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                <SelectItem value="present">Present Today</SelectItem>
                <SelectItem value="absent">Absent Today</SelectItem>
                <SelectItem value="late">Late Arrivals</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button variant="outline" className="gap-2 font-semibold border-border/50 hover:bg-muted/50 shadow-sm">
            <Download className="h-4 w-4" />
            Export Excel
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatsCard
            title="Today Active Punches"
            value={0}
            description="All punch activities today"
            icon={Activity}
            variant="purple"
          />
          <StatsCard
            title="Today Active Users"
            value={0}
            description="Employees who came today"
            icon={UserCheck}
            variant="green"
          />
          <StatsCard
            title="Delay Employee"
            value={0}
            description="Late arrivals today"
            icon={AlertCircle}
            variant="orange"
          />
          <StatsCard
            title="Holiday Employee"
            value={47}
            description="Not coming today"
            icon={UserX}
            variant="blue"
          />
          <StatsCard
            title="Total Employees"
            value={47}
            description="All registered employees"
            icon={Users}
            variant="indigo"
          />
        </div>

        {/* Today's Recent Activity */}
        <Card className="shadow-lg border border-border/50 overflow-hidden">
          <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Today's Recent Activity</h2>
                  <p className="text-sm text-muted-foreground font-medium">Latest punch activities from today</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground font-medium">0 activities today</span>
                <Button variant="outline" size="sm" className="gap-2 font-semibold border-border/50 hover:bg-muted/50 shadow-sm">
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center py-20 space-y-5">
              <div className="h-24 w-24 rounded-2xl bg-muted/50 flex items-center justify-center border border-border/50">
                <Clock className="h-12 w-12 text-muted-foreground" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold">No Activity Today</h3>
                <p className="text-sm text-muted-foreground font-medium">No punch records found for today</p>
              </div>
            </div>
          </div>
        </Card>

        {/* All Track Records */}
        <AttendanceTable />
      </div>
    </div>
  );
};

export default Index;
