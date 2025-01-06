import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WeeklyCalendar } from "@/components/WeeklyCalendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Users, CalendarDays, CalendarClock, Check, ChevronsUpDown } from "lucide-react";
import { isWithinInterval, parseISO, startOfDay, endOfDay, format, differenceInDays, addDays } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { Employee, Leave } from "@db/schema";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function Dashboard() {
  const { data: employees, isLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: leaves } = useQuery<Leave[]>({
    queryKey: ["/api/leaves"],
  });

  const [selectedEmployees, setSelectedEmployees] = useState<number[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [days, setDays] = useState("1");
  const [notes, setNotes] = useState("");
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const bulkLeaveMutation = useMutation({
    mutationFn: async (data: { employeeIds: number[]; startDate: string; endDate: string; reason?: string }) => {
      const response = await fetch("/api/leaves/bulk", {
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
      queryClient.invalidateQueries({ queryKey: ["/api/leaves"] });
      toast({
        title: "Başarılı",
        description: "Toplu izin kaydedildi",
      });
      setSelectedEmployees([]);
      setSelectedDate(undefined);
      setDays("1");
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
          <Card className="relative overflow-hidden border-2 border-blue-200 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-100/50 via-white to-blue-50" />
            <CardContent className="p-6 flex items-center gap-4 relative">
              <div className="p-3 bg-blue-100 rounded-full shadow-md">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Toplam Personel</div>
                <div className="text-2xl font-semibold">{employees?.length || 0}</div>
              </div>
            </CardContent>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-300 to-purple-300" />
          </Card>

          <Card className="relative overflow-hidden border-2 border-green-200 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
            <div className="absolute inset-0 bg-gradient-to-br from-green-100/50 via-white to-green-50" />
            <CardContent className="p-6 flex items-center gap-4 relative">
              <div className="p-3 bg-green-100 rounded-full shadow-md">
                <CalendarDays className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Bugün İzinli</div>
                <div className="text-2xl font-semibold">{todayLeaveCount}</div>
              </div>
            </CardContent>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-green-300 to-teal-300" />
          </Card>

          <Card className="relative overflow-hidden border-2 border-purple-200 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-100/50 via-white to-purple-50" />
            <CardContent className="p-6 flex items-center gap-4 relative">
              <div className="p-3 bg-purple-100 rounded-full shadow-md">
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
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-300 to-pink-300" />
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

        {/* New Bulk Leave Management Section */}
        <Card className="mb-6 bg-gradient-to-br from-purple-50 via-white to-purple-50 border-purple-100 transition-all duration-300 hover:shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600" />
              Toplu İzin Yönetimi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>Personel Seçimi</Label>
                <Popover open={open} onOpenChange={setOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={open}
                      className="justify-between w-full md:w-[500px]"
                    >
                      {selectedEmployees.length > 0
                        ? `${selectedEmployees.length} personel seçildi`
                        : "Personel seçin..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full md:w-[500px] p-0">
                    <Command>
                      <CommandInput placeholder="Personel ara..." />
                      <CommandEmpty>Personel bulunamadı.</CommandEmpty>
                      <CommandGroup>
                        <ScrollArea className="h-72">
                          {employees?.map((employee) => (
                            <CommandItem
                              key={employee.id}
                              onSelect={() => {
                                setSelectedEmployees((prev) =>
                                  prev.includes(employee.id)
                                    ? prev.filter((id) => id !== employee.id)
                                    : [...prev, employee.id]
                                );
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedEmployees.includes(employee.id)
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              {employee.firstName} {employee.lastName}
                            </CommandItem>
                          ))}
                        </ScrollArea>
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Başlangıç Tarihi</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !selectedDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarDays className="mr-2 h-4 w-4" />
                        {selectedDate ? (
                          format(selectedDate, "d MMMM yyyy", { locale: tr })
                        ) : (
                          <span>Tarih seçin</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        initialFocus
                        locale={tr}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Gün Sayısı</Label>
                  <Input
                    type="number"
                    min="1"
                    max="30"
                    value={days}
                    onChange={(e) => setDays(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Not (Opsiyonel)</Label>
                <Textarea
                  placeholder="İzin notu ekleyin..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>

              <Button
                className="w-full md:w-auto bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
                onClick={() => {
                  if (!selectedDate || selectedEmployees.length === 0) {
                    toast({
                      title: "Uyarı",
                      description: "Lütfen tarih ve en az bir personel seçin.",
                      variant: "destructive",
                    });
                    return;
                  }

                  const endDate = addDays(selectedDate, Number(days) - 1);
                  bulkLeaveMutation.mutate({
                    employeeIds: selectedEmployees,
                    startDate: format(selectedDate, "yyyy-MM-dd"),
                    endDate: format(endDate, "yyyy-MM-dd"),
                    reason: notes || undefined,
                  });
                }}
                disabled={bulkLeaveMutation.isPending}
              >
                {bulkLeaveMutation.isPending ? "Kaydediliyor..." : "Toplu İzin Ekle"}
              </Button>
            </div>
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