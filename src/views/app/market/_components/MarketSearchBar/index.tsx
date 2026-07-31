import { Input } from '@/components/Input';
import { Button } from '@heroui/react';
import { Search } from 'lucide-react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import type { MarketSearchBarProps } from './index.type';
import styles from './style.module.less';

function MarketSearchBar({
  value,
  placeholder,
  ariaLabel,
  searchButtonLabel,
  onChange,
  onSearch,
}: MarketSearchBarProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') onSearch();
  };

  return (
    <div className={styles.searchBar}>
      <Search className={styles.icon} size={18} aria-hidden="true" />
      <div className={styles.inputWrap}>
        <Input
          aria-label={ariaLabel}
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />
      </div>
      <Button variant="primary" onPress={onSearch}>
        {searchButtonLabel}
      </Button>
    </div>
  );
}

export default MarketSearchBar;
