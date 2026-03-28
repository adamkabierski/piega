"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function LegacyRedirect() {
  const { reportId } = useParams();
  const router = useRouter();
  useEffect(() => { router.replace("/agents/cost-estimate/" + reportId); }, [reportId, router]);
  return null;
}
