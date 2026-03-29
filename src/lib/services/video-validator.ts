type VideoCheckResult = {
  valid: boolean;
  platform: string;
  error?: string;
};

const PLATFORM_PATTERNS: { platform: string; regex: RegExp }[] = [
  {
    platform: "youtube",
    regex:
      /^https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)/,
  },
  {
    platform: "vimeo",
    regex: /^https?:\/\/(?:www\.)?vimeo\.com\//,
  },
  {
    platform: "google_drive",
    regex: /^https?:\/\/drive\.google\.com\//,
  },
];

function detectPlatform(url: string): string {
  for (const { platform, regex } of PLATFORM_PATTERNS) {
    if (regex.test(url)) return platform;
  }
  return "generic";
}

async function checkYouTube(url: string): Promise<VideoCheckResult> {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const res = await fetch(oembedUrl);
    if (res.ok) {
      return { valid: true, platform: "youtube" };
    }
    return {
      valid: false,
      platform: "youtube",
      error: "YouTube video not found or is private",
    };
  } catch (error) {
    console.error("YouTube check failed:", error);
    return {
      valid: false,
      platform: "youtube",
      error: "Failed to reach YouTube",
    };
  }
}

async function checkVimeo(url: string): Promise<VideoCheckResult> {
  try {
    const oembedUrl = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`;
    const res = await fetch(oembedUrl);
    if (res.ok) {
      return { valid: true, platform: "vimeo" };
    }
    return {
      valid: false,
      platform: "vimeo",
      error: "Vimeo video not found or is private",
    };
  } catch (error) {
    console.error("Vimeo check failed:", error);
    return {
      valid: false,
      platform: "vimeo",
      error: "Failed to reach Vimeo",
    };
  }
}

async function checkGoogleDrive(url: string): Promise<VideoCheckResult> {
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow" });
    if (res.ok) {
      return { valid: true, platform: "google_drive" };
    }
    return {
      valid: false,
      platform: "google_drive",
      error: `Google Drive returned status ${res.status}`,
    };
  } catch (error) {
    console.error("Google Drive check failed:", error);
    return {
      valid: false,
      platform: "google_drive",
      error: "Failed to reach Google Drive link",
    };
  }
}

async function checkGeneric(url: string): Promise<VideoCheckResult> {
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow" });
    if (res.status >= 200 && res.status < 400) {
      return { valid: true, platform: "generic" };
    }
    return {
      valid: false,
      platform: "generic",
      error: `Link returned status ${res.status}`,
    };
  } catch (error) {
    console.error("Generic video check failed:", error);
    return {
      valid: false,
      platform: "generic",
      error: "Video link unreachable",
    };
  }
}

export async function validateVideoLink(
  url: string
): Promise<VideoCheckResult> {
  if (!url || !url.trim()) {
    return { valid: false, platform: "unknown", error: "Empty video URL" };
  }

  const platform = detectPlatform(url);

  switch (platform) {
    case "youtube":
      return checkYouTube(url);
    case "vimeo":
      return checkVimeo(url);
    case "google_drive":
      return checkGoogleDrive(url);
    default:
      return checkGeneric(url);
  }
}
