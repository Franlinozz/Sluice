/**
 * Route transition (Overhaul R2): templates re-mount on navigation, so a single CSS entrance
 * (transform+opacity) plays per route change. Reduced-motion renders static (tokens.css).
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
