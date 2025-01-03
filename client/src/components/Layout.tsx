import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { UserRound, Search, Plus, Banknote } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useMemo } from "react";
import type { Employee } from "@db/schema";

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

  // Highlight matching text
  const highlightMatch = (text: string, searchTerm: string) => {
    if (!searchTerm) return text;
    const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === searchTerm.toLowerCase() ?
        <span key={i} className="bg-yellow-200 text-gray-900">{part}</span> : part
    );
  };

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

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Global Search Bar */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-white shadow-lg z-50 flex items-center px-4 bg-gradient-to-r from-blue-50 to-white">
        <div className="max-w-5xl mx-auto w-full flex items-center gap-6">
          <Link href="/" className="flex-shrink-0 -ml-2 transition-transform hover:scale-105">
            <img
              src="https://www.europatrans.com.tr/sitelogo.png.webp"
              alt="Logo"
              className="h-8 w-auto"
            />
          </Link>
          <div className="relative flex-1 group global-search">
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
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 max-h-96 overflow-auto backdrop-blur-sm bg-white/80">
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
            <Button className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white gap-2 transition-all hover:shadow-lg hover:-translate-y-0.5">
              <Plus className="h-4 w-4" />
              Yeni Personel
            </Button>
          </Link>
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-72 bg-gradient-to-b from-white to-gray-50 border-r border-gray-200 pt-16 transition-all shadow-lg">
        <div className="p-4">
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
        <ScrollArea className="h-[calc(100vh-8rem)]">
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
                        "w-full justify-start gap-2 text-gray-700 h-auto py-3 transition-all hover:bg-blue-50/50",
                        "hover:scale-[1.02] active:scale-[0.98] shadow-sm",
                        location === `/employee/${employee.id}` && "bg-blue-50 text-blue-700",
                        debouncedSidebarTerm && "relative overflow-visible"
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
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-gray-50 pt-16">
        <div className="animate-fadeIn">
          {children}
        </div>
      </main>
    </div>
  );
}