"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ExamRedirectClient() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/exam");
  }, [router]);
  return null;
}
