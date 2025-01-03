import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Employee } from "@db/schema";

export default function Dashboard() {
  const { data: employees, isLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  return (
    <Layout employees={employees || []} isLoading={isLoading}>
      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle>Personel Yönetim Sistemi</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Soldaki menüden bir personel seçerek izin işlemlerini yönetebilirsiniz.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}