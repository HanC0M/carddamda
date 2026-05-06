export type NaverShoppingApiItem = {
  title: string;
  link: string;
  image?: string;
  lprice?: string;
  hprice?: string;
  mallName?: string;
  productId?: string;
  productType?: string;
  brand?: string;
  maker?: string;
  category1?: string;
  category2?: string;
  category3?: string;
  category4?: string;
};

export type NaverShoppingApiResponse = {
  lastBuildDate: string;
  total: number;
  start: number;
  display: number;
  items: NaverShoppingApiItem[];
};
