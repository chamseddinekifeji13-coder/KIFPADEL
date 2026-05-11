"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type FindPlayersErrorProps = {
  reset: () => void;
};

export default function FindPlayersError({ reset }: FindPlayersErrorProps) {
  return (
    <Card className="space-y-3 bg-amber-50 ring-amber-100">
      <h1 className="text-lg font-semibold text-amber-900">Je cherche des joueurs</h1>
      <p className="text-sm text-amber-800">
        Un incident temporaire est survenu. Tu peux réessayer maintenant.
      </p>
      <Button variant="secondary" className="w-full" onClick={reset}>
        Réessayer
      </Button>
    </Card>
  );
}
