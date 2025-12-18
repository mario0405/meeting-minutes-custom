"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MeetingDetailsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error("Meeting details route crashed:", error);
  }, [error]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center max-w-md px-6">
        <p className="text-red-600 font-medium mb-2">Meeting konnte nicht angezeigt werden</p>
        <p className="text-sm text-gray-600 mb-6 break-words">{error.message}</p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Erneut versuchen
          </button>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-gray-100 text-gray-800 rounded hover:bg-gray-200"
          >
            Zurück
          </button>
        </div>
      </div>
    </div>
  );
}

