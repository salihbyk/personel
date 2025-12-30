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
import { CalendarIcon, FileSpreadsheet, Users, Medal, Trophy, Calendar as CalendarIcon2 } from "lucide-react";
import { format, parseISO, isWithinInterval, startOfMonth, endOfMonth, differenceInDays } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { API_BASE_URL, getAuthHeaders } from "@/lib/queryClient";
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

  // Belirli bir tarih aralığı için izinleri hesapla
  const calculateLeaves = (employeeId: number | null, start: Date, end: Date) => {
    return leaves?.filter(leave => {
      const leaveStart = parseISO(leave.startDate);
      const leaveEnd = parseISO(leave.endDate);
      return (
        (employeeId === null || leave.employeeId === employeeId) &&
        (isWithinInterval(leaveStart, { start, end }) ||
         isWithinInterval(leaveEnd, { start, end }) ||
         (leaveStart <= start && leaveEnd >= end))
      );
    }) || [];
  };

  // İzin günlerini hesapla
  const calculateLeaveDays = (leaves: Leave[], start: Date, end: Date) => {
    let totalDays = 0;
    leaves.forEach(leave => {
      const leaveStart = parseISO(leave.startDate);
      const leaveEnd = parseISO(leave.endDate);

      const effectiveStart = leaveStart < start ? start : leaveStart;
      const effectiveEnd = leaveEnd > end ? end : leaveEnd;

      totalDays += differenceInDays(effectiveEnd, effectiveStart) + 1;
    });
    return totalDays;
  };

  const generateExcelReport = async () => {
    try {
      const queryParams = selectedEmployeeId === "all" 
        ? `date=${format(currentDate, 'yyyy-MM')}` 
        : `employeeId=${selectedEmployeeId}&date=${format(currentDate, 'yyyy-MM')}`;

      const response = await fetch(`${API_BASE_URL}/api/reports/excel?${queryParams}`, {
        method: 'GET',
        headers: getAuthHeaders(),
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

  const filteredEmployees = selectedEmployeeId === "all" 
    ? employees 
    : selectedEmployeeId 
      ? employees?.filter(emp => emp.id === parseInt(selectedEmployeeId))
      : employees;

  // İzin istatistiklerini hesapla
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  const employeeStats = employees?.map(employee => {
    const monthlyLeaves = calculateLeaves(employee.id, monthStart, monthEnd);
    const totalDays = calculateLeaveDays(monthlyLeaves, monthStart, monthEnd);
    return {
      ...employee,
      leaveDays: totalDays
    };
  }).sort((a, b) => b.leaveDays - a.leaveDays) || [];

  const topLeaveTakers = employeeStats.slice(0, 3);
  const leastLeaveTakers = [...employeeStats].sort((a, b) => a.leaveDays - b.leaveDays).slice(0, 3);
  const totalLeaveUsers = employeeStats.filter(emp => emp.leaveDays > 0).length;
  const totalLeaveDays = employeeStats.reduce((sum, emp) => sum + emp.leaveDays, 0);

  return (
    <Layout employees={employees || []} isLoading={employeesLoading}>
      <div className="container mx-auto p-4 lg:p-6 max-w-7xl space-y-6">
        {/* İstatistik Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* En Çok İzin Kullananlar */}
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-800 flex items-center gap-2">
                <Trophy className="h-4 w-4 text-blue-600" />
                En Çok İzin Kullananlar
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topLeaveTakers.map((emp, index) => (
                <div key={emp.id} className="flex items-center justify-between mb-1 text-sm">
                  <span className="text-blue-700">
                    {index + 1}. {emp.firstName} {emp.lastName}
                  </span>
                  <span className="font-medium text-blue-900">{emp.leaveDays} gün</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* En Az İzin Kullananlar */}
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-800 flex items-center gap-2">
                <Medal className="h-4 w-4 text-green-600" />
                En Az İzin Kullananlar
              </CardTitle>
            </CardHeader>
            <CardContent>
              {leastLeaveTakers.map((emp, index) => (
                <div key={emp.id} className="flex items-center justify-between mb-1 text-sm">
                  <span className="text-green-700">
                    {index + 1}. {emp.firstName} {emp.lastName}
                  </span>
                  <span className="font-medium text-green-900">{emp.leaveDays} gün</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* İzinli Personel Sayısı */}
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-orange-800 flex items-center gap-2">
                <Users className="h-4 w-4 text-orange-600" />
                İzinli Personel Sayısı
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-900">{totalLeaveUsers}</div>
              <p className="text-sm text-orange-700">Bu ay izin kullanan personel</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-lg shadow-sm">
          <h1 className="text-2xl font-bold">İzin Raporları</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={selectedEmployeeId}
              onValueChange={setSelectedEmployeeId}
            >
              <SelectTrigger className="w-[200px] bg-white">
                <SelectValue placeholder="Personel Seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Personeller</SelectItem>
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
                    "justify-start text-left font-normal bg-white",
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
              className="gap-2 bg-white hover:bg-green-50 text-green-600 border-green-200 hover:border-green-300"
              disabled={!selectedEmployeeId}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </Button>
          </div>
        </div>

        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Aylık İzin Raporu - {format(currentDate, "MMMM yyyy", { locale: tr })}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {filteredEmployees?.map((employee) => {
                const monthStart = startOfMonth(currentDate);
                const monthEnd = endOfMonth(currentDate);
                const monthlyLeaves = calculateLeaves(employee.id, monthStart, monthEnd);
                const totalDays = calculateLeaveDays(monthlyLeaves, monthStart, monthEnd);

                return (
                  <div key={employee.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">
                        {employee.firstName} {employee.lastName}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Toplam İzin: {totalDays} gün
                      </div>
                    </div>
                    <div className="grid grid-cols-7 md:grid-cols-31 gap-1">
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
                              "text-center text-xs p-1 rounded-md border-2 transition-all hover:scale-105",
                              isLeaveDay
                                ? "bg-gradient-to-br from-red-50 to-red-100 border-red-300 text-red-700 font-medium shadow-sm"
                                : "border-gray-200 hover:border-gray-300 bg-gradient-to-br from-gray-50 to-white"
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

        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Yıllık İzin Özeti - {currentDate.getFullYear()}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {filteredEmployees?.map((employee) => (
                <div key={employee.id} className="space-y-4">
                  <div className="font-medium">
                    {employee.firstName} {employee.lastName}
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
                    {Array.from({ length: 12 }, (_, i) => {
                      const monthDate = new Date(currentDate.getFullYear(), i, 1);
                      const monthStart = startOfMonth(monthDate);
                      const monthEnd = endOfMonth(monthDate);
                      const monthLeaves = calculateLeaves(employee.id, monthStart, monthEnd);
                      const totalDays = calculateLeaveDays(monthLeaves, monthStart, monthEnd);

                      return (
                        <div
                          key={i}
                          className={cn(
                            "p-2 text-center rounded-lg border-2 transition-all hover:scale-105",
                            totalDays > 0
                              ? "bg-gradient-to-br from-red-50 to-red-100 border-red-300 text-red-700 shadow-sm"
                              : "border-gray-200 hover:border-gray-300 bg-gradient-to-br from-gray-50 to-white"
                          )}
                        >
                          <div className="font-medium">
                            {format(monthDate, "MMM", { locale: tr })}
                          </div>
                          <div className="text-xs mt-1">
                            {totalDays} gün
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