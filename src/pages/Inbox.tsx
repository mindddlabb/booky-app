import { useState, useEffect } from "react";
import { MessageCircle, Search, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import ConversationCard from "@/components/ConversationCard";
import { Skeleton } from "@/components/ui/skeleton";

interface Conversation {
  conversationId: string;
  otherUserId: string;
  otherUserName: string;
  otherUserAvatar?: string;
  apartmentId?: string;
  apartmentThumbnail?: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

const Inbox = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchConversations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: messages, error } = await supabase
        .from("messages")
        .select(`*, sender:profiles!messages_sender_id_fkey(full_name, profile_picture), receiver:profiles!messages_receiver_id_fkey(full_name, profile_picture), apartment:apartments(media)`)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("sent_at", { ascending: false });

      if (error) throw error;

      const conversationMap = new Map<string, Conversation>();
      messages?.forEach((message: any) => {
        const convId = message.conversation_id;
        if (!conversationMap.has(convId)) {
          const isUserSender = message.sender_id === user.id;
          const otherUser = isUserSender ? message.receiver : message.sender;
          const apartmentMedia = message.apartment?.media?.[0];
          conversationMap.set(convId, {
            conversationId: convId,
            otherUserId: isUserSender ? message.receiver_id : message.sender_id,
            otherUserName: otherUser?.full_name || "User",
            otherUserAvatar: otherUser?.profile_picture,
            apartmentId: message.apartment_id,
            apartmentThumbnail: apartmentMedia?.url,
            lastMessage: message.content,
            lastMessageTime: message.sent_at,
            unreadCount: 0,
          });
        }
      });

      for (const [convId, conv] of conversationMap) {
        const { count } = await supabase.from("messages").select("*", { count: "exact", head: true }).eq("conversation_id", convId).eq("receiver_id", user.id).eq("read_status", false);
        conv.unreadCount = count || 0;
      }

      const conversationsList = Array.from(conversationMap.values());
      setConversations(conversationsList);
      setFilteredConversations(conversationsList);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchConversations(); }, []);

  // Realtime: refresh conversations when new messages arrive
  useEffect(() => {
    const channel = supabase
      .channel("inbox-realtime")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
      }, () => {
        fetchConversations();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredConversations(conversations);
    } else {
      const filtered = conversations.filter((conv) =>
        conv.otherUserName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredConversations(filtered);
    }
  }, [searchQuery, conversations]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchConversations();
  };

  const handleConversationClick = (conversation: Conversation) => {
    navigate(`/chat/${conversation.conversationId}`, {
      state: { otherUserId: conversation.otherUserId, otherUserName: conversation.otherUserName, apartmentId: conversation.apartmentId },
    });
  };

  return (
    <div className="min-h-screen bg-background pb-24 pb-safe">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b px-5 pb-4 pt-[max(0.875rem,env(safe-area-inset-top,0px))]">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-semibold">Messages</h1>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            aria-label="Refresh messages"
            className="w-11 h-11 rounded-full bg-muted flex items-center justify-center transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 rounded-xl bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
          />
        </div>
      </div>

      <div className="px-5 pt-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-3 p-4 rounded-2xl border animate-in fade-in duration-300">
                <Skeleton className="w-12 h-12 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <MessageCircle className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <h3 className="font-semibold text-base mb-1">
              {searchQuery ? "No conversations found" : "No messages yet"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              {searchQuery ? "Try a different search term" : "Your conversations with hosts will appear here"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredConversations.map((conversation, i) => (
              <div key={conversation.conversationId} className="animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: `${i * 50}ms` }}>
                <ConversationCard
                  listerName={conversation.otherUserName}
                  listerAvatar={conversation.otherUserAvatar}
                  apartmentThumbnail={conversation.apartmentThumbnail}
                  lastMessage={conversation.lastMessage}
                  timestamp={conversation.lastMessageTime}
                  unreadCount={conversation.unreadCount}
                  onClick={() => handleConversationClick(conversation)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Inbox;
