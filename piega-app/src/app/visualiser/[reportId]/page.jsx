"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function LegacyRedirect() {
  const { reportId } = useParams();
  const router = useRouter();
  useEffect(() => { router.replace("/agents/visualiser/" + reportId); }, [reportId, router]);
  return null;
}
