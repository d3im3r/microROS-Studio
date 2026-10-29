"use client";
import { useRouter } from "next/navigation";
import { AuthScreen } from "@/features/auth";

export default function LoginPage() {
  const router = useRouter();
  return <AuthScreen onAuthenticated={() => router.push("/")} />;
}
