export type SearchProviderId = 'naver-shopping' | 'tcgshop-direct';

export type ProductAvailability = 'available' | 'unavailable' | 'unknown';

export type NormalizedProductResult = {
  provider: SearchProviderId;
  merchantName: string;
  title: string;
  price: number | null;
  imageUrl: string | null;
  externalUrl: string;
  productId: string;
  availability: ProductAvailability;
  sourceTags: string[];
};

export type PurchaseRequest = {
  id: string;
  searchTerm: string;
  quantity: number;
};

export type SearchGroupStatus = 'idle' | 'loading' | 'success' | 'empty' | 'partial' | 'failed';

export type SearchAuxiliaryAction = {
  id: string;
  label: string;
  externalUrl: string;
  reason: string;
};

export type SearchResultGroup = {
  requestId: string;
  searchTerm: string;
  quantity: number;
  status: SearchGroupStatus;
  results: NormalizedProductResult[];
  auxiliaryActions: SearchAuxiliaryAction[];
  errorMessage: string | null;
};

export type PurchaseRequestInput = {
  id?: string;
  searchTerm: string;
  quantity: number;
};
