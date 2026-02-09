import { ThumbsUp, ThumbsDown, ExternalLink, MessageSquare } from "lucide-react";

interface BannerPreviewProps {
  content: string;
  bgColor: string;
  textColor: string;
  linkUrl?: string;
  linkLabel?: string;
  hasVoting: boolean;
}

const BannerPreview = ({ content, bgColor, textColor, linkUrl, linkLabel, hasVoting }: BannerPreviewProps) => {
  return (
    <div className="w-full max-w-sm mx-auto rounded-xl overflow-hidden shadow-lg border">
      {/* Banner */}
      <div className="px-4 py-3 text-sm" style={{ backgroundColor: bgColor, color: textColor }}>
        <p>{content || "Texto do banner aqui..."}</p>
        <div className="flex items-center gap-3 mt-1.5">
          {linkUrl && (
            <span className="inline-flex items-center gap-1 text-xs underline opacity-90" style={{ color: textColor }}>
              {linkLabel || "Saiba mais"}
              <ExternalLink className="h-3 w-3" />
            </span>
          )}
          {hasVoting && (
            <div className="flex items-center gap-1 ml-auto">
              <span className="p-1 rounded" style={{ color: textColor }}>
                <ThumbsUp className="h-3.5 w-3.5" />
              </span>
              <span className="p-1 rounded" style={{ color: textColor }}>
                <ThumbsDown className="h-3.5 w-3.5" />
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Mock widget header */}
      <div className="bg-primary p-3 flex items-center gap-2 text-primary-foreground">
        <MessageSquare className="h-4 w-4" />
        <span className="text-xs font-semibold">Suporte</span>
      </div>

      {/* Mock chat body */}
      <div className="bg-background p-3 space-y-2 h-24">
        <div className="h-3 w-2/3 bg-muted rounded" />
        <div className="h-3 w-1/2 bg-muted rounded ml-auto" />
        <div className="h-3 w-3/4 bg-muted rounded" />
      </div>
    </div>
  );
};

export default BannerPreview;
