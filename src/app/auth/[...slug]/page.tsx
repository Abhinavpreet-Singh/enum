export default function AuthCatchAllPage() {
  return null;
}

export function generateStaticParams() {
  return [
    { slug: ["google", "callback"] },
    { slug: ["github", "callback"] },
  ];
}
