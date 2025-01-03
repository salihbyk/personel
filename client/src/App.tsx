import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import Dashboard from "./pages/Dashboard";
import EmployeeForm from "./pages/EmployeeForm";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/employee/new" component={EmployeeForm} />
          <Route path="/employee/:id" component={EmployeeForm} />
        </Switch>
        <Toaster />
      </div>
    </QueryClientProvider>
  );
}

export default App;
