import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent
} from "@/components/ui/accordion";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell
} from "@/components/ui/table";

type Entry = {
  entry_id: number;
  entry_date: string;
  debit?: number;
  credit?: number;
  description: string;
  entry_type: string;
};

type Account = {
  account_code: string;
  account_name: string;
  balance: number;
  entries: Entry[];
};

type Summary = {
  [type: string]: Account[];
};

export default function BalanceSheet() {
  const [summary, setSummary] = useState<Summary>({});

  useEffect(() => {
    fetch("http://localhost:8000/us_gaap_summary")
      .then(res => res.json())
      .then(data => setSummary(data));
  }, []);

  return (
    <div className="space-y-8 mt-4">
      {Object.entries(summary).map(([type, accounts]) => (
        <div key={type}>
          <h2 className="text-2xl font-bold mb-4 text-gray-800">{type}</h2>
          <div className="space-y-4">
            {accounts.map(account => (
              <Card key={account.account_code}>
                <CardHeader className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-lg font-semibold">
                      {account.account_name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Account Code: {account.account_code}
                    </p>
                  </div>
                  <div
                    className={`text-lg font-bold ${
                      account.balance >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {account.balance.toLocaleString("en-US", {
                      style: "currency",
                      currency: "USD"
                    })}
                  </div>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible>
                    <AccordionItem value="entries">
                      <AccordionTrigger className="text-blue-600 hover:underline">
                        Show Journal Entries
                      </AccordionTrigger>
                      <AccordionContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableCell>ID</TableCell>
                              <TableCell>Date</TableCell>
                              <TableCell>Debit</TableCell>
                              <TableCell>Credit</TableCell>
                              <TableCell>Description</TableCell>
                              <TableCell>Entry Type</TableCell>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {account.entries.map((entry) => (
                              <TableRow key={entry.entry_id}>
                                <TableCell>{entry.entry_id}</TableCell>
                                <TableCell>{entry.entry_date}</TableCell>
                                <TableCell>
                                  {entry.debit?.toLocaleString("en-US", {
                                    style: "currency",
                                    currency: "USD"
                                  }) ?? "-"}
                                </TableCell>
                                <TableCell>
                                  {entry.credit?.toLocaleString("en-US", {
                                    style: "currency",
                                    currency: "USD"
                                  }) ?? "-"}
                                </TableCell>
                                <TableCell>{entry.description}</TableCell>
                                <TableCell>{entry.entry_type}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
