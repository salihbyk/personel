import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format, addDays } from "date-fns";
import { tr } from "date-fns/locale";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, API_BASE_URL } from "@/lib/queryClient";
import type { Employee, Leave } from "@db/schema";

interface LeaveCalendarProps {
  employees: Employee[];
}

export default function LeaveCalendar({ employees }: LeaveCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [note, setNote] = useState("");
  const [days, setDays] = useState("1");
  const { toast } = useToast();

  const { data: leaves, refetch } = useQuery<Leave[]>({
    queryKey: ["/api/leaves"],
  });

  const mutation = useMutation({
    mutationFn: async (data: { employeeId: number; startDate: string; endDate: string; reason: string; type: string; status: string }) => {
      const response = await fetch(`${API_BASE_URL}/api/leaves`, {
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
      queryClient.invalidateQueries({ queryKey: ["/api/leaves"] });
      toast({
        title: "Success",
        description: "Leave request submitted successfully",
      });
      setSelectedDate(undefined);
      setNote("");
      setDays("1");
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const modifiers = {
    leave: leaves?.map((leave) => ({
      from: new Date(leave.startDate),
      to: new Date(leave.endDate),
    })) || [],
  };

  const modifiersStyles = {
    leave: {
      backgroundColor: "var(--primary)",
      color: "white",
    },
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="cursor-pointer">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            modifiers={modifiers}
            modifiersStyles={modifiersStyles}
            className="rounded-md border"
            locale={tr}
            showOutsideDays={true}
            fixedWeeks={true}
          />
        </div>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            İzinler - {selectedDate && format(selectedDate, "MMMM d, yyyy", { locale: tr })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {leaves
            ?.filter(
              (leave) =>
                selectedDate &&
                new Date(leave.startDate) <= selectedDate &&
                new Date(leave.endDate) >= selectedDate
            )
            .map((leave) => {
              const employee = employees.find((e) => e.id === leave.employeeId);
              return (
                <div
                  key={leave.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">
                      {employee?.firstName} {employee?.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(leave.startDate), "MMM d", { locale: tr })} -{" "}
                      {format(new Date(leave.endDate), "MMM d, yyyy", { locale: tr })}
                    </p>
                  </div>
                  <Badge>{leave.type}</Badge>
                </div>
              );
            })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setSelectedDate(undefined)}>
            Kapat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}