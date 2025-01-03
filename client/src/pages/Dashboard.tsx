import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WeeklyCalendar } from "@/components/WeeklyCalendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Users, CalendarDays } from "lucide-react";
import { isWithinInterval, parseISO, startOfDay, endOfDay } from "date-fns";
import type { Employee, Leave } from "@db/schema";

export default function Dashboard() {
  const { data: employees, isLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: leaves } = useQuery<Leave[]>({
    queryKey: ["/api/leaves"],
  });

  // Bugün izinli olan personel sayısını hesapla
  const todayLeaveCount = leaves?.filter(leave => {
    const today = new Date();
    const startDate = parseISO(leave.startDate);
    const endDate = parseISO(leave.endDate);
    return isWithinInterval(today, { 
      start: startOfDay(startDate),
      end: endOfDay(endDate)
    });
  }).length || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <Layout employees={employees || []} isLoading={isLoading}>
      <div className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Toplam Personel</div>
                <div className="text-2xl font-semibold">{employees?.length || 0}</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-full">
                <CalendarDays className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Bugün İzinli</div>
                <div className="text-2xl font-semibold">{todayLeaveCount}</div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="overflow-hidden">
          <CardHeader className="p-6 bg-white">
            <CardTitle className="text-xl font-semibold">Haftalık İzin Takvimi</CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="p-6">
            <ScrollArea className="h-[calc(100vh-20rem)]">
              <div className="space-y-6">
                {employees?.map((employee) => (
                  <Card key={employee.id} className="border-none shadow-none">
                    <CardHeader className="pb-2 px-0">
                      <CardTitle className="text-base font-medium flex items-center justify-between">
                        <span>{employee.firstName} {employee.lastName}</span>
                        <span className="text-sm font-normal text-gray-500">
                          {employee.department}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-0">
                      <WeeklyCalendar employee={employee} />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}