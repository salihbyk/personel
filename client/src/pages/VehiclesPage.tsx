import { useQuery, useMutation } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { Car, Pencil, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import type { Vehicle } from "@db/schema";
import { insertVehicleSchema } from "@db/schema";
import type { z } from "zod";
import { queryClient, API_BASE_URL } from "@/lib/queryClient";

type VehicleFormData = z.infer<typeof insertVehicleSchema>;

export default function VehiclesPage() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const { toast } = useToast();

  const { data: vehicles, isLoading } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });

  const form = useForm<VehicleFormData>({
    resolver: zodResolver(insertVehicleSchema),
    defaultValues: {
      name: "",
      plate: "",
      mileage: "0",
      inspectionDate: new Date().toISOString().split("T")[0],
      notes: "",
    },
  });

  const addMutation = useMutation({
    mutationFn: async (data: VehicleFormData) => {
      const response = await fetch(`${API_BASE_URL}/api/vehicles`, {
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
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      setShowAddDialog(false);
      form.reset();
      toast({
        title: "Başarılı",
        description: "Araç başarıyla eklendi",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: VehicleFormData & { id: number }) => {
      const response = await fetch(`${API_BASE_URL}/api/vehicles/${data.id}`, {
        method: "PUT",
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
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      setShowAddDialog(false);
      setSelectedVehicle(null);
      form.reset();
      toast({
        title: "Başarılı",
        description: "Araç başarıyla güncellendi",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`${API_BASE_URL}/api/vehicles/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      setShowDeleteDialog(false);
      setSelectedVehicle(null);
      toast({
        title: "Başarılı",
        description: "Araç başarıyla silindi",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: VehicleFormData) => {
    if (selectedVehicle) {
      updateMutation.mutate({ ...data, id: selectedVehicle.id });
    } else {
      addMutation.mutate(data);
    }
  };

  return (
    <Layout employees={[]} isLoading={false}>
      <div className="container mx-auto p-4 lg:p-6 max-w-7xl space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
            Araç Takip
          </h1>
          <Button
            onClick={() => {
              form.reset();
              setSelectedVehicle(null);
              setShowAddDialog(true);
            }}
            className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white transition-all hover:shadow-lg hover:-translate-y-0.5"
          >
            <Plus className="h-4 w-4 mr-2" />
            Yeni Araç Ekle
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-48 bg-gray-100 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : vehicles?.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Henüz araç eklenmemiş</CardTitle>
              <CardDescription>
                Yeni araç eklemek için yukarıdaki butonu kullanabilirsiniz.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vehicles?.map((vehicle) => (
              <Card key={vehicle.id} className="group">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>{vehicle.name}</span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => {
                          setSelectedVehicle(vehicle);
                          form.reset({
                            name: vehicle.name,
                            plate: vehicle.plate,
                            mileage: vehicle.mileage.toString(),
                            inspectionDate: format(new Date(vehicle.inspectionDate), "yyyy-MM-dd"),
                            notes: vehicle.notes || "",
                          });
                          setShowAddDialog(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => {
                          setSelectedVehicle(vehicle);
                          setShowDeleteDialog(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardTitle>
                  <CardDescription>{vehicle.plate}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Kilometre</span>
                      <span className="font-medium">{Number(vehicle.mileage).toLocaleString('tr-TR')} km</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Muayene Tarihi</span>
                      <span className="font-medium">
                        {format(new Date(vehicle.inspectionDate), "d MMMM yyyy", { locale: tr })}
                      </span>
                    </div>
                    {vehicle.notes && (
                      <div className="mt-2">
                        <span className="text-sm text-gray-500">Not</span>
                        <p className="text-sm mt-1">{vehicle.notes}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedVehicle ? "Araç Düzenle" : "Yeni Araç Ekle"}
              </DialogTitle>
              <DialogDescription>
                Araç bilgilerini doldurun ve kaydet butonuna tıklayın.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Araç Adı</FormLabel>
                      <FormControl>
                        <Input placeholder="Örn: Fiat Doblo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="plate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plaka</FormLabel>
                      <FormControl>
                        <Input placeholder="Örn: 34ABC123" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="mileage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kilometre</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Örn: 50000"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="inspectionDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Muayene Tarihi</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
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
                        <Textarea 
                          placeholder="Araç hakkında notlar..."
                          className="resize-none"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddDialog(false)}
                  >
                    İptal
                  </Button>
                  <Button
                    type="submit"
                    disabled={addMutation.isPending || updateMutation.isPending}
                  >
                    {addMutation.isPending || updateMutation.isPending ? (
                      "Kaydediliyor..."
                    ) : (
                      "Kaydet"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Aracı Sil</AlertDialogTitle>
              <AlertDialogDescription>
                Bu aracı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>İptal</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (selectedVehicle) {
                    deleteMutation.mutate(selectedVehicle.id);
                  }
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleteMutation.isPending ? "Siliniyor..." : "Evet, Sil"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}