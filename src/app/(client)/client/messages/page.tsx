import { redirect } from "next/navigation";

/**
 * Redirect /client/messages to /client (home page)
 * Messages are now consolidated into the home page
 */
export default function ClientMessagesRedirect() {
  redirect("/client");
}
