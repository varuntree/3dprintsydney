import { redirect } from "next/navigation";

export default function ClientNewPage() {
  redirect("/clients?new=1");
}
