/**
 * # Kiểu dữ liệu tham số điều hướng cho Expo Router
 */

export type RootStackParamList = {
  "(auth)": undefined;
  "(tabs)": undefined;
  "post/[id]": { id: string };
  modal: undefined;
  "+not-found": undefined;
};

export type TabParamList = {
  index: undefined;
  feed: undefined;
  account: undefined;
  openai: undefined;
};
