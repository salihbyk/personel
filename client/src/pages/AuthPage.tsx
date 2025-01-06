import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { UserCircle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const loginSchema = z.object({
  password: z.string().min(1, "Şifre gerekli"),
});

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [error, setError] = useState("");
  const queryClient = useQueryClient();

  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: z.infer<typeof loginSchema>) => {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, username: "admin" }), // Backend için sabit username
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
        description: "Giriş yapıldı",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setLocation("/");
    },
    onError: (error: Error) => {
      setError(error.message);
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div 
      className="min-h-screen w-full flex items-center justify-center relative"
      style={{
        backgroundImage: "url('https://www.europatrans.com.tr/wp-content/uploads/2024/03/IMG_2969-1024x683.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Overlay with blur effect */}
      <div className="absolute inset-0 backdrop-blur-sm bg-black/30" />

      <div className="w-full max-w-md p-8 mx-4 relative z-10">
        <div className="backdrop-blur-xl bg-black/40 rounded-2xl p-8 shadow-2xl border border-white/10">
          <div className="flex flex-col items-center mb-8">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-4 shadow-xl">
              <UserCircle className="w-16 h-16 text-white" />
            </div>
            <h2 className="text-2xl font-semibold text-white mb-1">Europatrans</h2>
            <p className="text-blue-200">Personel Takip Sistemi</p>
          </div>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) => loginMutation.mutate(data))}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder="Şifre"
                        className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:bg-white/20"
                      />
                    </FormControl>
                    <FormMessage className="text-red-300" />
                  </FormItem>
                )}
              />

              {error && (
                <p className="text-sm text-red-300 text-center">{error}</p>
              )}

              <Button
                type="submit"
                disabled={loginMutation.isPending}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white transition-all transform hover:scale-105 disabled:opacity-50"
              >
                {loginMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Giriş yapılıyor...
                  </div>
                ) : (
                  "Giriş Yap"
                )}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}