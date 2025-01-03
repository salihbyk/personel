import { useState } from "react";
import { addDays, format, startOfWeek } from "date-fns";
import { tr } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import type { Employee, Leave } from "@db/schema";

interface WeeklyCalendarProps {
  employee: Employee;
}

export function WeeklyCalendar({ employee }: WeeklyCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [note, setNote] = useState("");
  const { toast } = useToast();

  const startDate = startOfWeek(new Date(), { locale: tr });
  const weekDays = [...Array(7)].map((_, i) => addDays(startDate, i));

  const { data: leaves } = useQuery<Leave[]>({
    queryKey: [`/api/leaves?employeeId=${employee.id}`],
  });

  const mutation = useMutation({
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
      (leave) =>
        new Date(leave.startDate) <= date && new Date(leave.endDate) >= date
    );
  };

  const getLeaveNote = (date: Date) => {
    return leaves?.find(
      (leave) =>
        new Date(leave.startDate) <= date && new Date(leave.endDate) >= date
    )?.reason;
  };

  return (
    <>
      <div className="grid grid-cols-7 gap-4 p-4">
        {weekDays.map((day) => {
          const hasLeave = isLeaveDay(day);
          const leaveNote = getLeaveNote(day);

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "aspect-square p-2 rounded-lg border cursor-pointer hover:bg-accent transition-colors",
                hasLeave && "bg-yellow-100 hover:bg-yellow-200"
              )}
              onClick={() => {
                if (!hasLeave) {
                  setSelectedDate(day);
                } else {
                  toast({
                    description: `Not: ${leaveNote}`,
                  });
                }
              }}
            >
              <div className="text-center">
                <div className="font-medium">{format(day, "EEEE", { locale: tr })}</div>
                <div className="text-sm text-muted-foreground">
                  {format(day, "d MMM", { locale: tr })}
                </div>
                {hasLeave && (
                  <Badge variant="outline" className="mt-2">
                    İzinli
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={!!selectedDate} onOpenChange={() => setSelectedDate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              İzin Ekle - {selectedDate && format(selectedDate, "d MMMM yyyy", { locale: tr })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="İzin notu ekleyin..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              type="submit"
              onClick={() => {
                if (selectedDate) {
                  mutation.mutate({
                    employeeId: employee.id,
                    startDate: selectedDate.toISOString(),
                    endDate: selectedDate.toISOString(),
                    reason: note,
                    type: "vacation",
                    status: "approved",
                  });
                }
              }}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
