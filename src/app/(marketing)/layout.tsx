import { Header } from "@/components/marketing/header";
import { Footer } from "@/components/marketing/footer";
import { MotionLayer } from "@/components/marketing/motion";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="site-dark min-h-dvh">
      <Header />
      <main>{children}</main>
      <Footer />
      <MotionLayer />
    </div>
  );
}
