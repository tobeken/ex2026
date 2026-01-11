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
  onStop?: () => void;
  onUserSpeechFinal?: (text: string, startedAt: number, endedAt: number, turnId?: string, audioBlob?: Blob) => void;
  onUserSpeechStart?: (ts: number) => void;
  onUserSpeechEnd?: (ts: number) => void;
  onAssistantSpeechStart?: (ts: number) => void;
  onAssistantSpeechEnd?: (text: string, startedAt: number, endedAt: number, turnId?: string, audioBlob?: Blob) => void;
  onCombinedStreamReady?: (getter: () => MediaStream | null) => void;
};

export function VoicePanel({
  voice = "ash",
  canStart = true,
  title = "Voice Session",
  onSessionStateChange,
  onStart,
  onStop,
  onUserSpeechFinal,
  onUserSpeechStart,
  onUserSpeechEnd,
  onAssistantSpeechStart,
  onAssistantSpeechEnd,
  onCombinedStreamReady,
}: VoicePanelProps) {
  const {
    status,
    isSessionActive,
    startSession,
    stopSession,
    currentVolume,
    isMicActive,
    getCombinedStream,
  } = useWebRTCAudioSession(voice, undefined, {
    onUserSpeechFinal,
    onUserSpeechStart,
    onUserSpeechEnd,
    onAssistantSpeechStart,
    onAssistantSpeechEnd,
  });

  useEffect(() => {
    onSessionStateChange?.(isSessionActive);
  }, [isSessionActive, onSessionStateChange]);

  useEffect(() => {
    if (onCombinedStreamReady) {
      onCombinedStreamReady(getCombinedStream);
    }
  }, [getCombinedStream, onCombinedStreamReady]);

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
    onStop?.();
    stopSession();
  };

  const statusLabel = status || "Idle";
  const volumeLevel = Math.min(100, Math.round(currentVolume * 2000));

  return (
    <Card className="w-full space-y-4 p-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-medium">{title}</p>
          {/* <p className="text-xs text-muted-foreground">Voice: {voice}</p> */}
        </div>
        <div className="flex gap-2">
          <span
            className={`text-xs px-2 py-1 rounded-full border ${
              isSessionActive ? "bg-green-100 text-green-700 border-green-200" : "bg-muted text-muted-foreground"
            }`}
          >
            {isSessionActive ? "Active" : "Idle"}
          </span>
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
      <div className="space-y-3">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">あなたの音声</p>
          <div className="w-full h-2 rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-primary transition-all duration-150"
              style={{ width: isMicActive ? "100%" : "0%" }}
            />
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">アシスタント音声</p>
          <div className="w-full h-2 rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-primary transition-all duration-150"
              style={{ width: `${volumeLevel}%` }}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}

export default VoicePanel;
