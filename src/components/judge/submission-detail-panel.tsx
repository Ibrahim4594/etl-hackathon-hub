import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Github,
  Video,
  Globe,
  FileText,
  ExternalLink,
  ImageIcon,
  Users,
  Calendar,
} from "lucide-react";

interface SubmissionDetailPanelProps {
  title: string;
  description: string;
  techStack: string[];
  githubUrl: string | null;
  videoUrl: string | null;
  deployedUrl: string | null;
  pitchDeckUrl: string | null;
  screenshots: string[];
  teamName: string;
  submittedAt: Date;
  customFieldResponses?: Record<string, string | number> | null;
  customFieldLabels?: Record<string, string>;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-PK", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(date));
}

function isYouTubeUrl(url: string): boolean {
  return url.includes("youtube.com") || url.includes("youtu.be");
}

function getYouTubeEmbedUrl(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return `https://www.youtube.com/embed/${match[1]}`;
  }
  return null;
}

export function SubmissionDetailPanel({
  title,
  description,
  techStack,
  githubUrl,
  videoUrl,
  deployedUrl,
  pitchDeckUrl,
  screenshots,
  teamName,
  submittedAt,
  customFieldResponses,
  customFieldLabels,
}: SubmissionDetailPanelProps) {
  const embedUrl = videoUrl ? getYouTubeEmbedUrl(videoUrl) : null;

  return (
    <div className="space-y-6">
      {/* Project Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              {teamName}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(submittedAt)}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-1">
              Description
            </h4>
            <p className="text-sm whitespace-pre-wrap">{description}</p>
          </div>

          {techStack.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                Tech Stack
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {techStack.map((tech) => (
                  <Badge key={tech} variant="secondary">
                    {tech}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Video Embed */}
      {videoUrl && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Video className="h-5 w-5" />
              Demo Video
            </CardTitle>
          </CardHeader>
          <CardContent>
            {embedUrl ? (
              <div className="aspect-video w-full overflow-hidden rounded-lg">
                <iframe
                  src={embedUrl}
                  title="Demo video"
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <a
                href={videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-muted"
              >
                <Video className="h-5 w-5 shrink-0" />
                <span className="min-w-0 truncate flex-1">{videoUrl}</span>
                <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
              </a>
            )}
          </CardContent>
        </Card>
      )}

      {/* Project Links */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Project Links</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {githubUrl && (
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-muted"
            >
              <Github className="h-5 w-5 shrink-0" />
              <span className="min-w-0 truncate flex-1">{githubUrl}</span>
              <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
            </a>
          )}
          {deployedUrl && (
            <a
              href={deployedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-muted"
            >
              <Globe className="h-5 w-5 shrink-0" />
              <span className="min-w-0 truncate flex-1">{deployedUrl}</span>
              <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
            </a>
          )}
          {pitchDeckUrl && (
            <a
              href={pitchDeckUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-muted"
            >
              <FileText className="h-5 w-5 shrink-0" />
              <span className="min-w-0 truncate flex-1">{pitchDeckUrl}</span>
              <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
            </a>
          )}
          {!githubUrl && !deployedUrl && !pitchDeckUrl && (
            <p className="text-sm text-muted-foreground py-2">
              No additional links provided.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Screenshots */}
      {screenshots.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Screenshots
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {screenshots.map((url, index) => (
                <a
                  key={index}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative block overflow-hidden rounded-lg border"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Screenshot ${index + 1}`}
                    className="aspect-video w-full object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
                    <ExternalLink className="h-5 w-5 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Custom Field Responses */}
      {customFieldResponses && Object.keys(customFieldResponses).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(customFieldResponses).map(([fieldId, value]) => (
              <div key={fieldId}>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">
                  {customFieldLabels?.[fieldId] ?? fieldId}
                </h4>
                <p className="text-sm">{String(value)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
