import Link from "next/link";
import { EmptyState } from "@/components/ui";
import { getDict } from "@/lib/i18n";

export default function NotFound() {
  const t = getDict("ar");
  const en = getDict("en");
  return (
    <div className="narrow" style={{ paddingBlock: "4rem" }}>
      <EmptyState
        icon="pin"
        title={`${t.pages.notFoundTitle} · ${en.pages.notFoundTitle}`}
        text={`${t.pages.notFoundText} — ${en.pages.notFoundText}`}
        action={<div className="row" style={{ justifyContent: "center" }}><Link className="btn" href="/ar">{t.pages.backHome}</Link><Link className="btn btn-outline" href="/en">{en.pages.backHome}</Link></div>}
      />
    </div>
  );
}
