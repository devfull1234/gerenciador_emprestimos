"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const isAuthenticated = true; 

    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [router]);

  return <h1>Home Page</h1>;
}
