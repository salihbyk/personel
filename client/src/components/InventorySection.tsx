import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { inventoryItemSchema } from "@/lib/schemas";
import type { Employee, InventoryItem } from "@db/schema";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { z } from "zod";

type FormData = z.infer<typeof inventoryItemSchema>;

interface InventorySectionProps {
  employee: Employee;
}

export function InventorySection({ employee }: InventorySectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(inventoryItemSchema),
    defaultValues: {
      name: "",
      notes: "",
      assignedTo: employee.id,
    },
  });

  const { data: items, isLoading } = useQuery<InventoryItem[]>({
    queryKey: [`/api/inventory?employeeId=${employee.id}`],
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch("/api/inventory", {
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
      queryClient.invalidateQueries({ queryKey: [`/api/inventory?employeeId=${employee.id}`] });
      toast({
        title: "Başarılı",
        description: "Zimmetli eşya eklendi",
      });
      setIsOpen(false);
      form.reset();
      window.location.reload();
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: FormData & { id: number }) => {
      const { id, ...rest } = data;
      const response = await fetch(`/api/inventory/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rest),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/inventory?employeeId=${employee.id}`] });
      toast({
        title: "Başarılı",
        description: "Zimmetli eşya güncellendi",
      });
      setSelectedItem(null);
      setIsOpen(false);
      form.reset();
      window.location.reload();
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
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/inventory/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/inventory?employeeId=${employee.id}`] });
      toast({
        title: "Başarılı",
        description: "Zimmetli eşya silindi",
      });
      setShowDeleteDialog(false);
      setSelectedItem(null);
      window.location.reload();
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    if (selectedItem) {
      updateMutation.mutate({ ...data, id: selectedItem.id });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Zimmetli Eşyalar</h3>
        <Button
          onClick={() => {
            setSelectedItem(null);
            form.reset();
            setIsOpen(true);
          }}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          Yeni Ekle
        </Button>
      </div>

      <ScrollArea className="h-[300px] pr-4">
        <div className="space-y-4">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-24 bg-gray-100 rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : items?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Zimmetli eşya bulunmamaktadır
            </div>
          ) : (
            items?.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-lg border-2 border-gray-300 space-y-2 relative group bg-gradient-to-br from-white via-gray-50 to-white shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">{item.name}</h4>
                    {item.notes && (
                      <p className="text-sm text-muted-foreground mt-1">{item.notes}</p>
                    )}
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedItem(item);
                        form.reset({
                          name: item.name,
                          notes: item.notes || "",
                          assignedTo: item.assignedTo,
                        });
                        setIsOpen(true);
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedItem(item);
                        setShowDeleteDialog(true);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {format(new Date(item.assignedAt!), "d MMMM yyyy", {
                    locale: tr,
                  })}
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-300 to-purple-300" />
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedItem ? "Zimmetli Eşya Düzenle" : "Yeni Zimmetli Eşya"}
            </DialogTitle>
            <DialogDescription>
              {selectedItem
                ? "Zimmetli eşya bilgilerini güncelleyin"
                : "Yeni bir zimmetli eşya ekleyin"}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Eşya Adı</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Not</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                >
                  İptal
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {selectedItem ? "Güncelleniyor..." : "Kaydediliyor..."}
                    </div>
                  ) : selectedItem ? (
                    "Güncelle"
                  ) : (
                    "Kaydet"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Zimmetli Eşyayı Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu zimmetli eşyayı silmek istediğinize emin misiniz?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedItem) {
                  deleteMutation.mutate(selectedItem.id);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? "Siliniyor..." : "Evet, Sil"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}