import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Send, Image as ImageIcon, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import browserImageCompression from "browser-image-compression";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  sent_at: string;
  read_status: boolean;
  media_urls?: string[] | null;
}

const Chat = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as {
    otherUserId?: string;
    otherUserName?: string;
    apartmentId?: string;
  } | null;

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [otherUserName, setOtherUserName] = useState(state?.otherUserName || "User");
  const [otherUserAvatar, setOtherUserAvatar] = useState<string | undefined>();
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [isOtherOnline, setIsOtherOnline] = useState(false);
  const [resolvedOtherUserId, setResolvedOtherUserId] = useState<string | undefined>(state?.otherUserId);
  const [resolvedApartmentId, setResolvedApartmentId] = useState<string | undefined>(state?.apartmentId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const otherUserId = resolvedOtherUserId;
  const apartmentId = resolvedApartmentId;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Presence & typing channel
  useEffect(() => {
    if (!conversationId || !currentUserId) return;

    const channel = supabase.channel(`presence-${conversationId}`, {
      config: { presence: { key: currentUserId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const presenceState = channel.presenceState();
        // Check if other user is online
        const otherPresent = otherUserId ? !!presenceState[otherUserId] : false;
        setIsOtherOnline(otherPresent);

        // Check typing status
        if (otherUserId && presenceState[otherUserId]) {
          const otherState = presenceState[otherUserId] as any[];
          const isTyping = otherState.some((s: any) => s.typing === true);
          setIsOtherTyping(isTyping);
        } else {
          setIsOtherTyping(false);
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ online: true, typing: false });
        }
      });

    presenceChannelRef.current = channel;

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
      presenceChannelRef.current = null;
    };
  }, [conversationId, currentUserId, otherUserId]);

  const broadcastTyping = useCallback((typing: boolean) => {
    presenceChannelRef.current?.track({ online: true, typing });
  }, []);

  const handleTyping = useCallback(() => {
    broadcastTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      broadcastTyping(false);
    }, 2000);
  }, [broadcastTyping]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      setCurrentUserId(user.id);

      // Resolve otherUserId and apartmentId from state or conversation ID
      let resolvedId = state?.otherUserId;
      let resolvedApt = state?.apartmentId;

      // Parse conversation ID format: sortedUserId1_sortedUserId2_apartmentId
      if (conversationId) {
        const parts = conversationId.split("_");
        if (parts.length >= 3) {
          const [firstUserId, secondUserId, ...aptParts] = parts;
          const aptId = aptParts.join("_"); // rejoin in case apartment ID somehow has underscores
          if (!resolvedId) {
            resolvedId = firstUserId === user.id ? secondUserId : firstUserId;
          }
          if (!resolvedApt && aptId) {
            resolvedApt = aptId;
          }
        } else if (parts.length === 2 && !resolvedId) {
          resolvedId = parts[0] === user.id ? parts[1] : parts[0];
        }
      }

      // Fallback: resolve from existing messages
      if (!resolvedId && conversationId) {
        const { data: existingMsg } = await supabase
          .from("messages")
          .select("sender_id, receiver_id")
          .eq("conversation_id", conversationId)
          .limit(1)
          .single();
        if (existingMsg) {
          resolvedId = existingMsg.sender_id === user.id ? existingMsg.receiver_id : existingMsg.sender_id;
        }
      }

      if (resolvedApt) {
        setResolvedApartmentId(resolvedApt);
      }

      if (resolvedId) {
        setResolvedOtherUserId(resolvedId);
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, profile_picture")
          .eq("id", resolvedId)
          .single();
        if (profile) {
          setOtherUserName(profile.full_name);
          setOtherUserAvatar(profile.profile_picture || undefined);
        }
      }

      await fetchMessages();
      setLoading(false);
    };
    init();
  }, [conversationId]);

  const fetchMessages = async () => {
    if (!conversationId) return;

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("sent_at", { ascending: true });

    if (error) { console.error("Error fetching messages:", error); return; }
    setMessages(data || []);

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("messages")
        .update({ read_status: true })
        .eq("conversation_id", conversationId)
        .eq("receiver_id", user.id)
        .eq("read_status", false);
    }
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  // Real-time messages
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const newMsg = payload.new as Message;
        setMessages((prev) => {
          if (prev.find((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        if (currentUserId && newMsg.receiver_id === currentUserId) {
          supabase.from("messages").update({ read_status: true }).eq("id", newMsg.id);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId, currentUserId]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const imageFiles = files.filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) { toast.error("Please select image files only"); return; }
    if (selectedImages.length + imageFiles.length > 5) { toast.error("Maximum 5 images per message"); return; }

    setSelectedImages((prev) => [...prev, ...imageFiles]);
    imageFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreviews((prev) => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (userId: string): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of selectedImages) {
      const compressed = await browserImageCompression(file, {
        maxSizeMB: 1, maxWidthOrHeight: 1200, useWebWorker: true,
      });
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("chat-images").upload(path, compressed, { contentType: compressed.type });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("chat-images").getPublicUrl(path);
      urls.push(urlData.publicUrl);
    }
    return urls;
  };

  const handleSend = async () => {
    const hasText = newMessage.trim().length > 0;
    const hasImages = selectedImages.length > 0;
    if ((!hasText && !hasImages) || !currentUserId || !conversationId) return;
    if (!otherUserId) {
      toast.error("Unable to identify recipient. Please go back and try again.");
      return;
    }

    setSending(true);
    setUploading(hasImages);
    const messageContent = newMessage.trim() || (hasImages ? "📷 Image" : "");
    setNewMessage("");
    broadcastTyping(false);

    try {
      let mediaUrls: string[] | null = null;
      if (hasImages) {
        mediaUrls = await uploadImages(currentUserId);
        setSelectedImages([]);
        setImagePreviews([]);
      }

      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        receiver_id: otherUserId,
        content: messageContent,
        apartment_id: apartmentId || null,
        media_urls: mediaUrls,
      });
      if (error) throw error;

      // Fire-and-forget push notification
      supabase.functions.invoke("notify-new-message", {
        body: {
          senderId: currentUserId,
          receiverId: otherUserId,
          messageContent,
          conversationId,
        },
      }).catch((err) => console.log("Push notification skipped:", err));

    } catch (error: any) {
      toast.error("Failed to send message");
      setNewMessage(messageContent);
    } finally {
      setSending(false);
      setUploading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    handleTyping();
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDateSeparator = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  };

  const shouldShowDateSeparator = (index: number) => {
    if (index === 0) return true;
    return new Date(messages[index].sent_at).toDateString() !== new Date(messages[index - 1].sent_at).toDateString();
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))] flex items-center gap-3">
        <Button variant="ghost" size="icon" className="shrink-0 h-11 w-11 rounded-full" onClick={() => navigate("/inbox")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="relative">
          <Avatar className="h-9 w-9">
            <AvatarImage src={otherUserAvatar} />
            <AvatarFallback>{otherUserName.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          {/* Online indicator */}
          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background transition-colors ${isOtherOnline ? "bg-green-500" : "bg-muted-foreground/40"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-sm truncate">{otherUserName}</h2>
          <p className="text-[11px] text-muted-foreground">
            {isOtherTyping ? (
              <span className="text-primary">typing...</span>
            ) : isOtherOnline ? (
              "Online"
            ) : (
              "Offline"
            )}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24 space-y-1">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Send a message to start the conversation
          </div>
        ) : (
          messages.map((message, index) => {
            const isMe = message.sender_id === currentUserId;
            const hasMedia = message.media_urls && message.media_urls.length > 0;
            return (
              <div key={message.id}>
                {shouldShowDateSeparator(index) && (
                  <div className="flex items-center justify-center my-4">
                    <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                      {formatDateSeparator(message.sent_at)}
                    </span>
                  </div>
                )}
                <div className={`flex ${isMe ? "justify-end" : "justify-start"} mb-1`}>
                  <div className={`max-w-[75%] rounded-2xl text-sm overflow-hidden ${
                    isMe ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted text-foreground rounded-bl-md"
                  }`}>
                    {hasMedia && (
                      <div className={`grid gap-0.5 ${message.media_urls!.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                        {message.media_urls!.map((url, i) => (
                          <img key={i} src={url} alt="Shared image" className="w-full h-auto max-h-48 object-cover cursor-pointer" loading="lazy" onClick={() => setExpandedImage(url)} />
                        ))}
                      </div>
                    )}
                    {message.content && message.content !== "📷 Image" && (
                      <p className="whitespace-pre-wrap break-words px-3.5 py-2">{message.content}</p>
                    )}
                    {message.content === "📷 Image" && !hasMedia && (
                      <p className="whitespace-pre-wrap break-words px-3.5 py-2">{message.content}</p>
                    )}
                    <p className={`text-[10px] px-3.5 pb-1.5 ${hasMedia && (!message.content || message.content === "📷 Image") ? "pt-1" : ""} ${isMe ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      {formatTime(message.sent_at)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Typing indicator bubble */}
        {isOtherTyping && (
          <div className="flex justify-start mb-1">
            <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Image previews */}
      {imagePreviews.length > 0 && (
        <div className="px-4 py-2 border-t bg-background">
          <div className="flex gap-2 overflow-x-auto">
            {imagePreviews.map((preview, i) => (
              <div key={i} className="relative shrink-0">
                <img src={preview} alt={`Preview ${i + 1}`} className="w-16 h-16 rounded-lg object-cover" />
                <button onClick={() => removeImage(i)} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="sticky bottom-0 z-20 bg-background border-t px-4 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom,0px))]">
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />
          <Button variant="ghost" size="icon" className="shrink-0 h-11 w-11 rounded-full" onClick={() => fileInputRef.current?.click()} disabled={sending}>
            <ImageIcon className="w-5 h-5 text-muted-foreground" />
          </Button>
          <Input
            ref={inputRef}
            value={newMessage}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 h-11 rounded-full bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
          />
          <Button size="icon" className="rounded-full shrink-0 h-11 w-11" onClick={handleSend} disabled={(!newMessage.trim() && selectedImages.length === 0) || sending}>
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Expanded Image Modal */}
      {expandedImage && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4" onClick={() => setExpandedImage(null)}>
          <Button variant="ghost" size="icon" className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full" onClick={() => setExpandedImage(null)}>
            <X className="w-6 h-6" />
          </Button>
          <img src={expandedImage} alt="Expanded" className="max-w-full max-h-full object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
};

export default Chat;
