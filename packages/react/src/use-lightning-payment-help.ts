import { useCallback, useState } from "react";

export interface UseLightningPaymentHelpOptions {
  readonly defaultOpen?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
}

export interface LightningPaymentHelpController {
  readonly isOpen: boolean;
  readonly open: () => void;
  readonly close: () => void;
  readonly setOpen: (open: boolean) => void;
}

export function useLightningPaymentHelp(
  options: UseLightningPaymentHelpOptions = {}
): LightningPaymentHelpController {
  const { defaultOpen = false, onOpenChange } = options;
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const setOpen = useCallback(
    (open: boolean) => {
      setIsOpen(open);
      onOpenChange?.(open);
    },
    [onOpenChange]
  );
  const open = useCallback(() => setOpen(true), [setOpen]);
  const close = useCallback(() => setOpen(false), [setOpen]);
  return { isOpen, open, close, setOpen };
}
