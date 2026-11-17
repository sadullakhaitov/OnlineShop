"use client";

import type { ComponentProps } from "react";

/** A select that sends its form as soon as another option is picked. */
export function SubmitOnChange(props: ComponentProps<"select">) {
  return <select {...props} onChange={(event) => event.currentTarget.form?.requestSubmit()} />;
}
