"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent } from "react";

type YouTubeTrainingPlayerProps = {
  caption?: string;
  duration?: number;
  endTime?: number;
  onComplete?: () => void;
  onMetadata?: (metadata: { duration?: number; title?: string }) => void;
  showCaption?: boolean;
  startTime?: number;
  title?: string;
  videoId: string;
};

type YouTubePlayer = {
  destroy: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  getVideoData: () => { title?: string };
  pauseVideo: () => void;
  playVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
};

type YouTubeNamespace = {
  Player: new (
    element: HTMLElement,
    options: {
      events?: {
        onReady?: (event: { target: YouTubePlayer }) => void;
        onStateChange?: (event: { data: number; target: YouTubePlayer }) => void;
      };
      playerVars?: Record<string, number | string>;
      videoId: string;
    },
  ) => YouTubePlayer;
  PlayerState: {
    PLAYING: number;
  };
};

function isReadyYouTubePlayer(
  player: Partial<YouTubePlayer> | null,
): player is YouTubePlayer {
  if (!player) return false;

  return (
    typeof player.getCurrentTime === "function" &&
    typeof player.getDuration === "function" &&
    typeof player.pauseVideo === "function" &&
    typeof player.playVideo === "function" &&
    typeof player.seekTo === "function"
  );
}

declare global {
  interface Window {
    YT?: YouTubeNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youTubeApiPromise: Promise<YouTubeNamespace> | null = null;

function loadYouTubeIframeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (youTubeApiPromise) return youTubeApiPromise;

  youTubeApiPromise = new Promise((resolve) => {
    const previousCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousCallback?.();
      if (window.YT) resolve(window.YT);
    };

    if (
      !document.querySelector('script[src="https://www.youtube.com/iframe_api"]')
    ) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(script);
    }
  });

  return youTubeApiPromise;
}

export function YouTubeTrainingPlayer({
  caption,
  duration: savedDuration,
  endTime,
  onComplete,
  onMetadata,
  showCaption = true,
  startTime = 0,
  title,
  videoId,
}: YouTubeTrainingPlayerProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const metadataRef = useRef(onMetadata);
  const timingRef = useRef({ endTime, startTime });
  const isScrubbingRef = useRef(false);
  const [loadedDuration, setLoadedDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(startTime);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [draftTime, setDraftTime] = useState(startTime);
  const duration = loadedDuration || savedDuration || 0;
  const effectiveEndTime =
    typeof endTime === "number" && endTime > startTime ? endTime : duration;
  const selectedDuration = Math.max(effectiveEndTime - startTime, 0);
  const visibleTime = isScrubbing ? draftTime : currentTime;
  const selectedCurrentTime = Math.min(
    Math.max(visibleTime - startTime, 0),
    selectedDuration,
  );
  const progress =
    selectedDuration > 0 ? (selectedCurrentTime / selectedDuration) * 100 : 0;

  useEffect(() => {
    metadataRef.current = onMetadata;
  }, [onMetadata]);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    timingRef.current = { endTime, startTime };
    completedRef.current = false;
  }, [endTime, startTime]);

  useEffect(() => {
    isScrubbingRef.current = isScrubbing;
  }, [isScrubbing]);

  useEffect(() => {
    if (!hostRef.current) return;
    let cancelled = false;
    let intervalId: number | null = null;

    loadYouTubeIframeApi().then((YT) => {
      if (cancelled || !hostRef.current) return;

      const player = new YT.Player(hostRef.current, {
        videoId,
        playerVars: {
          controls: 0,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
        },
        events: {
          onReady: (event) => {
            const readyPlayer = event.target;
            const currentTiming = timingRef.current;
            playerRef.current = readyPlayer;
            readyPlayer.seekTo(currentTiming.startTime, true);

            const publishMetadata = () => {
              const nextDuration = Math.floor(readyPlayer.getDuration() || 0);
              const videoTitle = readyPlayer.getVideoData().title ?? "";
              setLoadedDuration(nextDuration);
              metadataRef.current?.({
                duration: nextDuration || undefined,
                title: videoTitle || undefined,
              });
              return Boolean(videoTitle);
            };

            const hasTitle = publishMetadata();
            setCurrentTime(currentTiming.startTime);
            if (!hasTitle) {
              window.setTimeout(publishMetadata, 750);
            }
          },
          onStateChange: (event) => {
            const playing = event.data === YT.PlayerState.PLAYING;
            setIsPlaying(playing);
            if (!playing) return;

            const activePlayer = isReadyYouTubePlayer(event.target)
              ? event.target
              : playerRef.current;
            if (!isReadyYouTubePlayer(activePlayer)) return;

            const currentTiming = timingRef.current;
            const activeEndTime =
              typeof currentTiming.endTime === "number" &&
              currentTiming.endTime > currentTiming.startTime
                ? currentTiming.endTime
                : activePlayer.getDuration();
            const now = activePlayer.getCurrentTime();
            if (now < currentTiming.startTime || now >= activeEndTime) {
              activePlayer.seekTo(currentTiming.startTime, true);
            }
          },
        },
      });

      intervalId = window.setInterval(() => {
        const activePlayer = playerRef.current;
        if (!isReadyYouTubePlayer(activePlayer)) return;
        if (isScrubbingRef.current) return;

        const currentTiming = timingRef.current;
        const now = activePlayer.getCurrentTime();
        const activeEndTime =
          typeof currentTiming.endTime === "number" &&
          currentTiming.endTime > currentTiming.startTime
            ? currentTiming.endTime
            : activePlayer.getDuration();

        if (now >= activeEndTime - 0.5) {
          if (!completedRef.current) {
            completedRef.current = true;
            onCompleteRef.current?.();
          }
          activePlayer.pauseVideo();
          activePlayer.seekTo(activeEndTime, true);
          setCurrentTime(activeEndTime);
          setIsPlaying(false);
          return;
        }
        if (now < currentTiming.startTime) {
          activePlayer.seekTo(currentTiming.startTime, true);
          setCurrentTime(currentTiming.startTime);
          return;
        }
        setCurrentTime(now);
      }, 250);

      playerRef.current = player;
    });

    return () => {
      cancelled = true;
      if (intervalId) window.clearInterval(intervalId);
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [videoId]);

  function togglePlayback() {
      const player = playerRef.current;
    if (!isReadyYouTubePlayer(player)) return;

    if (isPlaying) {
      player.pauseVideo();
      setIsPlaying(false);
      return;
    }

    const activeEndTime =
      typeof endTime === "number" && endTime > startTime ? endTime : duration;
    const now = player.getCurrentTime();
    if (now < startTime || now >= activeEndTime) {
      player.seekTo(startTime, true);
      setCurrentTime(startTime);
    }
    player.playVideo();
    setIsPlaying(true);
  }

  function getProgressTime(event: PointerEvent<HTMLDivElement>) {
    const rect = progressRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return startTime;

    const ratio = (event.clientX - rect.left) / rect.width;
    return startTime + selectedDuration * Math.min(Math.max(ratio, 0), 1);
  }

  function beginProgressScrub(event: PointerEvent<HTMLDivElement>) {
    const nextTime = getProgressTime(event);

    event.currentTarget.setPointerCapture(event.pointerId);
    setIsScrubbing(true);
    setDraftTime(nextTime);
  }

  function updateProgressScrub(event: PointerEvent<HTMLDivElement>) {
    if (!isScrubbing) return;
    setDraftTime(getProgressTime(event));
  }

  function finishProgressScrub(event: PointerEvent<HTMLDivElement>) {
    if (!isScrubbing) return;

    const nextTime = getProgressTime(event);
    const player = playerRef.current;
    if (isReadyYouTubePlayer(player)) {
      player.seekTo(nextTime, true);
    }
    setCurrentTime(nextTime);
    setDraftTime(nextTime);
    setIsScrubbing(false);
  }

  return (
    <figure
      className="bn-visual-media m-0 w-full space-y-2"
      contentEditable={false}
    >
      {title ? (
        <figcaption className="px-2 pt-1 text-base font-semibold leading-snug text-text-primary">
          {title}
        </figcaption>
      ) : null}
      <div className="group relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-bg-muted">
        <div ref={hostRef} className="h-full w-full" draggable={false} />
        <button
          type="button"
          onClick={togglePlayback}
          className="absolute inset-0 z-10 cursor-pointer bg-transparent"
          aria-label={isPlaying ? "Pause video" : "Play video"}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/70 via-black/35 to-transparent px-3 pb-3 pt-10 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
          <div className="pointer-events-auto flex items-center gap-3">
            <button
              type="button"
              onClick={togglePlayback}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-bg-card text-text-primary shadow-[var(--shadow-card)] transition-transform hover:scale-105"
              aria-label={isPlaying ? "Pause video" : "Play video"}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="ml-0.5 h-4 w-4" />
              )}
            </button>
            <div className="min-w-0 flex-1">
              <div
                ref={progressRef}
                role="slider"
                tabIndex={0}
                aria-label="Video progress"
                aria-valuemin={0}
                aria-valuemax={Math.floor(selectedDuration)}
                aria-valuenow={Math.floor(selectedCurrentTime)}
                className="group/progress relative flex h-5 w-full cursor-pointer touch-none items-center"
                onPointerDown={beginProgressScrub}
                onPointerMove={updateProgressScrub}
                onPointerUp={finishProgressScrub}
                onPointerCancel={finishProgressScrub}
              >
                <span className="absolute left-0 right-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-white/30" />
                <span
                  className="absolute left-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-white"
                  style={{ width: `${progress}%` }}
                />
                <span
                  className={[
                    "absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-white shadow-[0_2px_8px_rgba(0,0,0,0.35)] transition-transform",
                    isScrubbing
                      ? "scale-125"
                      : "scale-0 group-hover/progress:scale-100 group-focus/progress:scale-100",
                  ].join(" ")}
                  style={{ left: `${progress}%` }}
                />
              </div>
              <div className="mt-1 flex items-center justify-between text-xs font-medium text-white/80">
                <span>{formatVideoTime(selectedCurrentTime)}</span>
                <span>{formatVideoTime(selectedDuration)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      {showCaption && caption ? (
        <figcaption className="px-3 text-xs leading-5 text-text-secondary">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

function formatVideoTime(seconds: number) {
  const safeSeconds = Math.max(Math.floor(seconds), 0);
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}
