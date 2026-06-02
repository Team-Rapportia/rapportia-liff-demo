function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing required env: ${name}`);
  }
  return v;
}

export const serverEnv = {
  lineLoginChannelId: () => required("LINE_LOGIN_CHANNEL_ID"),
  lineMessagingToken: () => required("LINE_MESSAGING_CHANNEL_ACCESS_TOKEN"),
  lineShopOwnerUserId: () => required("LINE_SHOP_OWNER_USER_ID"),
  stripeSecretKey: () => required("STRIPE_SECRET_KEY"),
  stripeWebhookSecret: () => required("STRIPE_WEBHOOK_SECRET"),
  depositAmountJpy: () => Number(process.env.DEPOSIT_AMOUNT_JPY ?? "2000"),
  siteUrl: () => required("NEXT_PUBLIC_SITE_URL"),
  // 管理画面にアクセスできる管理者の LINE ユーザーID 許可リスト（カンマ区切り・複数可）。
  // 例: ADMIN_LINE_USER_IDS="Uxxxx,Uyyyy,Uzzzz"
  adminLineUserIds: () =>
    (process.env.ADMIN_LINE_USER_IDS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  // 管理者セッション Cookie の署名鍵。未設定でもローカルデモが動くようデフォルトを用意。
  adminSessionSecret: () =>
    process.env.ADMIN_SESSION_SECRET ?? "rapportia-dev-admin-secret",
};

export const clientEnv = {
  liffId: process.env.NEXT_PUBLIC_LIFF_ID ?? "",
  stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "",
};
