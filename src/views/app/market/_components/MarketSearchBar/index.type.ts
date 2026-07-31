export interface MarketSearchBarProps {
  value: string;
  placeholder: string;
  ariaLabel: string;
  searchButtonLabel: string;
  onChange: (value: string) => void;
  onSearch: () => void;
}
