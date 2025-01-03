import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus } from "lucide-react";
import EmployeeTable from "@/components/EmployeeTable";
import LeaveCalendar from "@/components/LeaveCalendar";
import type { Employee } from "@db/schema";

export default function Dashboard() {
  const { data: employees, isLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-foreground">Personnel Management</h1>
        <Link href="/employee/new">
          <Button>
            <UserPlus className="mr-2 h-4 w-4" />
            Add Employee
          </Button>
        </Link>
      </div>

      <div className="grid gap-8 grid-cols-1 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Employees</CardTitle>
          </CardHeader>
          <CardContent>
            <EmployeeTable employees={employees || []} isLoading={isLoading} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leave Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <LeaveCalendar employees={employees || []} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
