import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarIcon, X, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, API_BASE_URL, getAuthHeaders } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { format, addDays, startOfWeek, isWithinInterval, parseISO, addWeeks, subWeeks } from "date-fns";
import { tr } from "date-fns/locale";
import type { Employee, Leave } from "@db/schema";

interface WeeklyCalendarProps {
  employee: Employee;
}

const cardStyle = `
  bg-gradient-to-br from-blue-50 via-white to-blue-50
  border-2 border-blue-300
  shadow-sm
  hover:shadow-lg
  hover:-translate-y-0.5
  transition-all duration-300
  after:absolute
  after:bottom-0
  after:left-0
  after:right-0
  after:h-1.5
  after:bg-gradient-to-r
  after:from-blue-400
  after:to-purple-400
`;

const leaveCardStyle = `
  bg-gradient-to-br from-red-100 via-red-50 to-white 
  border-3 border-red-400
  shadow-md
  hover:shadow-lg 
  hover:-translate-y-0.5 
  transition-all duration-300
  relative
  after:absolute
  after:bottom-0
  after:left-0
  after:right-0
  after:h-1.5
  after:bg-gradient-to-r
  after:from-red-500
  after:to-pink-500
`;

export function WeeklyCalendar({ employee }: WeeklyCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedLeave, setSelectedLeave] = useState<Leave | null>(null);
  const [note, setNote] = useState("");
  const [days, setDays] = useState("1");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const startDate = startOfWeek(currentDate, { locale: tr });
  const weekDays = [...Array(7)].map((_, i) => addDays(startDate, i));

  const { data: leaves, refetch, isLoading: leavesLoading } = useQuery<Leave[]>({
    queryKey: [`/api/leaves?employeeId=${employee.id}`],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { employeeId: number; startDate: string; endDate: string; reason: string; type: string; status: string }) => {
      setIsUpdating(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/leaves`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        return response.json();
      } finally {
        setIsUpdating(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leaves"] });
      queryClient.invalidateQueries({ queryKey: [`/api/leaves?employeeId=${employee.id}`] });
      toast({
        title: "Başarılı",
        description: "İzin kaydedildi",
      });
      setSelectedDate(null);
      setNote("");
      setDays("1");
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (leaveId: number) => {
      const response = await fetch(`${API_BASE_URL}/api/leaves/${leaveId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leaves"] });
      queryClient.invalidateQueries({ queryKey: [`/api/leaves?employeeId=${employee.id}`] });
      toast({
        title: "Başarılı",
        description: "İzin silindi",
      });
      setSelectedLeave(null);
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const isLeaveDay = (date: Date) => {
    return leaves?.some(
      (leave) => {
        const startDate = parseISO(leave.startDate);
        const endDate = parseISO(leave.endDate);
        return isWithinInterval(date, { start: startDate, end: endDate });
      }
    );
  };

  const getLeave = (date: Date) => {
    return leaves?.find(
      (leave) => {
        const startDate = parseISO(leave.startDate);
        const endDate = parseISO(leave.endDate);
        return isWithinInterval(date, { start: startDate, end: endDate });
      }
    );
  };

  const handlePreviousWeek = () => {
    setCurrentDate(subWeeks(currentDate, 1));
  };

  const handleNextWeek = () => {
    setCurrentDate(addWeeks(currentDate, 1));
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePreviousWeek}
            className={cn(
              "transition-all hover:scale-105",
              cardStyle
            )}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleNextWeek}
            className={cn(
              "transition-all hover:scale-105",
              cardStyle
            )}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-sm font-medium text-muted-foreground">
          {format(startDate, "MMMM yyyy", { locale: tr })}
        </div>
      </div>

      {leavesLoading ? (
        <div className="grid grid-cols-7 gap-1 md:gap-2">
          {[...Array(7)].map((_, i) => (
            <div
              key={i}
              className="h-16 bg-gray-100 rounded-lg animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1 md:gap-2">
          {weekDays.map((day) => {
            const leave = getLeave(day);
            const hasLeave = !!leave;

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "p-1 md:p-2 rounded-lg border-2 transition-all cursor-pointer relative group min-h-[80px] md:min-h-[100px] overflow-hidden",
                  hasLeave ? leaveCardStyle : cardStyle,
                  isUpdating && "opacity-50 pointer-events-none"
                )}
                onClick={() => {
                  if (!hasLeave) {
                    setSelectedDate(day);
                  } else {
                    toast({
                      description: `Not: ${leave?.reason}`,
                    });
                  }
                }}
              >
                <div className="text-center space-y-1">
                  <div className={cn(
                    "text-sm font-medium",
                    hasLeave && "text-red-700"
                  )}>
                    {format(day, "EEE", { locale: tr })}
                  </div>
                  <div className={cn(
                    "text-xs",
                    hasLeave ? "text-red-600" : "text-muted-foreground"
                  )}>
                    {format(day, "d", { locale: tr })}
                  </div>
                  {hasLeave && (
                    <>
                      <div className="hidden md:block">
                        <Badge 
                          variant="outline" 
                          className="w-full text-[10px] py-0 border-red-400 text-red-700 bg-red-100"
                        >
                          İzinli
                        </Badge>
                      </div>
                      <div className="block md:hidden">
                        <Badge 
                          variant="outline" 
                          className="w-6 h-6 p-0 flex items-center justify-center rounded-full border-red-400 text-red-700 bg-red-100"
                        >
                          <Check className="h-3 w-3" />
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-1 right-1 h-4 w-4 opacity-0 group-hover:opacity-100 hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLeave(leave);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!selectedDate} onOpenChange={() => setSelectedDate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              İzin Ekle
            </DialogTitle>
            <DialogDescription>
              {selectedDate && format(selectedDate, "d MMMM yyyy", { locale: tr })}
              {Number(days) > 1 && selectedDate && ` - ${format(addDays(selectedDate, Number(days) - 1), "d MMMM yyyy", { locale: tr })}`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="days">Kaç Gün?</Label>
              <Input
                id="days"
                type="number"
                min="1"
                max="30"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                className="w-full"
              />
            </div>
            <Textarea
              placeholder="İzin notu ekleyin..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedDate(null)}>
              İptal
            </Button>
            <Button
              onClick={() => {
                if (selectedDate && note.trim()) {
                  const endDate = addDays(selectedDate, Number(days) - 1);
                  createMutation.mutate({
                    employeeId: employee.id,
                    startDate: format(selectedDate, "yyyy-MM-dd"),
                    endDate: format(endDate, "yyyy-MM-dd"),
                    reason: note,
                    type: "izin",
                    status: "onaylandı",
                  });
                }
              }}
              disabled={createMutation.isPending || !note.trim() || isUpdating}
            >
              {createMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!selectedLeave} onOpenChange={() => setSelectedLeave(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>İzni Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu izni silmek istediğinize emin misiniz?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedLeave) {
                  deleteMutation.mutate(selectedLeave.id);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Evet, Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}