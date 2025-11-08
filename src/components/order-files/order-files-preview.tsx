"use client";

import { useMemo, useState } from "react";
import ModelViewerWrapper from "@/components/3d/ModelViewerWrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface OrientationData {
  quaternion: [number, number, number, number];
  position: [number, number, number];
  autoOriented?: boolean;
}

export interface OrderFilePreviewRecord {
  id: number;
  filename: string;
  mimeType: string | null;
  uploadedAt: string;
  orientationData: OrientationData | null;
}

interface OrderFilesPreviewProps {
  files: OrderFilePreviewRecord[];
}

export function OrderFilesPreview({ files }: OrderFilesPreviewProps) {
  if (!files.length) {
    return null;
  }

  return (
    <Card className="border border-border/70">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Production Files</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {files.map((file) => (
          <FilePreviewCard key={file.id} file={file} />
        ))}
      </CardContent>
    </Card>
  );
}

function FilePreviewCard({ file }: { file: OrderFilePreviewRecord }) {
  const [mode, setMode] = useState<"original" | "oriented">(file.orientationData ? "oriented" : "original");
  const viewerUrl = useMemo(() => `/api/order-files/${file.id}/download?mode=${mode}`, [file.id, mode]);
  const downloadOriginal = `/api/order-files/${file.id}/download?mode=original`;
  const downloadOriented = `/api/order-files/${file.id}/download?mode=oriented`;

  return (
    <div className="space-y-3 rounded-lg border border-border/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-foreground">{file.filename}</p>
          <p className="text-xs text-muted-foreground">Uploaded {new Date(file.uploadedAt).toLocaleString()}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <a href={downloadOriginal}>Download Original</a>
          </Button>
          <Button
            asChild
            size="sm"
            variant={file.orientationData ? "default" : "outline"}
            disabled={!file.orientationData}
          >
            <a href={downloadOriented} aria-disabled={!file.orientationData}>
              Download Oriented
            </a>
          </Button>
        </div>
      </div>

      <Tabs value={mode} onValueChange={(value) => setMode(value as typeof mode)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="original">Original</TabsTrigger>
          <TabsTrigger value="oriented" disabled={!file.orientationData}>
            Approved Orientation
          </TabsTrigger>
        </TabsList>
        <TabsContent value="original">
          <ViewerFrame url={`/api/order-files/${file.id}/download?mode=original`} />
        </TabsContent>
        <TabsContent value="oriented">
          {file.orientationData ? (
            <ViewerFrame url={`/api/order-files/${file.id}/download?mode=oriented`} />
          ) : (
            <p className="rounded-md border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
              Orientation has not been approved for this file.
            </p>
          )}
        </TabsContent>
      </Tabs>

      {file.orientationData ? (
        <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
          <p className="mb-1 font-medium text-foreground">Orientation Metadata</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Quaternion</p>
              <p className="font-mono text-[11px]">
                {file.orientationData.quaternion.map((v) => v.toFixed(4)).join(", ")}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Position</p>
              <p className="font-mono text-[11px]">
                {file.orientationData.position.map((v) => v.toFixed(2)).join(", ")}
              </p>
            </div>
          </div>
          {file.orientationData.autoOriented ? (
            <Badge variant="secondary" className="mt-2">Auto-oriented</Badge>
          ) : (
            <Badge variant="default" className="mt-2">Manually oriented</Badge>
          )}
        </div>
      ) : null}
    </div>
  );
}

function ViewerFrame({ url }: { url: string }) {
  return (
    <div className="mt-3 rounded-lg border border-border/70 bg-background">
      <ModelViewerWrapper url={url} />
    </div>
  );
}
