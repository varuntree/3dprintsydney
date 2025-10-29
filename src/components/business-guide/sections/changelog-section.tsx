"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Calendar } from "lucide-react";

export function ChangelogSection() {
  return (
    <div className="space-y-6">
      {/* Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Business Logic Changelog</CardTitle>
          </div>
          <CardDescription>
            Historical record of changes to pricing, calculations, and business rules
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Track modifications to formulas, settings, and workflows. When changing business logic,
            add an entry below with what changed, why, and the impact.
          </p>
        </CardContent>
      </Card>


      {/* Changelog Entries */}
      <Card>
        <CardHeader>
          <CardTitle>Change History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Entry 1 */}
            <div className="border-l-4 border-slate-300 pl-4 py-2">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <p className="font-mono text-sm font-bold">2025-10-29</p>
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Section:</p>
                  <Badge>Documentation</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Changed:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                    <li>Created comprehensive Business Guide section</li>
                    <li>Added interactive calculators for pricing, shipping, and discounts</li>
                    <li>Documented slicing process and workflow automation</li>
                    <li>Established changelog system for tracking future changes</li>
                  </ul>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Reason:</p>
                  <p className="text-muted-foreground">
                    Non-technical business owner needed clear documentation of how calculations
                    work under the hood without diving into code.
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Impact:</p>
                  <p className="text-muted-foreground">
                    Business owner and team can now understand pricing logic, verify calculations,
                    and train new staff without requiring developer assistance.
                  </p>
                </div>
              </div>
            </div>

            {/* Future entries will be added above this comment */}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
