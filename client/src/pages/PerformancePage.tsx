import { Layout } from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import type { Employee } from "@db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PerformancePage() {
  const { data: employees, isLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  return (
    <Layout employees={employees || []} isLoading={isLoading}>
      <div className="container mx-auto p-4 lg:p-6 max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-lg shadow-sm">
          <h1 className="text-2xl font-bold">Performans Değerlendirme</h1>
        </div>

        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Performans Değerlendirme Modülü</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">
              Bu modül yapım aşamasındadır.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
