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
import { CalendarIcon, Star, ChefHat, X, Download, Trash2, AlertCircle } from "lucide-react";
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { Employee, DailyAchievement } from "@db/schema";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
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

type EmployeeWithStats = Employee & {
  stars: number;
  chefs: number;
  damages: number;
};

export default function PerformancePage() {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [achievementType, setAchievementType] = useState<'STAR' | 'CHEF' | 'X'>('STAR');
  const [notes, setNotes] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: employees = [], isLoading: employeesLoading, error: employeesError } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
    retry: false
  });

  const { data: achievements = [], error: achievementsError } = useQuery<DailyAchievement[]>({
    queryKey: ["/api/achievements"],
    retry: false
  });

  const deleteAchievementMutation = useMutation({
    mutationFn: async (achievementId: number) => {
      try {
        const response = await fetch(`/api/achievements/${achievementId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText);
        }

        return response.json();
      } catch (error) {
        logger.error("Failed to delete achievement", error as Error, { achievementId });
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/achievements"] });
      toast({
        title: "Başarı",
        description: "Performans değerlendirmesi silindi.",
      });
      logger.info("Achievement deleted successfully");
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: "Performans değerlendirmesi silinemedi: " + error.message,
        variant: "destructive",
      });
    },
  });

  const achievementMutation = useMutation({
    mutationFn: async (data: { employeeId: number; date: string; type: string; notes?: string }) => {
      try {
        const response = await fetch("/api/achievements", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText);
        }

        return response.json();
      } catch (error) {
        logger.error("Failed to save achievement", error as Error, { data });
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/achievements"] });
      toast({
        title: "Başarı",
        description: "Performans değerlendirmesi kaydedildi.",
      });
      setSelectedDate(null);
      setNotes("");
      logger.info("Achievement saved successfully");
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: "Performans değerlendirmesi kaydedilemedi: " + error.message,
        variant: "destructive",
      });
    },
  });

  // Error states handling
  if (employeesError || achievementsError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive mb-4">
              <AlertCircle className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Bir Hata Oluştu</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {employeesError ? "Personel listesi alınamadı" : "Performans verileri alınamadı"}
            </p>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="w-full"
            >
              Sayfayı Yenile
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (employeesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const calculateAchievements = (employeeId: number, start: Date, end: Date) => {
    return achievements.filter(achievement => {
      const achievementDate = parseISO(achievement.date);
      return (
        achievement.employeeId === employeeId &&
        isWithinInterval(achievementDate, { start, end })
      );
    });
  };

  const calculateTopPerformers = () => {
    if (!employees || !achievements) return null;

    const stats = employees.map(employee => {
      const employeeAchievements = achievements.filter(a => a.employeeId === employee.id);
      return {
        ...employee,
        stars: employeeAchievements.filter(a => a.type === 'STAR').length,
        chefs: employeeAchievements.filter(a => a.type === 'CHEF').length,
        damages: employeeAchievements.filter(a => a.type === 'X').length,
      };
    });

    return {
      topStar: stats.sort((a, b) => b.stars - a.stars)[0],
      topChef: stats.sort((a, b) => b.chefs - a.chefs)[0],
      mostDamage: stats.sort((a, b) => b.damages - a.damages)[0],
    };
  };

  const handleDeleteAchievement = (achievementId: number) => {
    if (window.confirm('Bu performans değerlendirmesini silmek istediğinize emin misiniz?')) {
      deleteAchievementMutation.mutate(achievementId);
    }
  };

  const daysInMonth = Array.from(
    { length: endOfMonth(currentDate).getDate() },
    (_, i) => new Date(currentDate.getFullYear(), currentDate.getMonth(), i + 1)
  );

  const filteredEmployees = selectedEmployeeId === "all"
    ? employees
    : employees.filter(emp => emp.id === parseInt(selectedEmployeeId));

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

    if (!selectedEmployeeId || selectedEmployeeId === "all") {
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

  const topPerformers = calculateTopPerformers();

  return (
    <Layout employees={employees || []} isLoading={employeesLoading}>
      <div className="container mx-auto p-4 lg:p-6 max-w-7xl space-y-6">
        {/* Performans Özeti Widget'ları */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {topPerformers && (
            <>
              <Card className="bg-gradient-to-br from-yellow-50 via-yellow-100 to-amber-50 border-yellow-200 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-500" />
                    <span className="bg-gradient-to-r from-yellow-600 to-amber-600 bg-clip-text text-transparent">
                      En Başarılı Personel
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="font-medium text-lg">{topPerformers.topStar.firstName} {topPerformers.topStar.lastName}</div>
                  <div className="text-sm text-yellow-600/80">{topPerformers.topStar.stars} yıldız</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-50 via-blue-100 to-cyan-50 border-blue-200 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ChefHat className="h-5 w-5 text-blue-500" />
                    <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                      En Başarılı Şef
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="font-medium text-lg">{topPerformers.topChef.firstName} {topPerformers.topChef.lastName}</div>
                  <div className="text-sm text-blue-600/80">{topPerformers.topChef.chefs} şef rozeti</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-red-50 via-red-100 to-rose-50 border-red-200 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <X className="h-5 w-5 text-red-500" />
                    <span className="bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent">
                      En Çok Zarar Kaydı
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="font-medium text-lg">{topPerformers.mostDamage.firstName} {topPerformers.mostDamage.lastName}</div>
                  <div className="text-sm text-red-600/80">{topPerformers.mostDamage.damages} zarar</div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
            Performans Değerlendirme
          </h1>
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <Select
              value={selectedEmployeeId}
              onValueChange={setSelectedEmployeeId}
            >
              <SelectTrigger className="w-full md:w-[200px] bg-white hover:bg-gray-50 transition-colors">
                <SelectValue placeholder="Personel Seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Personeller</SelectItem>
                {employees.map((employee) => (
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
                    "w-full md:w-auto justify-start text-left font-normal bg-white hover:bg-gray-50 transition-colors",
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
              className="w-full md:w-auto bg-white hover:bg-gray-50 transition-colors gap-2"
              onClick={() => {
                if (!currentDate) {
                  toast({
                    title: "Uyarı",
                    description: "Lütfen ay seçin.",
                    variant: "destructive",
                  });
                  return;
                }

                const url = `/api/achievements/excel?${selectedEmployeeId !== 'all' ? `employeeId=${selectedEmployeeId}&` : ''}date=${format(currentDate, 'yyyy-MM')}`;
                window.open(url, '_blank');
              }}
            >
              <Download className="h-4 w-4" />
              Excel İndir
            </Button>
          </div>
        </div>

        <Card className="bg-white shadow-sm hover:shadow-md transition-shadow duration-300">
          <CardHeader>
            <CardTitle>Aylık Performans - {format(currentDate, "MMMM yyyy", { locale: tr })}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {filteredEmployees.map((employee) => {
                const monthStart = startOfMonth(currentDate);
                const monthEnd = endOfMonth(currentDate);
                const monthlyAchievements = calculateAchievements(employee.id, monthStart, monthEnd);

                const stats = {
                  STAR: monthlyAchievements.filter(a => a.type === 'STAR').length,
                  CHEF: monthlyAchievements.filter(a => a.type === 'CHEF').length,
                  X: monthlyAchievements.filter(a => a.type === 'X').length,
                };

                return (
                  <div key={employee.id} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-lg">
                        {employee.firstName} {employee.lastName}
                      </div>
                      <div className="flex items-center gap-6">
                        <span className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span className="font-medium">{stats.STAR}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <ChefHat className="h-4 w-4 text-blue-500" />
                          <span className="font-medium">{stats.CHEF}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <X className="h-4 w-4 text-red-500" />
                          <span className="font-medium">{stats.X}</span>
                        </span>
                      </div>
                    </div>

                    {/* Mobil uyumlu takvim grid yapısı */}
                    <div className="grid grid-cols-4 sm:grid-cols-7 lg:grid-cols-14 xl:grid-cols-31 gap-2">
                      {daysInMonth.map((day) => {
                        const dayAchievement = monthlyAchievements.find(
                          a => format(parseISO(a.date), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
                        );

                        return (
                          <div
                            key={day.toISOString()}
                            onClick={() => {
                              setSelectedDate(day);
                              setSelectedEmployeeId(employee.id.toString());
                              setNotes("");
                            }}
                            className={cn(
                              "relative p-3 rounded-lg border-2 transition-all hover:scale-105 cursor-pointer",
                              dayAchievement
                                ? "bg-gradient-to-br border-gray-300 shadow hover:shadow-md"
                                : "border-gray-200 hover:border-gray-300 bg-gradient-to-br from-gray-50 to-white"
                            )}
                          >
                            <div className="text-center">
                              <div className="font-medium mb-1">{format(day, "d")}</div>
                              {dayAchievement && (
                                <div className="flex flex-col items-center gap-1">
                                  {getAchievementIcon(dayAchievement.type)}
                                  {dayAchievement.notes && (
                                    <div className="text-xs text-gray-500 truncate max-w-[100px]" title={dayAchievement.notes}>
                                      {dayAchievement.notes}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            {dayAchievement && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-white shadow hover:bg-red-50 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteAchievement(dayAchievement.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
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

        <Card className="bg-white shadow-sm hover:shadow-md transition-shadow duration-300">
          <CardHeader>
            <CardTitle>Yıllık Performans Özeti - {currentDate.getFullYear()}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {filteredEmployees.map((employee) => (
                <div key={employee.id} className="space-y-4">
                  <div className="font-medium text-lg">
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
                            "p-2 text-center rounded-lg border-2 transition-all hover:scale-105 hover:shadow-md",
                            hasAchievements
                              ? "bg-gradient-to-br from-blue-50 via-purple-50 to-blue-50 border-blue-200"
                              : "border-gray-200 hover:border-gray-300 bg-gradient-to-br from-gray-50 to-white"
                          )}
                        >
                          <div className="font-medium">
                            {format(monthDate, "MMM", { locale: tr })}
                          </div>
                          <div className="flex flex-col gap-1 mt-2">
                            <div className="flex items-center justify-center gap-1 text-xs">
                              <Star className="h-3 w-3 text-yellow-500" />
                              <span className="font-medium">{monthStats.STAR}</span>
                            </div>
                            <div className="flex items-center justify-center gap-1 text-xs">
                              <ChefHat className="h-3 w-3 text-blue-500" />
                              <span className="font-medium">{monthStats.CHEF}</span>
                            </div>
                            <div className="flex items-center justify-center gap-1 text-xs">
                              <X className="h-3 w-3 text-red-500" />
                              <span className="font-medium">{monthStats.X}</span>
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

        <Dialog open={!!selectedDate} onOpenChange={(open) => {
          if (!open) {
            setSelectedDate(null);
            setNotes("");
          }
        }}>
          <DialogContent className="sm:max-w-md">
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
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                {achievementMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}