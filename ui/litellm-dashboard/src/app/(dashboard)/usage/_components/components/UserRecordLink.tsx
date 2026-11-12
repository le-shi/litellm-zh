import { SquareArrowOutUpRight } from "lucide-react";
import Link from "next/link";

import { userRecordHref } from "../usageUrlState";

export default function UserRecordLink({ userId }: { userId: string }) {
  return (
    <Link
      href={userRecordHref(userId)}
      className="inline-flex shrink-0 items-center gap-1 text-sm text-primary underline underline-offset-2"
    >{"查看用户记录"}<SquareArrowOutUpRight className="size-3.5" />
    </Link>
  );
}
