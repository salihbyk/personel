import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WeeklyCalendar } from "@/components/WeeklyCalendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Users, CalendarDays, CalendarClock } from "lucide-react";
import { isWithinInterval, parseISO, startOfDay, endOfDay, format, differenceInDays } from "date-fns";
import { tr } from "date-fns/locale";
import type { Employee, Leave } from "@db/schema";

export default function Dashboard() {
  const { data: employees, isLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: leaves } = useQuery<Leave[]>({
    queryKey: ["/api/leaves"],
  });

  // Bugün izinli olan personel sayısını hesapla
  const today = new Date();
  const todayLeaveCount = leaves?.filter(leave => {
    const startDate = parseISO(leave.startDate);
    const endDate = parseISO(leave.endDate);
    return isWithinInterval(today, { 
      start: startOfDay(startDate),
      end: endOfDay(endDate)
    });
  }).length || 0;

  // Bugünkü izinli personel listesi
  const todayLeaves = leaves?.filter(leave => {
    const startDate = parseISO(leave.startDate);
    const endDate = parseISO(leave.endDate);
    return isWithinInterval(today, { 
      start: startOfDay(startDate),
      end: endOfDay(endDate)
    });
  }) || [];

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
          <Card className="bg-gradient-to-br from-blue-50 via-white to-blue-50 border-blue-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
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

          <Card className="bg-gradient-to-br from-green-50 via-white to-green-50 border-green-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
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

          <Card className="bg-gradient-to-br from-purple-50 via-white to-purple-50 border-purple-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-full">
                <CalendarClock className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Bugünün Tarihi</div>
                <div className="text-2xl font-semibold">
                  {format(today, "d MMMM yyyy", { locale: tr })}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {format(today, "EEEE", { locale: tr })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bugün İzinli Personel */}
        <Card className="mb-6 bg-gradient-to-br from-amber-50 via-white to-amber-50 border-amber-100 transition-all duration-300 hover:shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-amber-600" />
              Bugün İzinli Personel
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayLeaves.length === 0 ? (
              <div className="text-center text-gray-500 py-4">
                Bugün izinli personel bulunmamaktadır
              </div>
            ) : (
              <div className="space-y-3">
                {todayLeaves.map((leave) => {
                  const employee = employees?.find(e => e.id === leave.employeeId);
                  const leaveDuration = differenceInDays(
                    parseISO(leave.endDate),
                    parseISO(leave.startDate)
                  ) + 1;
                  return (
                    <div key={leave.id} className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
                      <div>
                        <div className="font-medium">
                          {employee?.firstName} {employee?.lastName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {employee?.department}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500">
                          {format(parseISO(leave.startDate), "d MMM", { locale: tr })} -{" "}
                          {format(parseISO(leave.endDate), "d MMM", { locale: tr })}
                        </div>
                        <div className="text-xs text-blue-600 font-medium">
                          {leaveDuration} gün
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="p-6 bg-gradient-to-r from-blue-50 to-white">
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