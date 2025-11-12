"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Scissors, AlertTriangle } from "lucide-react";

export function SlicingSection() {
  return (
    <div className="space-y-6">
      {/* Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Scissors className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Slicing Process</CardTitle>
          </div>
          <CardDescription>
            How 3D models are processed to extract print metrics for pricing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Slicing is the process of converting a 3D model (STL/3MF file) into machine
            instructions (G-code) while calculating critical metrics like material usage and
            print time. This data feeds directly into our pricing calculations.
          </p>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Key Principle:</strong> We use PrusaSlicer, an industry-standard slicing
              tool, to analyze uploaded models. The slicer provides accurate estimates based on
              the actual model geometry and selected print settings.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* What is Slicing */}
      <Card>
        <CardHeader>
          <CardTitle>What is Slicing?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              When a client uploads a 3D model for QuickPrint, the file needs to be
              &quot;sliced&quot; before we can price it accurately. Slicing converts the 3D model into
              layers and calculates:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-lg border">
                <p className="font-semibold mb-1">Material Weight</p>
                <p className="text-xs text-muted-foreground">
                  The amount of filament required to print the model, measured in grams.
                  This determines the material cost.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border">
                <p className="font-semibold mb-1">Print Time</p>
                <p className="text-xs text-muted-foreground">
                  The estimated duration to complete the print, measured in seconds.
                  This determines the time cost.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PrusaSlicer Integration */}
      <Card>
        <CardHeader>
          <CardTitle>PrusaSlicer Integration</CardTitle>
          <CardDescription>
            Technical implementation details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2 text-sm">How It Works</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>
                Client uploads STL/3MF file and selects print settings (material, layer height,
                infill, supports)
              </li>
              <li>
                File is saved temporarily on the server
              </li>
              <li>
                System spawns PrusaSlicer command-line interface (CLI) process
              </li>
              <li>
                PrusaSlicer generates G-code with the specified settings
              </li>
              <li>
                System parses the G-code to extract material weight (grams) and print time (seconds)
              </li>
              <li>
                Metrics are returned to the pricing calculator
              </li>
              <li>
                G-code file is optionally saved for future reference
              </li>
            </ol>
          </div>

          <Separator />

          <div className="bg-slate-50 p-4 rounded-lg border space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">COMMAND STRUCTURE</p>
            <div className="font-mono text-xs space-y-1 break-all">
              <p>prusa-slicer-console</p>
              <p className="ml-4">--export-gcode</p>
              <p className="ml-4">--layer-height 0.2</p>
              <p className="ml-4">--fill-density 20</p>
              <p className="ml-4">--support-material (if enabled)</p>
              <p className="ml-4">--support-material-style organic (for tree supports)</p>
              <p className="ml-4">--output /path/to/output.gcode</p>
              <p className="ml-4">/path/to/input.stl</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Print Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Print Settings Parameters</CardTitle>
          <CardDescription>
            Configurable options that affect slicing output
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-white rounded-lg border">
                <Badge className="mb-2">Layer Height</Badge>
                <p className="text-sm font-semibold mb-1">0.1mm - 0.3mm</p>
                <p className="text-xs text-muted-foreground">
                  Thickness of each printed layer. Lower values = higher quality but longer
                  print time. Common: 0.2mm.
                </p>
              </div>

              <div className="p-4 bg-white rounded-lg border">
                <Badge className="mb-2">Infill Percentage</Badge>
                <p className="text-sm font-semibold mb-1">0% - 100%</p>
                <p className="text-xs text-muted-foreground">
                  Density of internal structure. Higher values = stronger but more material
                  and time. Common: 15-20%.
                </p>
              </div>

              <div className="p-4 bg-white rounded-lg border">
                <Badge className="mb-2">Support Material</Badge>
                <p className="text-sm font-semibold mb-1">On / Off</p>
                <p className="text-xs text-muted-foreground">
                  Adds temporary structures to support overhangs during printing. Increases
                  material usage and print time.
                </p>
              </div>

              <div className="p-4 bg-white rounded-lg border">
                <Badge className="mb-2">Support Pattern</Badge>
                <p className="text-sm font-semibold mb-1">Normal / Tree (Organic)</p>
                <p className="text-xs text-muted-foreground">
                  Tree supports use less material and are easier to remove. Normal supports
                  provide stronger scaffolding.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Retry Logic */}
      <Card>
        <CardHeader>
          <CardTitle>Retry & Timeout Logic</CardTitle>
          <CardDescription>
            Reliability features to handle slicing failures
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2 text-sm">Configuration</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 bg-white rounded-lg border">
                <p className="text-xs text-muted-foreground">Timeout</p>
                <p className="text-lg font-bold">120 seconds</p>
                <p className="text-xs text-muted-foreground mt-1">Default (configurable)</p>
              </div>

              <div className="p-3 bg-white rounded-lg border">
                <p className="text-xs text-muted-foreground">Max Retries</p>
                <p className="text-lg font-bold">2 attempts</p>
                <p className="text-xs text-muted-foreground mt-1">Including initial try</p>
              </div>

              <div className="p-3 bg-white rounded-lg border">
                <p className="text-xs text-muted-foreground">Concurrency</p>
                <p className="text-lg font-bold">1-4 jobs</p>
                <p className="text-xs text-muted-foreground mt-1">Simultaneous slicing processes</p>
              </div>
            </div>
          </div>

          <Separator />

          <div className="bg-slate-50 p-4 rounded-lg border space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">RETRY ALGORITHM</p>
            <div className="text-xs space-y-1 text-muted-foreground">
              <p>1. Attempt slicing with PrusaSlicer</p>
              <p>2. IF timeout or process error:</p>
              <p className="ml-4">   Retry once (max 2 total attempts)</p>
              <p>3. IF all attempts fail:</p>
              <p className="ml-4">   Use fallback metrics</p>
              <p className="ml-4">   Mark as &quot;fallback&quot; for client approval</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fallback Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Fallback Metrics</CardTitle>
          <CardDescription>
            Default values used when slicing fails
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> When slicing fails, the system uses conservative
              fallback estimates. The client must explicitly approve these estimates before
              checkout.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <Badge variant="outline" className="mb-2">Fallback Material</Badge>
              <p className="text-2xl font-bold">80 grams</p>
              <p className="text-xs text-muted-foreground mt-1">
                Conservative estimate for average small-to-medium print
              </p>
            </div>

            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <Badge variant="outline" className="mb-2">Fallback Time</Badge>
              <p className="text-2xl font-bold">3600 seconds</p>
              <p className="text-xs text-muted-foreground mt-1">
                1 hour - typical duration for many prints
              </p>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg border space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">FALLBACK LOGIC</p>
            <div className="font-mono text-xs space-y-1">
              <p>IF slicing_failed:</p>
              <p className="ml-4">metrics.grams = 80</p>
              <p className="ml-4">metrics.timeSec = 3600</p>
              <p className="ml-4">metrics.fallback = true</p>
              <p className="ml-4">require_client_approval = true</p>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            <p className="font-semibold text-foreground mb-2">Client Approval Process:</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>System displays warning that slicing failed</li>
              <li>Shows fallback metrics being used for pricing</li>
              <li>Client must click &quot;Accept Estimate&quot; to proceed</li>
              <li>Without approval, client cannot complete checkout</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Extraction */}
      <Card>
        <CardHeader>
          <CardTitle>G-code Metrics Extraction</CardTitle>
          <CardDescription>
            How data is parsed from the generated G-code
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2 text-sm">Parsing Strategy</h4>
            <p className="text-sm text-muted-foreground mb-4">
              The G-code file produced by PrusaSlicer contains metadata comments with the exact
              metrics we need. The system searches for specific comment patterns:
            </p>

            <div className="space-y-3">
              <div className="bg-slate-50 p-3 rounded-lg border">
                <p className="text-xs font-semibold text-muted-foreground mb-1">FILAMENT WEIGHT</p>
                <code className="text-xs font-mono">; filament used [g] = 45.23</code>
                <p className="text-xs text-muted-foreground mt-2">
                  Extracted value: 45.23 grams
                </p>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border">
                <p className="text-xs font-semibold text-muted-foreground mb-1">PRINT TIME</p>
                <code className="text-xs font-mono">; estimated printing time (normal mode) = 2h 15m 30s</code>
                <p className="text-xs text-muted-foreground mt-2">
                  Converted to: 8130 seconds
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div className="text-sm">
            <p className="font-semibold mb-2">Extraction Process:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground ml-2">
              <li>Read generated G-code file line by line</li>
              <li>Search for comment lines starting with &quot;;&quot;</li>
              <li>Match patterns for filament weight and print time</li>
              <li>Parse numeric values and convert units</li>
              <li>Return structured metrics object</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Environment Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Environment Configuration</CardTitle>
          <CardDescription>
            System variables that control slicer behavior
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="p-3 bg-slate-50 rounded-lg border">
              <code className="text-xs font-mono">SLICER_BIN</code>
              <p className="text-xs text-muted-foreground mt-1">
                Path to PrusaSlicer executable. Must be installed on the server.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border">
              <code className="text-xs font-mono">SLICER_TIMEOUT_MS</code>
              <p className="text-xs text-muted-foreground mt-1">
                Maximum time (in milliseconds) to wait for slicing. Default: 120000 (2 minutes).
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border">
              <code className="text-xs font-mono">SLICER_CONCURRENCY</code>
              <p className="text-xs text-muted-foreground mt-1">
                Number of simultaneous slicing processes allowed. Default: 2. Range: 1-4.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border">
              <code className="text-xs font-mono">SLICER_DISABLE</code>
              <p className="text-xs text-muted-foreground mt-1">
                If set to &quot;true&quot;, skips slicing and always uses fallback metrics (for testing).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Important Rules */}
      <Card>
        <CardHeader>
          <CardTitle>Important Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex gap-2">
              <Badge variant="outline" className="shrink-0">Rule</Badge>
              <span className="text-muted-foreground">
                Slicing is performed server-side for security and performance
              </span>
            </li>
            <li className="flex gap-2">
              <Badge variant="outline" className="shrink-0">Rule</Badge>
              <span className="text-muted-foreground">
                Each file is sliced individually with its own settings
              </span>
            </li>
            <li className="flex gap-2">
              <Badge variant="outline" className="shrink-0">Rule</Badge>
              <span className="text-muted-foreground">
                Slicing happens before pricing - metrics drive the price calculation
              </span>
            </li>
            <li className="flex gap-2">
              <Badge variant="outline" className="shrink-0">Rule</Badge>
              <span className="text-muted-foreground">
                Timeout prevents system hang from complex models
              </span>
            </li>
            <li className="flex gap-2">
              <Badge variant="outline" className="shrink-0">Rule</Badge>
              <span className="text-muted-foreground">
                Concurrency limits prevent server overload during high traffic
              </span>
            </li>
            <li className="flex gap-2">
              <Badge variant="outline" className="shrink-0">Rule</Badge>
              <span className="text-muted-foreground">
                Fallback metrics require explicit client approval before checkout
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
