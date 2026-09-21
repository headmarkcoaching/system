"use client";

import * as React from "react";
import { toast } from "sonner";
import { Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { markNotesShippedAction } from "./actions";

export function ShipButton({ paymentId }: { paymentId: string }) {
  const [open, setOpen] = React.useState(false);
  const [tracking, setTracking] = React.useState("");
  const [pending, setPending] = React.useState(false);

  async function handleConfirm() {
    setPending(true);
    try {
      await markNotesShippedAction(paymentId, tracking || undefined);
      toast.success("Marked as shipped");
      setOpen(false);
    } catch {
      toast.error("Could not update.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Truck className="mr-1.5 h-3.5 w-3.5" /> Mark Shipped
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark this month's notes as shipped</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>Tracking / Courier Note (optional)</Label>
          <Input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="e.g. TCS tracking number" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={pending}>
            {pending ? "Saving…" : "Confirm Shipped"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
