import type { Group } from '@/domains/Group';

export interface MarketGroupCardProps {
  group: Group;
  memberCountLabel: string;
  listingCountLabel?: string;
  onOpen: (group: Group) => void;
}
