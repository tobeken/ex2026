"use client"

import { useEffect } from "react";
import { toast } from "sonner";
import useWebRTCAudioSession, { type HistoryMessage } from "@/hooks/use-webrtc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type VoicePanelProps = {
  voice?: string;
  canStart?: boolean;
  title?: string;
  initialMessages?: HistoryMessage[];
  onSessionStateChange?: (active: boolean) => void;
  onStopSessionReady?: (stop: () => void) => void;
  onStart?: () => void;
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
  initialMessages,
  onSessionStateChange,
  onStopSessionReady,
  onStart,
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
    onStopSessionReady?.(stopSession);
  }, [onStopSessionReady, stopSession]);

  useEffect(() => {
    if (onCombinedStreamReady) {
      onCombinedStreamReady(getCombinedStream);
    }
  }, [getCombinedStream, onCombinedStreamReady]);

  const handleStart = async () => {
    if (!canStart || isSessionActive) return;
    try {
      onStart?.();
      await startSession(initialMessages);
    } catch (error) {
      console.error("Failed to start session:", error);
      toast.error(
        "対話を開始できませんでした。ブラウザでこのページを再読み込みしたうえで、もう一度「対話開始」をお試しください。"
      );
    }
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
            対話開始
          </Button>
        </div>
      </div>
      <div className="text-sm text-muted-foreground">
        Status: <span className="font-medium text-foreground">{statusLabel}</span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed border-t border-border/60 pt-3">
        「対話開始」を押した直後にうまくつながらない場合は、ページを再読み込みしてから再度お試しください。対話の途中で接続が切れた場合は、以降の実験を続けられないことがあります。
      </p>
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
