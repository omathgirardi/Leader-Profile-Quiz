import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-28 w-full rounded-xl border border-input bg-background/45 px-4 py-3 text-base shadow-sm transition-all placeholder:text-muted-foreground/55 hover:border-border focus-visible:border-gold/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/10 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
