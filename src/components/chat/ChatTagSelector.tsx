import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Tag, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface ChatTag {
  id: string;
  name: string;
  color: string;
}

interface ChatTagSelectorProps {
  roomId: string;
  compact?: boolean;
}

const RANDOM_COLORS = [
  "#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6",
  "#8b5cf6", "#ef4444", "#14b8a6", "#f97316", "#06b6d4",
];

export function ChatTagSelector({ roomId, compact }: ChatTagSelectorProps) {
  const { user } = useAuth();
  const [allTags, setAllTags] = useState<ChatTag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [newTagName, setNewTagName] = useState("");
  const [creating, setCreating] = useState(false);
  const [showInput, setShowInput] = useState(false);

  const fetchData = useCallback(async () => {
    const [tagsRes, roomTagsRes] = await Promise.all([
      supabase.from("chat_tags").select("id, name, color").order("name"),
      supabase.from("chat_room_tags").select("tag_id").eq("room_id", roomId),
    ]);
    setAllTags(
      (tagsRes.data ?? []).map((t) => ({ id: t.id, name: t.name, color: t.color ?? "#6366f1" }))
    );
    setSelectedTagIds(new Set((roomTagsRes.data ?? []).map((rt) => rt.tag_id)));
  }, [roomId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleTag = async (tagId: string) => {
    const isSelected = selectedTagIds.has(tagId);
    if (isSelected) {
      const { error } = await supabase
        .from("chat_room_tags")
        .delete()
        .eq("room_id", roomId)
        .eq("tag_id", tagId);
      if (!error) {
        setSelectedTagIds((prev) => {
          const next = new Set(prev);
          next.delete(tagId);
          return next;
        });
      }
    } else {
      const { error } = await supabase
        .from("chat_room_tags")
        .insert({ room_id: roomId, tag_id: tagId });
      if (!error) {
        setSelectedTagIds((prev) => new Set(prev).add(tagId));
      }
    }
  };

  const createTag = async () => {
    const name = newTagName.trim();
    if (!name || !user) return;
    setCreating(true);
    const color = RANDOM_COLORS[Math.floor(Math.random() * RANDOM_COLORS.length)];
    const { data, error } = await supabase
      .from("chat_tags")
      .insert({ name, color, user_id: user.id })
      .select("id, name, color")
      .single();

    if (error) {
      toast.error("Erro ao criar tag");
      setCreating(false);
      return;
    }

    // Associate with room
    await supabase.from("chat_room_tags").insert({ room_id: roomId, tag_id: data.id });

    setAllTags((prev) => [...prev, { id: data.id, name: data.name, color: data.color ?? color }]);
    setSelectedTagIds((prev) => new Set(prev).add(data.id));
    setNewTagName("");
    setShowInput(false);
    setCreating(false);
  };

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <div className="flex items-center gap-2">
        <Tag className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tags</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {allTags.map((tag) => {
          const isSelected = selectedTagIds.has(tag.id);
          return (
            <Badge
              key={tag.id}
              variant="outline"
              className={`cursor-pointer transition-all text-xs ${
                isSelected
                  ? "ring-1 ring-offset-1"
                  : "opacity-50 hover:opacity-80"
              }`}
              style={{
                borderColor: tag.color,
                color: isSelected ? "white" : tag.color,
                backgroundColor: isSelected ? tag.color : "transparent",
              }}
              onClick={() => toggleTag(tag.id)}
            >
              {tag.name}
              {isSelected && <X className="h-3 w-3 ml-1" />}
            </Badge>
          );
        })}

        {!showInput && (
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-xs gap-1 px-2"
            onClick={() => setShowInput(true)}
          >
            <Plus className="h-3 w-3" />
            Nova
          </Button>
        )}
      </div>

      {showInput && (
        <div className="flex gap-1.5">
          <Input
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="Nome da tag..."
            className="h-7 text-xs"
            onKeyDown={(e) => e.key === "Enter" && createTag()}
            autoFocus
          />
          <Button size="sm" className="h-7 text-xs px-2" onClick={createTag} disabled={creating || !newTagName.trim()}>
            <Plus className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => { setShowInput(false); setNewTagName(""); }}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
