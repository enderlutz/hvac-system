"use client";

import { Settings, Construction } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Company, pricing, and system configuration</p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <Construction className="h-12 w-12 text-muted-foreground" />
          <div>
            <h3 className="font-semibold text-lg">Coming in Phase 5</h3>
            <p className="text-muted-foreground text-sm mt-1 max-w-md">
              Settings will include company branding, tier strategy config (brand-based vs.
              efficiency-based), technician management, and deployment options.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center mt-2">
            {["Company Branding", "Tier Strategy", "Technician Roster", "Pricing Config", "SEER2 Region"].map(
              (label) => (
                <Badge key={label} variant="outline">{label}</Badge>
              )
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
