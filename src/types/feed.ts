export interface FeedRule {
  required?: {
    accounts?: string[];
  };
  optional?: {
    domains?: string[];
    keywords?: string[];
  };
  exclude?: {
    domains?: string[];
    keywords?: string[];
  };
}

export interface FeedConfiguration {
  id: string;
  name: string;
  rules: FeedRule;
}
