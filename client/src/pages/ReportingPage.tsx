import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Download, FileSpreadsheet, FileText } from "lucide-react";
import { format, parseISO, isWithinInterval, startOfMonth, endOfMonth, differenceInDays } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { Employee, Leave } from "@db/schema";

export default function ReportingPage() {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  const { data: employees, isLoading: employeesLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: leaves } = useQuery<Leave[]>({
    queryKey: ["/api/leaves"],
  });

  // Seçili ay için izin günlerini hesapla
  const calculateMonthlyLeaves = (employeeId: number) => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);

    return leaves?.filter(leave => {
      const startDate = parseISO(leave.startDate);
      const endDate = parseISO(leave.endDate);
      return leave.employeeId === employeeId && (
        isWithinInterval(startDate, { start: monthStart, end: monthEnd }) ||
        isWithinInterval(endDate, { start: monthStart, end: monthEnd })
      );
    }) || [];
  };

  // Gün izinli mi kontrolü
  const isDayOnLeave = (date: Date, employeeId: number) => {
    return leaves?.some(leave => {
      if (leave.employeeId !== employeeId) return false;
      const startDate = parseISO(leave.startDate);
      const endDate = parseISO(leave.endDate);
      return isWithinInterval(date, { start: startDate, end: endDate });
    });
  };

  const generateExcelReport = () => {
    // TODO: Excel rapor oluşturma
    console.log("Excel rapor oluştur");
  };

  const generatePdfReport = () => {
    // TODO: PDF rapor oluşturma
    console.log("PDF rapor oluştur");
  };

  if (employeesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Ayın günlerini oluştur
  const daysInMonth = Array.from(
    { length: endOfMonth(currentDate).getDate() },
    (_, i) => new Date(currentDate.getFullYear(), currentDate.getMonth(), i + 1)
  );

  return (
    <Layout employees={employees || []} isLoading={employeesLoading}>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">İzin Raporları</h1>
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal border-2 border-blue-300",
                    !currentDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {currentDate ? (
                    format(currentDate, "MMMM yyyy", { locale: tr })
                  ) : (
                    <span>Ay Seçin</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={currentDate}
                  onSelect={(date) => date && setCurrentDate(date)}
                  initialFocus
                  locale={tr}
                />
              </PopoverContent>
            </Popover>

            <Button variant="outline" onClick={generateExcelReport} className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </Button>
            <Button variant="outline" onClick={generatePdfReport} className="gap-2">
              <FileText className="h-4 w-4" />
              PDF
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Aylık İzin Raporu - {format(currentDate, "MMMM yyyy", { locale: tr })}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {employees?.map((employee) => {
                const monthlyLeaves = calculateMonthlyLeaves(employee.id);
                const totalLeaveDays = monthlyLeaves.reduce((total, leave) => {
                  const start = parseISO(leave.startDate);
                  const end = parseISO(leave.endDate);
                  return total + differenceInDays(end, start) + 1;
                }, 0);

                return (
                  <div key={employee.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">
                        {employee.firstName} {employee.lastName}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Toplam İzin: {totalLeaveDays} gün
                      </div>
                    </div>
                    <div className="grid grid-cols-31 gap-1">
                      {daysInMonth.map((day) => (
                        <div
                          key={day.toISOString()}
                          className={cn(
                            "text-center text-xs p-1 rounded border",
                            isDayOnLeave(day, employee.id)
                              ? "bg-red-50 border-red-200 text-red-700"
                              : "border-gray-200"
                          )}
                        >
                          {format(day, "d")}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Yıllık İzin Özeti - {currentDate.getFullYear()}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {employees?.map((employee) => (
                <div key={employee.id} className="space-y-2">
                  <div className="font-medium">
                    {employee.firstName} {employee.lastName}
                  </div>
                  <div className="grid grid-cols-12 gap-2">
                    {Array.from({ length: 12 }, (_, i) => {
                      const monthDate = new Date(currentDate.getFullYear(), i, 1);
                      const monthlyLeaves = calculateMonthlyLeaves(employee.id);
                      const totalLeaveDays = monthlyLeaves.reduce((total, leave) => {
                        const start = parseISO(leave.startDate);
                        const end = parseISO(leave.endDate);
                        return total + differenceInDays(end, start) + 1;
                      }, 0);

                      return (
                        <div
                          key={i}
                          className={cn(
                            "p-2 text-center rounded border text-sm",
                            totalLeaveDays > 0
                              ? "bg-red-50 border-red-200 text-red-700"
                              : "border-gray-200"
                          )}
                        >
                          <div className="font-medium">
                            {format(monthDate, "MMM", { locale: tr })}
                          </div>
                          <div className="text-xs">
                            {totalLeaveDays} gün
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
