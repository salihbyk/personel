import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { UserRound } from "lucide-react";
import type { Employee } from "@db/schema";

interface LayoutProps {
  children: React.ReactNode;
  employees: Employee[];
  isLoading?: boolean;
}

export function Layout({ children, employees, isLoading }: LayoutProps) {
  const [location] = useLocation();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 border-r bg-card">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-lg">Personel Listesi</h2>
        </div>
        <ScrollArea className="h-[calc(100vh-5rem)]">
          <div className="p-2">
            {isLoading ? (
              <div className="flex items-center justify-center h-20">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : (
              <div className="space-y-1">
                {employees.map((employee) => (
                  <Link key={employee.id} href={`/employee/${employee.id}`}>
                    <Button
                      variant={location === `/employee/${employee.id}` ? "secondary" : "ghost"}
                      className="w-full justify-start"
                    >
                      <UserRound className="mr-2 h-4 w-4" />
                      {employee.firstName} {employee.lastName}
                    </Button>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
