import { useNameServiceEvents, getEventStyle } from "@/hooks/useENSevents";
import { formatRelativeTime, truncateAddress } from "@/lib/utils";
import { useAccount } from "wagmi";
import { CHAIN_IDS } from "@/lib/chain-utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ExternalLink,
  User,
  Unplug,
  ArrowRight,
  Edit,
  Clock,
  Hash,
  Search,
  X,
  Filter,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useMemo } from "react";

// Helper function to get event icon component
function getEventIcon(eventName: string) {
  switch (eventName) {
    case "NameRegistered":
      return <User className="w-4 h-4" />;
    case "NameTransferred":
      return <ArrowRight className="w-4 h-4" />;
    case "NameUpdated":
      return <Edit className="w-4 h-4" />;
    default:
      return <Hash className="w-4 h-4" />;
  }
}

interface RecentActivityProps {
  limit?: number;
}

export function RecentActivity({ limit = 10 }: RecentActivityProps) {
  const { data: events, isLoading, error } = useNameServiceEvents();
  const { address, chainId } = useAccount();

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");
  const [displayLimit, setDisplayLimit] = useState(limit);

  // Filter and search events
  const filteredEvents = useMemo(() => {
    if (!events) return [];

    return events.filter((event) => {
      // Event type filter
      if (eventTypeFilter !== "all" && event.eventName !== eventTypeFilter) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim() === "") return true;

      const query = searchQuery.toLowerCase();

      // Search in various fields based on event type
      const searchableFields = [
        event.name,
        event.transactionHash,
        event.blockNumber.toString(),
      ];

      // Add event-specific fields
      if (event.eventName === "NameRegistered") {
        searchableFields.push(event.owner);
      } else if (event.eventName === "NameTransferred") {
        searchableFields.push(event.oldOwner, event.newOwner);
      } else if (event.eventName === "NameUpdated") {
        searchableFields.push(event.newAddress);
      }

      const searchableText = searchableFields
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [events, searchQuery, eventTypeFilter]);

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setEventTypeFilter("all");
    setDisplayLimit(limit);
  };

  // Check if any filters are active
  const hasActiveFilters =
    searchQuery.trim() !== "" || eventTypeFilter !== "all";

  // Empty state for no wallet connection
  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center py-8 sm:py-16 px-4 sm:px-6">
        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Unplug className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
        </div>
        <h3 className="text-base sm:text-lg font-semibold mb-2 text-center">
          Connect Your Wallet
        </h3>
        <p className="text-muted-foreground text-center text-sm sm:text-base max-w-xs sm:max-w-sm">
          Connect your wallet to view recent name service activities and
          transactions.
        </p>
      </div>
    );
  }

  // Wrong network state
  if (chainId !== CHAIN_IDS.CELO_ALFAJORES) {
    return (
      <div className="flex flex-col items-center justify-center py-8 sm:py-16 px-4 sm:px-6">
        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-orange-100 flex items-center justify-center mb-4">
          <Hash className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600" />
        </div>
        <h3 className="text-base sm:text-lg font-semibold mb-2 text-center">
          Wrong Network
        </h3>
        <p className="text-muted-foreground text-center text-sm sm:text-base max-w-xs sm:max-w-sm">
          Please switch to the Celo Alfajores network to view recent activities.
        </p>
        <Badge variant="outline" className="mt-3 text-xs">
          Current: {chainId ? `Chain ${chainId}` : "Unknown"}
        </Badge>
      </div>
    );
  }

  // Loading state with modern skeleton
  if (isLoading) {
    return (
      <div className="space-y-3 sm:space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-start space-x-3 sm:space-x-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-muted rounded-full flex-shrink-0"></div>
                <div className="flex-1 space-y-2 sm:space-y-3">
                  <div className="h-3 sm:h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-2 sm:h-3 bg-muted rounded w-1/2"></div>
                  <div className="flex gap-2">
                    <div className="h-5 sm:h-6 bg-muted rounded-full w-16 sm:w-20"></div>
                    <div className="h-5 sm:h-6 bg-muted rounded-full w-12 sm:w-16"></div>
                  </div>
                </div>
                <div className="h-2 sm:h-3 bg-muted rounded w-16 sm:w-20 flex-shrink-0"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 sm:py-16 px-4 sm:px-6">
        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
          <ExternalLink className="w-6 h-6 sm:w-8 sm:h-8 text-red-600" />
        </div>
        <h3 className="text-base sm:text-lg font-semibold mb-2 text-red-600 text-center">
          Failed to Load
        </h3>
        <p className="text-muted-foreground text-center text-sm sm:text-base max-w-xs sm:max-w-sm mb-4">
          Unable to fetch recent activities. Please check your connection and
          try refreshing the page.
        </p>
        <Badge variant="destructive" className="text-xs">
          Error
        </Badge>
      </div>
    );
  }

  // No events state
  if (!events || events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 sm:py-16 px-4 sm:px-6">
        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
        </div>
        <h3 className="text-base sm:text-lg font-semibold mb-2 text-center">
          No Recent Activity
        </h3>
        <p className="text-muted-foreground text-center text-sm sm:text-base max-w-xs sm:max-w-sm">
          No recent name service activities found. Activities will appear here
          once transactions are made.
        </p>
      </div>
    );
  }

  const displayEvents = filteredEvents.slice(0, displayLimit);

  return (
    <>
      {/* Search and Filter Section */}
      <div className="mb-4 sm:mb-6 space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, address, transaction hash, or block number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery("")}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-muted"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Event Type Filter */}
          <div className="flex gap-2">
            <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  <SelectValue placeholder="Filter by type" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="NameRegistered">Name Registered</SelectItem>
                <SelectItem value="NameTransferred">
                  Name Transferred
                </SelectItem>
                <SelectItem value="NameUpdated">Name Updated</SelectItem>
              </SelectContent>
            </Select>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="px-3"
              >
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Active Filters Indicator */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-muted-foreground">
              Active filters:
            </span>
            {searchQuery && (
              <Badge variant="secondary" className="text-xs">
                Search: "
                {searchQuery.length > 20
                  ? `${searchQuery.slice(0, 20)}...`
                  : searchQuery}
                "
              </Badge>
            )}
            {eventTypeFilter !== "all" && (
              <Badge variant="secondary" className="text-xs">
                Type: {eventTypeFilter}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Activity Counter - Mobile Responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-2 sm:gap-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant="secondary"
            className="px-2 py-1 text-xs sm:px-3 sm:text-sm"
          >
            {events.length} Total Activities
          </Badge>
          {hasActiveFilters && (
            <Badge
              variant="outline"
              className="px-2 py-1 text-xs sm:px-3 sm:text-sm"
            >
              {filteredEvents.length} Filtered
            </Badge>
          )}
          {filteredEvents.length > displayLimit && (
            <Badge
              variant="outline"
              className="px-2 py-1 text-xs sm:px-3 sm:text-sm"
            >
              Showing {displayLimit} of {filteredEvents.length}
            </Badge>
          )}
        </div>
      </div>

      {/* No Results State */}
      {filteredEvents.length === 0 && hasActiveFilters && (
        <div className="flex flex-col items-center justify-center py-8 sm:py-16 px-4 sm:px-6">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Search className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
          </div>
          <h3 className="text-base sm:text-lg font-semibold mb-2 text-center">
            No Results Found
          </h3>
          <p className="text-muted-foreground text-center text-sm sm:text-base max-w-xs sm:max-w-sm mb-4">
            No activities match your current search and filter criteria.
          </p>
          <Button variant="outline" size="sm" onClick={clearFilters}>
            Clear Filters
          </Button>
        </div>
      )}

      {filteredEvents.length > 0 && (
        <ScrollArea className="h-[60vh] sm:h-[calc(90vh-13rem)] w-full rounded-md">
          <div className="space-y-3 sm:space-y-4 pr-2 sm:pr-4">
            {/* Events List */}
            <div className="grid gap-3 sm:gap-4">
              {displayEvents.map((event, index) => {
                const { color } = getEventStyle(event);
                return (
                  <Card
                    key={`${event.transactionHash}-${event.logIndex}`}
                    className="group hover:shadow-md transition-all duration-200 border-l-4 border-l-transparent hover:border-l-primary"
                  >
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-start gap-3 sm:gap-4">
                        {/* Event Icon - Smaller on mobile */}
                        <div className="flex-shrink-0">
                          <div
                            className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-gradient-to-br ${
                              event.eventName === "NameRegistered"
                                ? "from-blue-100 to-blue-200 text-blue-600"
                                : event.eventName === "NameTransferred"
                                  ? "from-green-100 to-green-200 text-green-600"
                                  : "from-yellow-100 to-yellow-200 text-yellow-600"
                            }`}
                          >
                            {getEventIcon(event.eventName)}
                          </div>
                        </div>

                        {/* Event Content */}
                        <div className="flex-1 min-w-0">
                          {/* Main Description */}
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-2">
                            <h4 className={`font-semibold text-sm ${color}`}>
                              {event.eventName === "NameRegistered" &&
                                "Name Registered"}
                              {event.eventName === "NameTransferred" &&
                                "Name Transferred"}
                              {event.eventName === "NameUpdated" &&
                                "Name Updated"}
                            </h4>
                            <Badge variant="outline" className="text-xs w-fit">
                              #{index + 1}
                            </Badge>
                          </div>

                          {/* Event Details - Stack on mobile */}
                          <div className="space-y-2">
                            {event.eventName === "NameRegistered" && (
                              <div className="flex flex-col sm:grid sm:grid-cols-2 gap-2 text-sm">
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground font-medium text-xs sm:text-sm">
                                    Name:
                                  </span>
                                  <code className="bg-muted px-2 py-1 rounded text-xs font-mono break-all">
                                    {event.name.length >
                                    (window.innerWidth < 640 ? 15 : 20)
                                      ? `${event.name.slice(0, window.innerWidth < 640 ? 15 : 20)}...`
                                      : event.name}
                                  </code>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground font-medium text-xs sm:text-sm">
                                    Owner:
                                  </span>
                                  <code className="bg-muted px-2 py-1 rounded text-xs font-mono">
                                    {truncateAddress(
                                      event.owner,
                                      window.innerWidth < 640 ? 4 : 6,
                                    )}
                                  </code>
                                </div>
                              </div>
                            )}

                            {event.eventName === "NameTransferred" && (
                              <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground font-medium text-xs sm:text-sm">
                                    Name:
                                  </span>
                                  <code className="bg-muted px-2 py-1 rounded text-xs font-mono break-all">
                                    {event.name.length >
                                    (window.innerWidth < 640 ? 15 : 20)
                                      ? `${event.name.slice(0, window.innerWidth < 640 ? 15 : 20)}...`
                                      : event.name}
                                  </code>
                                </div>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground font-medium text-xs sm:text-sm">
                                      From:
                                    </span>
                                    <code className="bg-muted px-2 py-1 rounded text-xs font-mono">
                                      {truncateAddress(
                                        event.oldOwner,
                                        window.innerWidth < 640 ? 4 : 6,
                                      )}
                                    </code>
                                  </div>
                                  <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground hidden sm:block" />
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground font-medium text-xs sm:text-sm">
                                      To:
                                    </span>
                                    <code className="bg-muted px-2 py-1 rounded text-xs font-mono">
                                      {truncateAddress(
                                        event.newOwner,
                                        window.innerWidth < 640 ? 4 : 6,
                                      )}
                                    </code>
                                  </div>
                                </div>
                              </div>
                            )}

                            {event.eventName === "NameUpdated" && (
                              <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground font-medium text-xs sm:text-sm">
                                    Name:
                                  </span>
                                  <code className="bg-muted px-2 py-1 rounded text-xs font-mono break-all">
                                    {event.name.length >
                                    (window.innerWidth < 640 ? 15 : 20)
                                      ? `${event.name.slice(0, window.innerWidth < 640 ? 15 : 20)}...`
                                      : event.name}
                                  </code>
                                </div>
                                <div className="flex flex-col sm:grid sm:grid-cols-2 gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground font-medium text-xs sm:text-sm">
                                      New Address:
                                    </span>
                                    <code className="bg-muted px-2 py-1 rounded text-xs font-mono">
                                      {truncateAddress(
                                        event.newAddress,
                                        window.innerWidth < 640 ? 4 : 6,
                                      )}
                                    </code>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground font-medium text-xs sm:text-sm">
                                      Image Hash:
                                    </span>
                                    <code className="bg-muted px-2 py-1 rounded text-xs font-mono">
                                      {event.newImageHash.slice(
                                        0,
                                        window.innerWidth < 640 ? 6 : 10,
                                      )}
                                      ...
                                    </code>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Transaction Details - Stack on mobile */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-3 border-t border-border/50 gap-2 sm:gap-4">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span className="hidden sm:inline">
                                    Block #
                                  </span>
                                  <span className="sm:hidden">#</span>
                                  {event.blockNumber.toString()}
                                </div>
                                <a
                                  href={`https://alfajores.celoscan.io/tx/${event.transactionHash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 hover:text-primary transition-colors w-fit"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span className="hidden sm:inline">
                                    View on Celoscan
                                  </span>
                                  <span className="sm:hidden">Celoscan</span>
                                </a>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {formatRelativeTime(event.timestamp)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Show More Indicator */}
            {filteredEvents.length > displayLimit && (
              <Card
                className="bg-muted/50 mt-4 cursor-pointer hover:bg-muted/70 transition-colors"
                onClick={() =>
                  setDisplayLimit((prev) =>
                    Math.min(prev + limit, filteredEvents.length),
                  )
                }
              >
                <CardContent className="p-3 sm:p-4 text-center">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-2">
                    Showing {displayLimit} of {filteredEvents.length} filtered
                    activities
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {filteredEvents.length - displayLimit} more activities
                      available
                    </Badge>
                    <Button variant="ghost" size="sm" className="text-xs">
                      Load More
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Show Less Option when displayLimit exceeds initial limit */}
            {displayLimit > limit && (
              <Card className="bg-muted/50 mt-2">
                <CardContent className="p-3 sm:p-4 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDisplayLimit(limit)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Show Less
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      )}
    </>
  );
}
