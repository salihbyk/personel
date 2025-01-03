import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import type { Employee, Leave } from "@db/schema";

interface LeaveCalendarProps {
  employees: Employee[];
}

export default function LeaveCalendar({ employees }: LeaveCalendarProps) {
  const [selected, setSelected] = useState<Date>();
  const { toast } = useToast();

  const { data: leaves } = useQuery<Leave[]>({
    queryKey: ["/api/leaves"],
  });

  const mutation = useMutation({
    mutationFn: async (data: Partial<Leave>) => {
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
      queryClient.invalidateQueries({ queryKey: ["/api/leaves"] });
      toast({
        title: "Success",
        description: "Leave request submitted successfully",
      });
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
            selected={selected}
            onSelect={setSelected}
            modifiers={modifiers}
            modifiersStyles={modifiersStyles}
            className="rounded-md border"
          />
        </div>
      </DialogTrigger>
      
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Leaves for {selected && format(selected, "MMMM d, yyyy")}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {leaves
            ?.filter(
              (leave) =>
                selected &&
                new Date(leave.startDate) <= selected &&
                new Date(leave.endDate) >= selected
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
                      {format(new Date(leave.startDate), "MMM d")} -{" "}
                      {format(new Date(leave.endDate), "MMM d, yyyy")}
                    </p>
                  </div>
                  <Badge>{leave.type}</Badge>
                </div>
              );
            })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
