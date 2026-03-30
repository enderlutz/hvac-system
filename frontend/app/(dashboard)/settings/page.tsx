"use client";

import { useState } from "react";
import { Settings, Construction, HelpCircle, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { resetTutorial } from "@/components/dashboard/tutorial-overlay";

export default function SettingsPage() {
  const [restarted, setRestarted] = useState(false);

  const handleRestartTutorial = () => {
    resetTutorial();
    setRestarted(true);
    setTimeout(() => setRestarted(false), 3000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Company, pricing, and system configuration</p>
      </div>

      {/* Tutorial restart */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <HelpCircle className="h-5 w-5 text-green-700" />
              </div>
              <div>
                <div className="font-semibold text-sm">Dashboard Tutorial</div>
                <div className="text-xs text-muted-foreground">
                  Re-watch the guided tour of the dashboard and all its features
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 shrink-0"
              onClick={handleRestartTutorial}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {restarted ? "Reload the page to start" : "Restart Tutorial"}
            </Button>
          </div>
        </CardContent>
      </Card>

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
