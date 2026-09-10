import Image from "next/image";
import Link from "next/link";
export default function ModelCard() {
  return (
    <main className="workspace">
      <header>
        <Link className="brand" href="/">
          <Image
            src="/yuzu/yuzu-logo.png"
            width={76}
            height={76}
            alt="Yuzu"
            unoptimized
          />
          <span>FINANCE LAB</span>
        </Link>
        <Link href="/">← Bank workspace</Link>
      </header>
      <section className="intro">
        <div>
          <p className="eyebrow">METHODOLOGY · VERSION 0.3</p>
          <h1>Understand the numbers.</h1>
          <p>A transparent portfolio demo, with explicit assumptions.</p>
        </div>
      </section>
      <section className="panel">
        <h2>What this version does</h2>
        <p>
          Models a bank’s EUR book from 1 January 2026 through 1 January 2027.
          Opening cash and paid-in capital are each €5 million. Instruments are
          recognised against settlement cash at inception. Positive derivative
          values are assets; negative values are liabilities. Notional is never
          treated as a derivative carrying amount.
        </p>
        <p>
          Supported products: bonds, IRS, CCS, CDS, CFD, options, cash, cash at
          sight and cash at call. Derivatives use supplied signed fair values
          only. Deposits may be assets placed with another bank or funding
          liabilities taken from customers.
        </p>
        <h2>Classification</h2>
        <p>
          Debt assets use the declared business model and SPPI outcome to choose
          amortised cost, FVOCI or FVTPL. Unknown SPPI outcomes are excluded and
          visibly flagged. Standalone derivatives use FVTPL; ordinary issued
          bonds and deposit liabilities use amortised cost. Cash is held at face
          value.
        </p>
        <p>
          The guided SPPI flow is a preliminary screen for plain lending
          arrangements. Prepayment, extension, modified time value, contingent
          features, non-recourse and contractually linked terms are referred for
          further assessment. The questionnaire is not a complete implementation
          of IFRS 9 or its amendments effective in 2026. A direct assessed
          result is the user’s assumption.
        </p>
        <h2>Measurement and time</h2>
        <p>
          For debt, the engine solves a monthly effective interest rate from
          opening consideration, scheduled contractual coupons and principal
          redemption at the selected maturity. Interest accrues monthly; coupons
          are paid monthly, quarterly, semiannually or annually, with a final
          short period at maturity. Unpaid contractual interest is shown as a
          separate receivable or payable, and included in total instrument book
          and market values. Principal is redeemed at maturity. There are no
          transaction costs, day-count adjustments, defaults, early sales,
          withdrawals or variable coupons. Demand/call deposits use a simplified
          stable-balance scenario until the selected end date.
        </p>
        <p>
          Fair values are supplied as opening and 12-month endpoints. Debt
          endpoints are clean (excluding accrued interest); the displayed market
          value adds unpaid contractual interest. Intermediate clean values use
          a straight-line illustrative path, not a pricing model or historical
          market data. Derivatives must mature beyond the horizon: settlement,
          interim swap payments, collateral, netting, foreign-currency
          translation and hedge accounting are not modelled. Fair value changes
          go to profit or loss, or to OCI for eligible FVOCI debt.
        </p>
        <h2>Expected credit losses</h2>
        <p>
          Stage 1 (12-month) or Stage 2 (lifetime) ECL is a user-supplied total
          allowance, held constant until redemption. There is no
          probability-of-default, loss-given-default or migration model. ECL
          reduces amortised-cost assets and profit. For FVOCI debt, it affects
          profit and OCI without reducing the asset’s fair value. Stage 3 and
          credit-impaired assets are outside scope.
        </p>
        <h2>Journal entries and the balance sheet</h2>
        <p>
          Generated postings are dated monthly double-entry movements. Each
          event has equal debits and credits. A shared account vocabulary is
          used in the journal, trial balance and balance sheet. Interest income
          and expense are separate; amortised-cost ECL is a contra-asset
          allowance. Manual and CSV adjustments must balance on each date and
          use EUR. They affect the trial balance and balance sheet through the
          reporting date. They do not update instrument terms. A balanced
          statement proves arithmetic reconciliation, not that the accounting
          assumptions are correct.
        </p>
        <p>
          The statement covers entered products and adjustments; it is not a
          complete IFRS or regulatory bank report. US GAAP is planned and no US
          GAAP calculations are currently generated. The separate comparison
          page shows parallel inception scenarios over 13 dates. FVTPL and FVOCI
          share the same supplied clean price path and contractual accruals; ECL
          is an expense with an OCI offset for FVOCI debt and is not recognised
          separately for FVTPL. Their cumulative P&L plus OCI therefore
          reconciles. Non-IFRS experiments for derivatives, cash or funding are
          explicitly optional and never alter the bank ledger. They do not
          implement hedge accounting, a liability fair-value option or
          own-credit OCI. No non-derivative equity instruments are modelled.
        </p>
        <h2>Your data</h2>
        <p>
          The public demo uses browser local storage, isolated by browser
          profile and site origin. CSV parsing happens in your browser. Clearing
          site data removes the workspace. Export preserves a readable JSON
          copy; automatic restore/import of backups is not yet provided. This is
          a portfolio demonstration, not a shared production ledger.
        </p>
        <h2>Primary sources</h2>
        <ul>
          <li>
            <a href="https://www.ifrs.org/issued-standards/list-of-standards/ifrs-9-financial-instruments/">
              IFRS Foundation: IFRS 9 overview and amendment history
            </a>
          </li>
          <li>
            <a href="https://www.ifrs.org/content/dam/ifrs/meetings/2016/september/wss/education-session/edu-ifrs9.pdf">
              IFRS Foundation: financial instrument classification education
              material
            </a>
          </li>
          <li>
            <a href="https://www.ifrs.org/supporting-implementation/supporting-materials-by-ifrs-standards/ifrs-9/">
              IFRS Foundation: IFRS 9 implementation materials
            </a>
          </li>
        </ul>
        <p>
          Rules and assumptions reviewed for this demo on 10 September 2026.
          Professional contract-level judgement remains necessary for real
          books.
        </p>
      </section>
    </main>
  );
}
