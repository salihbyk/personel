import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Download, FileSpreadsheet, FileText } from "lucide-react";
import { format, parseISO, isWithinInterval, startOfMonth, endOfMonth, differenceInDays } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { Employee, Leave } from "@db/schema";
import { useToast } from "@/hooks/use-toast";

export default function ReportingPage() {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const { toast } = useToast();

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

  const generateExcelReport = async () => {
    try {
      if (!selectedEmployeeId) {
        toast({
          title: "Hata",
          description: "Lütfen bir personel seçin",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(`/api/reports/excel?employeeId=${selectedEmployeeId}&date=${format(currentDate, 'yyyy-MM')}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Rapor oluşturma hatası');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `izin-raporu-${format(currentDate, 'yyyy-MM')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Başarılı",
        description: "Excel raporu indirildi",
      });
    } catch (error) {
      toast({
        title: "Hata",
        description: "Rapor oluşturulurken bir hata oluştu",
        variant: "destructive",
      });
    }
  };

  const generatePdfReport = async () => {
    try {
      if (!selectedEmployeeId) {
        toast({
          title: "Hata",
          description: "Lütfen bir personel seçin",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(`/api/reports/pdf?employeeId=${selectedEmployeeId}&date=${format(currentDate, 'yyyy-MM')}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Rapor oluşturma hatası');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `izin-raporu-${format(currentDate, 'yyyy-MM')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Başarılı",
        description: "PDF raporu indirildi",
      });
    } catch (error) {
      toast({
        title: "Hata",
        description: "Rapor oluşturulurken bir hata oluştu",
        variant: "destructive",
      });
    }
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

  const filteredEmployees = selectedEmployeeId 
    ? employees?.filter(emp => emp.id === parseInt(selectedEmployeeId)) 
    : employees;

  return (
    <Layout employees={employees || []} isLoading={employeesLoading}>
      <div className="p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">İzin Raporları</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={selectedEmployeeId}
              onValueChange={setSelectedEmployeeId}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Personel Seçin" />
              </SelectTrigger>
              <SelectContent>
                {employees?.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id.toString()}>
                    {employee.firstName} {employee.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
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

            <Button 
              variant="outline" 
              onClick={generateExcelReport} 
              className="gap-2"
              disabled={!selectedEmployeeId}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </Button>
            <Button 
              variant="outline" 
              onClick={generatePdfReport} 
              className="gap-2"
              disabled={!selectedEmployeeId}
            >
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
              {filteredEmployees?.map((employee) => {
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
                      {daysInMonth.map((day) => {
                        const isLeaveDay = monthlyLeaves.some(leave => {
                          const startDate = parseISO(leave.startDate);
                          const endDate = parseISO(leave.endDate);
                          return isWithinInterval(day, { start: startDate, end: endDate });
                        });

                        return (
                          <div
                            key={day.toISOString()}
                            className={cn(
                              "text-center text-xs p-1 rounded border-2",
                              isLeaveDay
                                ? "bg-red-50 border-red-300 text-red-700 font-medium"
                                : "border-gray-200"
                            )}
                          >
                            {format(day, "d")}
                          </div>
                        );
                      })}
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
              {filteredEmployees?.map((employee) => (
                <div key={employee.id} className="space-y-2">
                  <div className="font-medium">
                    {employee.firstName} {employee.lastName}
                  </div>
                  <div className="grid grid-cols-12 gap-2">
                    {Array.from({ length: 12 }, (_, i) => {
                      const monthDate = new Date(currentDate.getFullYear(), i, 1);
                      const monthLeaves = calculateMonthlyLeaves(employee.id);
                      const totalLeaveDays = monthLeaves.reduce((total, leave) => {
                        const start = parseISO(leave.startDate);
                        const end = parseISO(leave.endDate);
                        return total + differenceInDays(end, start) + 1;
                      }, 0);

                      return (
                        <div
                          key={i}
                          className={cn(
                            "p-2 text-center rounded border-2 text-sm",
                            totalLeaveDays > 0
                              ? "bg-red-50 border-red-300 text-red-700"
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