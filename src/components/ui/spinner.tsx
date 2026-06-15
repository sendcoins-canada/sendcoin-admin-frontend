import { Refresh } from "iconsax-react";

import { cn } from "@/lib/utils";

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <Refresh
      role="status"
      aria-label="Loading"
      size="16"
      color="currentColor"
      className={cn("animate-spin", className)}
      {...props}
    />
  );
}

export { Spinner };
