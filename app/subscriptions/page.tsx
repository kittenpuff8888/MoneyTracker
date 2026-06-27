import { redirect } from "next/navigation";

// Subscriptions page removed per 8888 Tracker redesign.
// Kept as a redirect so any existing links/bookmarks resolve gracefully.
export default function SubscriptionsRemovedPage() {
  redirect("/dashboard");
}
