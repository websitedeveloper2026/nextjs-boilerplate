export function escapeTsvField(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("\t", "\\t").replaceAll("\n", "\\n");
}

export function unescapeTsvField(value: string): string {
  return value.replace(/\\(\\|t|n)/g, (_m, g1: string) => {
    if (g1 === "\\") return "\\";
    if (g1 === "t") return "\t";
    return "\n";
  });
}

