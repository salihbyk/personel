import { useState } from "react";
import { addDays, format, startOfWeek } from "date-fns";
import { tr } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { Employee, Leave } from "@db/schema";

interface WeeklyCalendarProps {
  employee: Employee;
}

export function WeeklyCalendar({ employee }: WeeklyCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedLeave, setSelectedLeave] = useState<Leave | null>(null);
  const [note, setNote] = useState("");
  const [days, setDays] = useState("1");
  const { toast } = useToast();

  const startDate = startOfWeek(new Date(), { locale: tr });
  const weekDays = [...Array(7)].map((_, i) => addDays(startDate, i));

  const { data: leaves } = useQuery<Leave[]>({
    queryKey: [`/api/leaves?employeeId=${employee.id}`],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { employeeId: number; startDate: string; endDate: string; reason: string; type: string; status: string }) => {
      const response = await fetch("/api/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/leaves?employeeId=${employee.id}`] });
      toast({
        title: "Başarılı",
        description: "İzin kaydedildi",
      });
      setSelectedDate(null);
      setNote("");
      setDays("1");
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
      const response = await fetch(`/api/leaves/${leaveId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/leaves?employeeId=${employee.id}`] });
      toast({
        title: "Başarılı",
        description: "İzin silindi",
      });
      setSelectedLeave(null);
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
        const start = new Date(leave.startDate);
        const end = new Date(leave.endDate);
        return date >= start && date <= end;
      }
    );
  };

  const getLeave = (date: Date) => {
    return leaves?.find(
      (leave) => {
        const start = new Date(leave.startDate);
        const end = new Date(leave.endDate);
        return date >= start && date <= end;
      }
    );
  };

  return (
    <>
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day) => {
          const leave = getLeave(day);
          const hasLeave = !!leave;

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "p-2 rounded-lg border transition-all cursor-pointer hover:shadow-md relative group",
                hasLeave ? "bg-yellow-100 border-yellow-300" : "hover:bg-accent/50"
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
                <div className="text-sm font-medium">
                  {format(day, "EEE", { locale: tr })}
                </div>
                <div className="text-xs text-muted-foreground">
                  {format(day, "d", { locale: tr })}
                </div>
                {hasLeave && (
                  <>
                    <Badge variant="outline" className="w-full text-[10px] py-0">
                      İzinli
                    </Badge>
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

      <Dialog open={!!selectedDate} onOpenChange={() => setSelectedDate(null)}>
        <DialogContent className="sm:max-w-[425px]">
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
                    startDate: selectedDate.toISOString(),
                    endDate: endDate.toISOString(),
                    reason: note,
                    type: "izin",
                    status: "onaylandı",
                  });
                }
              }}
              disabled={createMutation.isPending || !note.trim()}
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
            >
              Evet, Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}