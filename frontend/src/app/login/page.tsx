import Link from "next/link";
export default function Login() {
  return (
    <main className="workspace">
      <section className="panel">
        <h1>Your demo needs no login.</h1>
        <p>
          Yuzu keeps this portfolio in your own browser. No account or shared
          financial database is required.
        </p>
        <Link href="/">Open the bank workspace →</Link>
      </section>
    </main>
  );
}
