import AuthCatchAllClientPage from "./ClientPage";

export const dynamicParams = false;

export async function generateStaticParams() {
  return [{ slug: ["callback"] }];
}

export default function AuthCatchAllPage() {
  return <AuthCatchAllClientPage />;
}
