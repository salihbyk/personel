import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import Dashboard from "./pages/Dashboard";
import EmployeeDetail from "./pages/EmployeeDetail";
import EmployeeForm from "./pages/EmployeeForm";
import AuthPage from "./pages/AuthPage";
import { useQuery } from "@tanstack/react-query";

function AppContent() {
  const { data: user, isLoading, error } = useQuery<{ id: number; username: string } | null>({
    queryKey: ["/api/user"],
    retry: false,
    // Production'da auth bypass
    enabled: process.env.NODE_ENV !== 'production',
    initialData: process.env.NODE_ENV === 'production' ? { id: 1, username: 'admin' } : null
  });

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-red-600 mb-2">Bağlantı Hatası</h1>
          <p className="text-gray-600">Lütfen internet bağlantınızı kontrol edin ve sayfayı yenileyin.</p>
        </div>
      </div>
    );
  }

  if (!user && process.env.NODE_ENV !== 'production') {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/employee/new" component={EmployeeForm} />
        <Route path="/employee/:id" component={EmployeeDetail} />
        <Route path="/employee/:id/edit" component={EmployeeForm} />
      </Switch>
      <Toaster />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;