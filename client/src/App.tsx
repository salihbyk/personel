import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import Dashboard from "./pages/Dashboard";
import EmployeeDetail from "./pages/EmployeeDetail";
import EmployeeForm from "./pages/EmployeeForm";
import AuthPage from "./pages/AuthPage";

function App() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/user"],
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthPage />
        <Toaster />
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/employee/new" component={EmployeeForm} />
          <Route path="/employee/:id" component={EmployeeDetail} />
          <Route path="/employee/:id/edit" component={EmployeeForm} />
        </Switch>
        <Toaster />
      </div>
    </QueryClientProvider>
  );
}

export default App;