import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Star, ChefHat, X, Download } from "lucide-react";
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { Employee, DailyAchievement } from "@db/schema";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function PerformancePage() {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [achievementType, setAchievementType] = useState<'STAR' | 'CHEF' | 'X'>('STAR');
  const [notes, setNotes] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: employees, isLoading: employeesLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: achievements } = useQuery<DailyAchievement[]>({
    queryKey: ["/api/achievements"],
  });

  const achievementMutation = useMutation({
    mutationFn: async (data: { employeeId: number; date: string; type: string; notes?: string }) => {
      const response = await fetch("/api/achievements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/achievements"] });
      toast({
        title: "Başarı",
        description: "Performans değerlendirmesi kaydedildi.",
      });
      setSelectedDate(null);
      setNotes("");
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const calculateAchievements = (employeeId: number, start: Date, end: Date) => {
    return achievements?.filter(achievement => {
      const achievementDate = parseISO(achievement.date);
      return (
        achievement.employeeId === employeeId &&
        isWithinInterval(achievementDate, { start, end })
      );
    }) || [];
  };

  if (employeesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const daysInMonth = Array.from(
    { length: endOfMonth(currentDate).getDate() },
    (_, i) => new Date(currentDate.getFullYear(), currentDate.getMonth(), i + 1)
  );

  const filteredEmployees = selectedEmployeeId
    ? employees?.filter(emp => emp.id === parseInt(selectedEmployeeId))
    : employees;

  const getAchievementIcon = (type: string) => {
    switch (type) {
      case 'STAR':
        return <Star className="h-4 w-4 text-yellow-500" />;
      case 'CHEF':
        return <ChefHat className="h-4 w-4 text-blue-500" />;
      case 'X':
        return <X className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const handleSaveAchievement = () => {
    if (!selectedDate) {
      toast({
        title: "Uyarı",
        description: "Lütfen tarih seçin.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedEmployeeId) {
      toast({
        title: "Uyarı",
        description: "Lütfen personel seçin.",
        variant: "destructive",
      });
      return;
    }

    achievementMutation.mutate({
      employeeId: parseInt(selectedEmployeeId),
      date: format(selectedDate, 'yyyy-MM-dd'),
      type: achievementType,
      notes: notes.trim() || undefined,
    });
  };

  const handleExcelDownload = () => {
    if (!currentDate) {
      toast({
        title: "Uyarı",
        description: "Lütfen ay seçin.",
        variant: "destructive",
      });
      return;
    }

    const url = `/api/achievements/excel?${selectedEmployeeId ? `employeeId=${selectedEmployeeId}&` : ''}date=${format(currentDate, 'yyyy-MM')}`;
    window.open(url, '_blank');
  };

  return (
    <Layout employees={employees || []} isLoading={employeesLoading}>
      <div className="container mx-auto p-4 lg:p-6 max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-lg shadow-sm">
          <h1 className="text-2xl font-bold">Performans Değerlendirme</h1>
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
              className="bg-white gap-2"
              onClick={handleExcelDownload}
              disabled={!selectedEmployeeId}
            >
              <Download className="h-4 w-4" />
              Excel İndir
            </Button>
          </div>
        </div>

        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Aylık Performans - {format(currentDate, "MMMM yyyy", { locale: tr })}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {filteredEmployees?.map((employee) => {
                const monthStart = startOfMonth(currentDate);
                const monthEnd = endOfMonth(currentDate);
                const monthlyAchievements = calculateAchievements(employee.id, monthStart, monthEnd);

                const stats = {
                  STAR: monthlyAchievements.filter(a => a.type === 'STAR').length,
                  CHEF: monthlyAchievements.filter(a => a.type === 'CHEF').length,
                  X: monthlyAchievements.filter(a => a.type === 'X').length,
                };

                return (
                  <div key={employee.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">
                        {employee.firstName} {employee.lastName}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500" />
                          {stats.STAR}
                        </span>
                        <span className="flex items-center gap-1">
                          <ChefHat className="h-4 w-4 text-blue-500" />
                          {stats.CHEF}
                        </span>
                        <span className="flex items-center gap-1">
                          <X className="h-4 w-4 text-red-500" />
                          {stats.X}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-7 md:grid-cols-31 gap-1">
                      {daysInMonth.map((day) => {
                        const dayAchievement = monthlyAchievements.find(
                          a => format(parseISO(a.date), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
                        );

                        return (
                          <Button
                            key={day.toISOString()}
                            variant="ghost"
                            className={cn(
                              "text-center p-1 rounded-md border-2 transition-all hover:scale-105 h-auto flex-col items-center justify-center",
                              dayAchievement
                                ? "bg-gradient-to-br border-gray-300 shadow-sm"
                                : "border-gray-200 hover:border-gray-300 bg-gradient-to-br from-gray-50 to-white"
                            )}
                            onClick={() => {
                              setSelectedDate(day);
                              setNotes("");
                            }}
                          >
                            <div className="text-xs">{format(day, "d")}</div>
                            {dayAchievement && (
                              <div className="mt-1">
                                {getAchievementIcon(dayAchievement.type)}
                              </div>
                            )}
                          </Button>
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
            <CardTitle>Yıllık Performans Özeti - {currentDate.getFullYear()}</CardTitle>
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
                      const monthAchievements = calculateAchievements(employee.id, monthStart, monthEnd);

                      const monthStats = {
                        STAR: monthAchievements.filter(a => a.type === 'STAR').length,
                        CHEF: monthAchievements.filter(a => a.type === 'CHEF').length,
                        X: monthAchievements.filter(a => a.type === 'X').length,
                      };

                      const hasAchievements = monthStats.STAR > 0 || monthStats.CHEF > 0 || monthStats.X > 0;

                      return (
                        <div
                          key={i}
                          className={cn(
                            "p-2 text-center rounded-lg border-2 transition-all hover:scale-105",
                            hasAchievements
                              ? "bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200 shadow-sm"
                              : "border-gray-200 hover:border-gray-300 bg-gradient-to-br from-gray-50 to-white"
                          )}
                        >
                          <div className="font-medium">
                            {format(monthDate, "MMM", { locale: tr })}
                          </div>
                          <div className="flex flex-col gap-1 mt-2">
                            <div className="flex items-center justify-center gap-1 text-xs">
                              <Star className="h-3 w-3 text-yellow-500" />
                              <span>{monthStats.STAR}</span>
                            </div>
                            <div className="flex items-center justify-center gap-1 text-xs">
                              <ChefHat className="h-3 w-3 text-blue-500" />
                              <span>{monthStats.CHEF}</span>
                            </div>
                            <div className="flex items-center justify-center gap-1 text-xs">
                              <X className="h-3 w-3 text-red-500" />
                              <span>{monthStats.X}</span>
                            </div>
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

      <Dialog open={!!selectedDate} onOpenChange={(open) => {
        if (!open) {
          setSelectedDate(null);
          setNotes("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Performans Değerlendirmesi</DialogTitle>
            <DialogDescription>
              {selectedDate && format(selectedDate, "d MMMM yyyy", { locale: tr })} tarihli değerlendirme
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <RadioGroup
              value={achievementType}
              onValueChange={(value) => setAchievementType(value as 'STAR' | 'CHEF' | 'X')}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="STAR" id="star" />
                <Label htmlFor="star" className="flex items-center gap-1 cursor-pointer">
                  <Star className="h-4 w-4 text-yellow-500" />
                  Yıldız
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="CHEF" id="chef" />
                <Label htmlFor="chef" className="flex items-center gap-1 cursor-pointer">
                  <ChefHat className="h-4 w-4 text-blue-500" />
                  Şef
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="X" id="x" />
                <Label htmlFor="x" className="flex items-center gap-1 cursor-pointer">
                  <X className="h-4 w-4 text-red-500" />
                  Zarar
                </Label>
              </div>
            </RadioGroup>

            <div className="space-y-2">
              <Label htmlFor="notes">Notlar (Opsiyonel)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Değerlendirme ile ilgili notlarınızı buraya yazabilirsiniz..."
                className="min-h-[100px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedDate(null);
                setNotes("");
              }}
            >
              İptal
            </Button>
            <Button
              onClick={handleSaveAchievement}
            >
              {achievementMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}