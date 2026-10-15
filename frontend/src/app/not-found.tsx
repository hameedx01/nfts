import Link from "next/link";
export default function NotFound() {
  return (
    <div className="empty-state">
      <span className="eyebrow">404 / OFF THE CANVAS</span>
      <h1>This page is missing.</h1>
      <Link href="/" className="button">
        Back to the studio
      </Link>
    </div>
  );
}
