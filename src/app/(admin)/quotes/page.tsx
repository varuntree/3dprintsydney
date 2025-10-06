import {
  QuotesView,
  type QuoteSummaryRecord,
} from "@/components/quotes/quotes-view";
import { listQuotes } from "@/server/services/quotes";

export default async function QuotesPage() {
  const quotes = await listQuotes();
  const initial: QuoteSummaryRecord[] = quotes.map((quote) => ({
    ...quote,
    issueDate: quote.issueDate.toISOString(),
    expiryDate: quote.expiryDate ? quote.expiryDate.toISOString() : null,
  }));

  return <QuotesView initial={initial} />;
}
