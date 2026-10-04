import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ConversationCardProps {
  listerName: string;
  listerAvatar?: string;
  apartmentThumbnail?: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  onClick: () => void;
}

const ConversationCard = ({
  listerName,
  listerAvatar,
  apartmentThumbnail,
  lastMessage,
  timestamp,
  unreadCount,
  onClick,
}: ConversationCardProps) => {
  const getRelativeTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return timestamp;
    }
  };

  return (
    <Card
      className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <Avatar className="h-12 w-12">
          <AvatarImage src={listerAvatar} />
          <AvatarFallback>{listerName.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-sm truncate">{listerName}</h3>
            <span className="text-xs text-muted-foreground ml-2">
              {getRelativeTime(timestamp)}
            </span>
          </div>
          <p className="text-sm text-muted-foreground truncate">{lastMessage}</p>
        </div>

        {apartmentThumbnail && (
          <img
            src={apartmentThumbnail}
            alt="Apartment"
            className="w-12 h-12 rounded object-cover"
          />
        )}

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Badge variant="default" className="h-5 min-w-5 px-1.5">
              {unreadCount}
            </Badge>
          )}
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </div>
      </div>
    </Card>
  );
};

export default ConversationCard;
