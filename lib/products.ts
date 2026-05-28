/**
 * デモ用商品マスタ。本番では Amelia の services API から取得する。
 * 共通ダミーデータ仕様に準拠：抽象的な商品名のみ。
 */

export type Product = {
  id: string;
  name: string;
  priceJpy: number;
  description: string;
};

export const PRODUCTS: Product[] = [
  {
    id: "shortcake-15",
    name: "いちごのショートケーキ（15cm）",
    priceJpy: 4800,
    description: "国産いちごと自家製スポンジ。4〜6名様用。",
  },
  {
    id: "shortcake-18",
    name: "いちごのショートケーキ（18cm）",
    priceJpy: 6800,
    description: "国産いちごと自家製スポンジ。6〜8名様用。",
  },
  {
    id: "chocolat-15",
    name: "ガトーショコラ（15cm）",
    priceJpy: 4600,
    description: "○○国産クーベルチュール使用。4〜6名様用。",
  },
  {
    id: "montblanc-15",
    name: "モンブラン（15cm）",
    priceJpy: 5200,
    description: "和栗とマロンクリームの季節限定。4〜6名様用。",
  },
];

export function findProduct(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}
