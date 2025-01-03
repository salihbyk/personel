import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { 
  UserRound, 
  Search, 
  Plus, 
  Banknote, 
  Menu, 
  X, 
  LogOut,
  ChevronLeft
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import type { Employee } from "@db/schema";
import { useToast } from "@/hooks/use-toast";

interface LayoutProps {
  children: React.ReactNode;
  employees: Employee[];
  isLoading?: boolean;
}

export function Layout({ children, employees, isLoading }: LayoutProps) {
  const [location, setLocation] = useLocation();
  const [sidebarSearchTerm, setSidebarSearchTerm] = useState("");
  const [globalSearchTerm, setGlobalSearchTerm] = useState("");
  const [showGlobalResults, setShowGlobalResults] = useState(false);
  const [debouncedSidebarTerm, setDebouncedSidebarTerm] = useState("");
  const [debouncedGlobalTerm, setDebouncedGlobalTerm] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { toast } = useToast();

  // Debounce sidebar search term
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSidebarTerm(sidebarSearchTerm), 300);
    return () => clearTimeout(timer);
  }, [sidebarSearchTerm]);

  // Debounce global search term
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedGlobalTerm(globalSearchTerm), 300);
    return () => clearTimeout(timer);
  }, [globalSearchTerm]);

  const filterEmployees = (searchTerm: string) => {
    if (!searchTerm) return employees;
    const searchLower = searchTerm.toLowerCase();
    return employees.filter((employee) =>
      `${employee.firstName} ${employee.lastName} ${employee.position} ${employee.department || ''}`
        .toLowerCase()
        .includes(searchLower)
    );
  };

  const filteredSidebarEmployees = useMemo(
    () => filterEmployees(debouncedSidebarTerm),
    [employees, debouncedSidebarTerm]
  );

  const filteredGlobalEmployees = useMemo(
    () => filterEmployees(debouncedGlobalTerm),
    [employees, debouncedGlobalTerm]
  );

  const highlightMatch = (text: string, searchTerm: string) => {
    if (!searchTerm) return text;
    const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === searchTerm.toLowerCase() ?
        <span key={i} className="bg-yellow-200 text-gray-900">{part}</span> : part
    );
  };

  // Çıkış yapma mutasyonu
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Çıkış yapıldı",
      });
      window.location.reload();
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Click outside handler for global search
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.global-search')) {
        setShowGlobalResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close sidebar on mobile when route changes
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 w-72 bg-gradient-to-b from-white to-gray-50 border-r border-gray-200 pt-16",
          "transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:static z-50",
          "shadow-xl lg:shadow-none",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full",
          "flex flex-col h-full" 
        )}
      >
        <div className="p-4 flex-shrink-0">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 transition-colors group-focus-within:text-blue-500" />
            <Input
              placeholder="Personel ara..."
              value={sidebarSearchTerm}
              onChange={(e) => setSidebarSearchTerm(e.target.value)}
              className="pl-10 bg-white border-gray-200 transition-all focus:ring-2 focus:ring-blue-500/20 shadow-sm hover:border-gray-300"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2">
            {isLoading ? (
              <div className="space-y-2 p-4">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="h-16 bg-gray-100 rounded-lg animate-pulse"
                  />
                ))}
              </div>
            ) : filteredSidebarEmployees.length === 0 ? (
              <div className="text-center p-4 text-gray-500">
                Sonuç bulunamadı
              </div>
            ) : (
              <div className="space-y-1">
                {filteredSidebarEmployees.map((employee) => (
                  <Link key={employee.id} href={`/employee/${employee.id}`}>
                    <Button
                      variant={location === `/employee/${employee.id}` ? "secondary" : "ghost"}
                      className={cn(
                        "w-full justify-start gap-2 text-gray-700 h-auto py-3",
                        "transition-all hover:bg-blue-50/50 active:scale-[0.98]",
                        "hover:scale-[1.02] shadow-sm",
                        location === `/employee/${employee.id}` && "bg-blue-50 text-blue-700"
                      )}
                    >
                      <UserRound className="h-4 w-4 flex-shrink-0" />
                      <div className="flex-1 text-left">
                        <div className="font-medium">
                          {highlightMatch(`${employee.firstName} ${employee.lastName}`, debouncedSidebarTerm)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {highlightMatch(employee.position || '', debouncedSidebarTerm)}
                        </div>
                      </div>
                      <div className="flex flex-col items-end text-xs">
                        <Banknote className="h-4 w-4 text-blue-500/70" />
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

        {/* Çıkış yap butonu */}
        <div className="p-4 border-t border-gray-200 bg-white flex-shrink-0">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
          >
            <LogOut className="h-4 w-4" />
            {logoutMutation.isPending ? "Çıkış yapılıyor..." : "Çıkış Yap"}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Navigation */}
        <header className="fixed top-0 right-0 left-0 h-16 bg-white shadow-lg z-40 lg:left-72">
          <div className="h-full px-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              >
                {isSidebarOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>

              {/* Back button on mobile */}
              {location !== "/" && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  onClick={() => setLocation("/")}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              )}

              <Link href="/" className="flex-shrink-0 transition-transform hover:scale-105">
                <img
                  src="https://www.europatrans.com.tr/sitelogo.png.webp"
                  alt="Logo"
                  className="h-8 w-auto"
                />
              </Link>
            </div>

            <div className="flex-1 max-w-xl relative group global-search hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 transition-colors group-focus-within:text-blue-500" />
              <Input
                placeholder="Tüm sistemde ara..."
                value={globalSearchTerm}
                onChange={(e) => {
                  setGlobalSearchTerm(e.target.value);
                  setShowGlobalResults(true);
                }}
                onFocus={() => setShowGlobalResults(true)}
                className="pl-10 bg-white border-gray-200 transition-all focus:ring-2 focus:ring-blue-500/20 shadow-sm hover:border-gray-300"
              />
              {showGlobalResults && globalSearchTerm && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white/80 rounded-lg shadow-xl border border-gray-200 max-h-96 overflow-auto backdrop-blur-sm">
                  {filteredGlobalEmployees.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      Sonuç bulunamadı
                    </div>
                  ) : (
                    <div className="p-2">
                      {filteredGlobalEmployees.map((employee) => (
                        <Link key={employee.id} href={`/employee/${employee.id}`}>
                          <Button
                            variant="ghost"
                            className="w-full justify-start gap-2 text-gray-700 h-auto py-3 transition-all hover:bg-blue-50/50"
                            onClick={() => {
                              setShowGlobalResults(false);
                              setGlobalSearchTerm("");
                            }}
                          >
                            <UserRound className="h-4 w-4 flex-shrink-0" />
                            <div className="flex-1 text-left">
                              <div className="font-medium">
                                {highlightMatch(`${employee.firstName} ${employee.lastName}`, debouncedGlobalTerm)}
                              </div>
                              <div className="text-xs text-gray-500">
                                {highlightMatch(employee.position || '', debouncedGlobalTerm)}
                              </div>
                            </div>
                            <div className="flex flex-col items-end text-xs">
                              <Banknote className="h-4 w-4 text-blue-500/70" />
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
              )}
            </div>

            <Link href="/employee/new">
              <Button 
                className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white gap-2 transition-all hover:shadow-lg hover:-translate-y-0.5 whitespace-nowrap"
                size="sm"
              >
                <Plus className="h-4 w-4 sm:hidden" />
                <span className="hidden sm:inline">Yeni Personel</span>
              </Button>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto pt-16">
          <div className="animate-fadeIn">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}