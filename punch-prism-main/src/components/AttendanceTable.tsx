import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "./StatusBadge";
import { Calendar } from "lucide-react";

interface AttendanceRecord {
  id: string;
  employeeCode: string;
  employeeName: string;
  status: "check-in" | "check-out";
  date: string;
  time: string;
}

const mockRecords: AttendanceRecord[] = [
  { id: "1", employeeCode: "EE 65", employeeName: "Security Guard", status: "check-in", date: "10/25/2025", time: "11:35:46 PM" },
  { id: "2", employeeCode: "4", employeeName: "Vyshakh", status: "check-in", date: "10/25/2025", time: "11:06:44 PM" },
  { id: "3", employeeCode: "EE 65", employeeName: "Security Guard", status: "check-in", date: "10/25/2025", time: "11:00:21 PM" },
  { id: "4", employeeCode: "EE 65", employeeName: "Security Guard", status: "check-in", date: "10/25/2025", time: "10:30:09 PM" },
  { id: "5", employeeCode: "38", employeeName: "shajahan", status: "check-in", date: "10/25/2025", time: "10:29:16 PM" },
  { id: "6", employeeCode: "EE 72", employeeName: "Employee EE 72", status: "check-in", date: "10/25/2025", time: "10:13:20 PM" },
  { id: "7", employeeCode: "39", employeeName: "Employee 39", status: "check-in", date: "10/25/2025", time: "10:11:46 PM" },
];

export function AttendanceTable() {
  const [fromDate, setFromDate] = useState("10/07/2025");
  const [toDate, setToDate] = useState("10/29/2025");
  const [recordsPerPage, setRecordsPerPage] = useState("50");

  return (
    <Card className="shadow-lg border border-border/50 overflow-hidden">
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">All Track Records</h2>
          <Button variant="outline" className="bg-blue-light text-blue-dark border-blue/20 hover:bg-blue/20 hover:border-blue/30 transition-all shadow-sm">
            <Calendar className="h-4 w-4 mr-2" />
            Cloud Synced
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">From Date</label>
            <Input
              type="text"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-card"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">To Date</label>
            <Input
              type="text"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-card"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Records per page</label>
            <Select value={recordsPerPage} onValueChange={setRecordsPerPage}>
              <SelectTrigger className="bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 records</SelectItem>
                <SelectItem value="25">25 records</SelectItem>
                <SelectItem value="50">50 records</SelectItem>
                <SelectItem value="100">100 records</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all">
              Apply Filters
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-border/50 overflow-hidden shadow-sm bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 border-b border-border/50">
                <TableHead className="font-bold text-foreground py-4">Employee Code</TableHead>
                <TableHead className="font-bold text-foreground">Employee Name</TableHead>
                <TableHead className="font-bold text-foreground">Status</TableHead>
                <TableHead className="font-bold text-foreground">Date</TableHead>
                <TableHead className="font-bold text-foreground">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockRecords.map((record) => (
                <TableRow key={record.id} className="hover:bg-muted/20 transition-colors border-b border-border/30 last:border-0">
                  <TableCell className="font-semibold py-4">{record.employeeCode}</TableCell>
                  <TableCell className="font-medium">{record.employeeName}</TableCell>
                  <TableCell>
                    <StatusBadge status={record.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{record.date}</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-sm">{record.time}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </Card>
  );
}
