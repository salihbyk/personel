import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import Dashboard from "./pages/Dashboard";
import EmployeeDetail from "./pages/EmployeeDetail";
import EmployeeForm from "./pages/EmployeeForm";
import AuthPage from "./pages/AuthPage";
import ReportingPage from "./pages/ReportingPage";
import PerformancePage from "./pages/PerformancePage";
import { useQuery } from "@tanstack/react-query";

function AppContent() {
  const { data: user, isLoading } = useQuery<{ id: number; username: string } | null>({
    queryKey: ["/api/user"],
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/employee/new" component={EmployeeForm} />
        <Route path="/employee/:id" component={EmployeeDetail} />
        <Route path="/employee/:id/edit" component={EmployeeForm} />
        <Route path="/reports" component={ReportingPage} />
        <Route path="/performance" component={PerformancePage} />
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