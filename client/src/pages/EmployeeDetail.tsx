import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { WeeklyCalendar } from "@/components/WeeklyCalendar";
import { InventorySection } from "@/components/InventorySection";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import type { Employee, Leave } from "@db/schema";
import { useState } from "react";

export default function EmployeeDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: employees, isLoading: employeesLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: employee } = useQuery<Employee>({
    queryKey: [`/api/employees/${id}`],
    enabled: !!id,
  });

  const { data: leaves } = useQuery<Leave[]>({
    queryKey: [`/api/leaves?employeeId=${id}`],
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/employees/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({
        title: "Başarılı",
        description: "Personel silindi",
      });
      setLocation("/");
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (!employee) {
    return null;
  }

  return (
    <Layout employees={employees || []} isLoading={employeesLoading}>
      <div className="p-8 space-y-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>
                {employee.firstName} {employee.lastName}
              </CardTitle>
              <CardDescription>
                {employee.position} - {employee.department}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setLocation(`/employee/${id}/edit`)}
                className="transition-all hover:shadow-md hover:-translate-y-0.5"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowDeleteDialog(true)}
                className="transition-all hover:shadow-md hover:-translate-y-0.5 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <span className="font-medium">E-posta:</span> {employee.email}
              </div>
              <div>
                <span className="font-medium">Telefon:</span> {employee.phone}
              </div>
              <div>
                <span className="font-medium">Adres:</span> {employee.address}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Haftalık İzin Takvimi</CardTitle>
          </CardHeader>
          <CardContent>
            <WeeklyCalendar employee={employee} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>İzin Geçmişi</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-4">
                {leaves?.map((leave) => (
                  <div
                    key={leave.id}
                    className="p-4 rounded-lg border"
                  >
                    <div className="font-medium">
                      {format(new Date(leave.startDate), "d MMMM yyyy", { locale: tr })} -{" "}
                      {format(new Date(leave.endDate), "d MMMM yyyy", { locale: tr })}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {leave.reason}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <InventorySection employee={employee} />
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Personeli Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu personeli silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? "Siliniyor..." : "Evet, Sil"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}