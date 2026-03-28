"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

// Redirect old URL to /agents/classifier/:id
export default function LegacyRedirect() {
  const { id } = useParams();
  const router = useRouter();
  useEffect(() => { router.replace("/agents/classifier/" + id); }, [id, router]);
  return null;
}
