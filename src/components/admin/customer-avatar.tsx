"use client";

import Image from "next/image";
import { useState } from "react";
import { UserRound } from "lucide-react";

export function CustomerAvatar({ avatarUrl }: { avatarUrl: string | null }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  return (
    <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-muted text-brand">
      {avatarUrl && avatarUrl !== failedUrl ? (
        <Image
          src={avatarUrl}
          alt=""
          width={40}
          height={40}
          className="size-10 object-cover"
          referrerPolicy="no-referrer"
          onError={() => setFailedUrl(avatarUrl)}
        />
      ) : (
        <UserRound aria-hidden="true" size={17} />
      )}
    </span>
  );
}
