import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { UserRound, Search, Plus, Banknote } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import type { Employee } from "@db/schema";

interface LayoutProps {
  children: React.ReactNode;
  employees: Employee[];
  isLoading?: boolean;
}

export function Layout({ children, employees, isLoading }: LayoutProps) {
  const [location, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredEmployees = employees.filter((employee) =>
    `${employee.firstName} ${employee.lastName}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Global Search Bar */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-white shadow-sm z-50 flex items-center px-4">
        <div className="max-w-5xl mx-auto w-full flex items-center gap-6">
          <Link href="/" className="flex-shrink-0 -ml-2 transition-transform hover:scale-105">
            <img
              src="https://www.europatrans.com.tr/sitelogo.png.webp"
              alt="Logo"
              className="h-8 w-auto"
            />
          </Link>
          <div className="relative flex-1 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 transition-colors group-focus-within:text-blue-500" />
            <Input
              placeholder="Tüm sistemde ara..."
              className="pl-10 bg-gray-50 border-gray-200 transition-all focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <Link href="/employee/new">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2 transition-all hover:shadow-lg hover:-translate-y-0.5">
              <Plus className="h-4 w-4" />
              Yeni Personel
            </Button>
          </Link>
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-72 bg-white border-r border-gray-200 pt-16 transition-all">
        <div className="p-4">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 transition-colors group-focus-within:text-blue-500" />
            <Input
              placeholder="Personel ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-50 border-gray-200 transition-all focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>
        <ScrollArea className="h-[calc(100vh-8rem)]">
          <div className="p-2">
            {isLoading ? (
              <div className="flex items-center justify-center h-20">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
              </div>
            ) : (
              <div className="space-y-1">
                {filteredEmployees.map((employee) => (
                  <Link key={employee.id} href={`/employee/${employee.id}`}>
                    <Button
                      variant={location === `/employee/${employee.id}` ? "secondary" : "ghost"}
                      className="w-full justify-start gap-2 text-gray-700 h-auto py-3 transition-all hover:bg-gray-100 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <UserRound className="h-4 w-4 flex-shrink-0" />
                      <div className="flex-1 text-left">
                        <div className="font-medium">
                          {employee.firstName} {employee.lastName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {employee.position}
                        </div>
                      </div>
                      <div className="flex flex-col items-end text-xs">
                        <Banknote className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-500">
                          {new Intl.NumberFormat('tr-TR', { 
                            style: 'currency', 
                            currency: 'TRY' 
                          }).format(Number(employee.salary))}
                        </span>
                      </div>
                    </Button>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-gray-50 pt-16">
        <div className="animate-fadeIn"> {children} </div>
      </main>
    </div>
  );
}