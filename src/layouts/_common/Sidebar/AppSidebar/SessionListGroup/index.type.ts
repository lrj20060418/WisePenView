export interface SessionListGroupProps {
  selectedKeys: string[];
}

export interface SessionListGroupRef {
  refresh: () => Promise<void>;
}
