import {
  Book,
  Curve,
  Model,
  sampleBook,
  sampleModel,
  fingerprint,
  validateInputs,
} from "./bank-book";
/** Validate imported objects before they can become renderable UI state. */
export async function validateImport(
  kind: "book" | "curve" | "model",
  data: unknown,
  book: Book,
  curve: Curve,
  horizonMonths: number,
) {
  if (!data || typeof data !== "object" || Array.isArray(data))
    throw Error("Import requires a JSON object");
  if (kind === "book") {
    const candidate = data as Book;
    validateInputs({
      book: candidate,
      curve: {
        asOf: candidate.asOf,
        source: "Validation-only coverage curve",
        nodes: [
          { years: 0, rate: 0.03 },
          { years: 60, rate: 0.03 },
        ],
      },
      model: sampleModel(),
      horizonMonths: 60,
      snapshotHash: "",
    });
  } else if (kind === "curve") {
    const candidate = data as Curve;
    validateInputs({
      book: {
        ...sampleBook(),
        positions: [],
        adjustments: [],
        asOf: candidate.asOf,
      },
      curve: candidate,
      model: sampleModel(),
      horizonMonths: 1,
      snapshotHash: "",
    });
  } else
    validateInputs({
      book,
      curve,
      model: data as Model,
      horizonMonths,
      snapshotHash: await fingerprint(book),
    });
}
