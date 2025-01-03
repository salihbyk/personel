import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WeeklyCalendar } from "@/components/WeeklyCalendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Employee } from "@db/schema";

export default function Dashboard() {
  const { data: employees, isLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <Layout employees={employees || []} isLoading={isLoading}>
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Personel İzin Takip Sistemi</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-12rem)]">
              <div className="space-y-8">
                {employees?.map((employee) => (
                  <Card key={employee.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        {employee.firstName} {employee.lastName}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <WeeklyCalendar employee={employee} />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}