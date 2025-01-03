import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { WeeklyCalendar } from "@/components/WeeklyCalendar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import type { Employee, Leave } from "@db/schema";

export default function EmployeeDetail() {
  const { id } = useParams();
  
  const { data: employees, isLoading: employeesLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: employee } = useQuery<Employee>({
    queryKey: [`/api/employees/${id}`],
    enabled: !!id,
  });

  const { data: leaves } = useQuery<Leave[]>({
    queryKey: [`/api/leaves?employeeId=${id}`],
    enabled: !!id,
  });

  if (!employee) {
    return null;
  }

  return (
    <Layout employees={employees || []} isLoading={employeesLoading}>
      <div className="p-8 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>
              {employee.firstName} {employee.lastName}
            </CardTitle>
            <CardDescription>
              {employee.position} - {employee.department}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <span className="font-medium">E-posta:</span> {employee.email}
              </div>
              <div>
                <span className="font-medium">Telefon:</span> {employee.phone}
              </div>
              <div>
                <span className="font-medium">Adres:</span> {employee.address}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Haftalık İzin Takvimi</CardTitle>
          </CardHeader>
          <CardContent>
            <WeeklyCalendar employee={employee} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>İzin Geçmişi</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-4">
                {leaves?.map((leave) => (
                  <div
                    key={leave.id}
                    className="p-4 rounded-lg border"
                  >
                    <div className="font-medium">
                      {format(new Date(leave.startDate), "d MMMM yyyy", { locale: tr })}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {leave.reason}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
