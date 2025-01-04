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
import { CalendarIcon, FileSpreadsheet, Star, Crown, Trophy } from "lucide-react";
import { format, parseISO, isWithinInterval, startOfMonth, endOfMonth, differenceInDays } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { Employee, Leave, Achievement } from "@db/schema";
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

  const { data: achievements } = useQuery<Achievement[]>({
    queryKey: ["/api/achievements"],
  });

  // Başarı durumlarını hesapla
  const calculateAchievements = (employeeId: number, start: Date, end: Date) => {
    return achievements?.filter(achievement => {
      const achievementDate = parseISO(achievement.date);
      return (
        achievement.employeeId === employeeId &&
        isWithinInterval(achievementDate, { start, end })
      );
    }) || [];
  };

  // Ayın personelini bul (en çok yıldız alan)
  const findEmployeeOfTheMonth = (date: Date) => {
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    let maxStars = 0;
    let employeeOfTheMonth: Employee | undefined;

    employees?.forEach(employee => {
      const monthlyAchievements = calculateAchievements(employee.id, start, end);
      const totalStars = monthlyAchievements.reduce((sum, ach) => sum + Number(ach.stars), 0);

      if (totalStars > maxStars) {
        maxStars = totalStars;
        employeeOfTheMonth = employee;
      }
    });

    return { employee: employeeOfTheMonth, stars: maxStars };
  };

  // Ayın ve yılın şefini bul
  const findChiefStats = (date: Date, isYearly: boolean) => {
    const start = isYearly ? new Date(date.getFullYear(), 0, 1) : startOfMonth(date);
    const end = isYearly ? new Date(date.getFullYear(), 11, 31) : endOfMonth(date);
    let maxChiefDays = 0;
    let chiefEmployee: Employee | undefined;

    employees?.forEach(employee => {
      const periodAchievements = calculateAchievements(employee.id, start, end);
      const chiefDays = periodAchievements.filter(ach => ach.isChief).length;

      if (chiefDays > maxChiefDays) {
        maxChiefDays = chiefDays;
        chiefEmployee = employee;
      }
    });

    return { employee: chiefEmployee, days: maxChiefDays };
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

  const monthlyBest = findEmployeeOfTheMonth(currentDate);
  const monthlyChief = findChiefStats(currentDate, false);
  const yearlyChief = findChiefStats(currentDate, true);

  return (
    <Layout employees={employees || []} isLoading={employeesLoading}>
      <div className="container mx-auto p-4 lg:p-6 max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-lg shadow-sm">
          <h1 className="text-2xl font-bold">Raporlar</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={selectedEmployeeId}
              onValueChange={setSelectedEmployeeId}
            >
              <SelectTrigger className="w-[200px] bg-white">
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

        {/* Başarı Özeti */}
        <div className="grid gap-4 md:grid-cols-3">
          {monthlyBest.employee && (
            <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2 text-yellow-700">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  Ayın Personeli
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="font-medium text-yellow-900">
                  {monthlyBest.employee.firstName} {monthlyBest.employee.lastName}
                </div>
                <div className="text-sm text-yellow-700 mt-1 flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-500" />
                  {monthlyBest.stars} yıldız
                </div>
              </CardContent>
            </Card>
          )}

          {monthlyChief.employee && (
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2 text-blue-700">
                  <Crown className="h-5 w-5 text-blue-500" />
                  Ayın Şefi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="font-medium text-blue-900">
                  {monthlyChief.employee.firstName} {monthlyChief.employee.lastName}
                </div>
                <div className="text-sm text-blue-700 mt-1">
                  {monthlyChief.days} gün şeflik
                </div>
              </CardContent>
            </Card>
          )}

          {yearlyChief.employee && (
            <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2 text-purple-700">
                  <Crown className="h-5 w-5 text-purple-500" />
                  Yılın Şefi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="font-medium text-purple-900">
                  {yearlyChief.employee.firstName} {yearlyChief.employee.lastName}
                </div>
                <div className="text-sm text-purple-700 mt-1">
                  {yearlyChief.days} gün şeflik
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Başarı Takvimi */}
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Aylık Başarı Raporu - {format(currentDate, "MMMM yyyy", { locale: tr })}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {filteredEmployees?.map((employee) => {
                const monthStart = startOfMonth(currentDate);
                const monthEnd = endOfMonth(currentDate);
                const monthlyAchievements = calculateAchievements(employee.id, monthStart, monthEnd);

                return (
                  <div key={employee.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">
                        {employee.firstName} {employee.lastName}
                      </div>
                      <div className="text-sm flex items-center gap-4">
                        <span className="flex items-center gap-1 text-blue-600">
                          <Crown className="h-4 w-4" />
                          {monthlyAchievements.filter(a => a.isChief).length} gün
                        </span>
                        <span className="flex items-center gap-1 text-yellow-600">
                          <Star className="h-4 w-4" />
                          {monthlyAchievements.reduce((sum, a) => sum + Number(a.stars), 0)} yıldız
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-7 md:grid-cols-31 gap-1">
                      {daysInMonth.map((day) => {
                        const dayAchievement = monthlyAchievements.find(a => 
                          format(parseISO(a.date), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
                        );

                        const bgColor = dayAchievement?.isChief
                          ? "bg-gradient-to-br from-blue-50 to-blue-100 border-blue-300 text-blue-700"
                          : dayAchievement?.stars
                          ? "bg-gradient-to-br from-yellow-50 to-orange-100 border-orange-300 text-orange-700"
                          : "border-gray-200 hover:border-gray-300 bg-gradient-to-br from-gray-50 to-white";

                        return (
                          <div
                            key={day.toISOString()}
                            className={cn(
                              "text-center text-xs p-1 rounded-md border-2 transition-all hover:scale-105",
                              bgColor
                            )}
                            title={dayAchievement?.isChief ? "Şef" : dayAchievement?.stars ? `${dayAchievement.stars} Yıldız` : undefined}
                          >
                            <div>{format(day, "d")}</div>
                            {dayAchievement && (
                              <div className="flex justify-center mt-1">
                                {dayAchievement.isChief && <Crown className="h-3 w-3" />}
                                {dayAchievement.stars > 0 && <Star className="h-3 w-3 fill-current" />}
                              </div>
                            )}
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
      </div>
    </Layout>
  );
}