import ts from "typescript";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
mkdirSync(".book-build", { recursive: true });
writeFileSync(
  ".book-build/bank-book.cjs",
  ts.transpileModule(readFileSync("src/lib/bank-book.ts", "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText,
);
