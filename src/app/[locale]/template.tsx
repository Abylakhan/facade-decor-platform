/** Re-mounts on every navigation: a short, consistent page-enter transition. */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-in">{children}</div>;
}
