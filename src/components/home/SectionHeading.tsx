import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";

type Props = {
  title: string;
  linkLabel?: string;
  href?: string;
};

export function SectionHeading({ title, linkLabel, href = "/catalog" }: Props) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4 px-1">
      <h2 className="text-2xl font-semibold sm:text-[1.75rem]">{title}</h2>
      {linkLabel && (
        <Link
          href={href}
          className="group inline-flex shrink-0 items-center gap-1.5 pb-1 text-sm font-medium text-muted transition-colors duration-300 hover:text-ink"
        >
          {linkLabel}
          <ArrowRight className="size-4 transition-transform duration-300 ease-smooth group-hover:translate-x-1" strokeWidth={1.8} />
        </Link>
      )}
    </div>
  );
}
