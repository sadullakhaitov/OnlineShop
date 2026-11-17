import { notFound } from "next/navigation";

/** Any unknown address under a language shows the translated 404 page. */
export default function CatchAllPage() {
  notFound();
}
