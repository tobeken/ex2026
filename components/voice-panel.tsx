"use client"

import { useEffect } from "react";
import useWebRTCAudioSession from "@/hooks/use-webrtc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type VoicePanelProps = {
  voice?: string;
  canStart?: boolean;
  title?: string;
  onSessionStateChange?: (active: boolean) => void;
  onStart?: () => void;
};

export function VoicePanel({
  voice = "ash",
  canStart = true,
  title = "Voice Session",
  onSessionStateChange,
  onStart,
}: VoicePanelProps) {
  const { status, isSessionActive, startSession, stopSession } =
    useWebRTCAudioSession(voice);

  useEffect(() => {
    onSessionStateChange?.(isSessionActive);
  }, [isSessionActive, onSessionStateChange]);

  const handleStart = async () => {
    if (!canStart || isSessionActive) return;
    try {
      onStart?.();
      await startSession();
    } catch (error) {
      console.error("Failed to start session:", error);
    }
  };

  const handleStop = () => {
    if (!isSessionActive) return;
    stopSession();
  };

  const statusLabel = status || "Idle";

  return (
    <Card className="w-full space-y-4 p-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">Voice: {voice}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleStart} disabled={!canStart || isSessionActive}>
            Start
          </Button>
          <Button
            onClick={handleStop}
            variant="secondary"
            disabled={!isSessionActive}
          >
            Stop
          </Button>
        </div>
      </div>
      <div className="text-sm text-muted-foreground">
        Status: <span className="font-medium text-foreground">{statusLabel}</span>
      </div>
    </Card>
  );
}

export default VoicePanel;
