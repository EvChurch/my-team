type YouTubeEmbedOptions = {
  endTime?: number;
  startTime?: number;
};

export function getYouTubeEmbedUrl(url: string, options: YouTubeEmbedOptions = {}) {
  const videoId = getYouTubeVideoId(url);
  if (!videoId) return null;

  const embedUrl = new URL(`https://www.youtube.com/embed/${videoId}`);
  embedUrl.searchParams.set("enablejsapi", "1");
  embedUrl.searchParams.set("controls", "0");
  embedUrl.searchParams.set("disablekb", "1");
  embedUrl.searchParams.set("fs", "0");
  embedUrl.searchParams.set("iv_load_policy", "3");
  embedUrl.searchParams.set("modestbranding", "1");
  embedUrl.searchParams.set("playsinline", "1");
  embedUrl.searchParams.set("rel", "0");
  if (typeof options.startTime === "number" && options.startTime > 0) {
    embedUrl.searchParams.set("start", String(Math.floor(options.startTime)));
  }
  if (typeof options.endTime === "number" && options.endTime > 0) {
    embedUrl.searchParams.set("end", String(Math.floor(options.endTime)));
  }

  return embedUrl.toString();
}

export function normalizeYouTubeUrl(url: string) {
  const trimmedUrl = url.trim();
  if (!trimmedUrl) return "";

  if (/^https?:\/\//i.test(trimmedUrl)) {
    return trimmedUrl;
  }

  if (
    /^(www\.)?(youtube\.com|youtu\.be|m\.youtube\.com|music\.youtube\.com)\//i.test(
      trimmedUrl,
    )
  ) {
    return `https://${trimmedUrl}`;
  }

  return trimmedUrl;
}

export function getYouTubeVideoId(url: string) {
  try {
    const parsedUrl = new URL(normalizeYouTubeUrl(url));
    const hostname = parsedUrl.hostname.replace(/^www\./, "");

    if (hostname === "youtu.be") {
      return parsedUrl.pathname.split("/").filter(Boolean)[0] ?? null;
    }

    if (
      hostname === "youtube.com" ||
      hostname === "m.youtube.com" ||
      hostname === "music.youtube.com"
    ) {
      if (parsedUrl.pathname === "/watch") {
        return parsedUrl.searchParams.get("v");
      }
      const pathParts = parsedUrl.pathname.split("/").filter(Boolean);
      if (pathParts[0] === "embed" || pathParts[0] === "shorts") {
        return pathParts[1] ?? null;
      }
    }
  } catch {
    return null;
  }

  return null;
}
