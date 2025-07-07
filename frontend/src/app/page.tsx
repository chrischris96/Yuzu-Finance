"use client";

import { useEffect, useState } from "react";
import UploadJournal from "../components/ui/UploadJournal";
import JournalTable from "../components/ui/JournalTable";
import BalanceSheet from "../components/ui/BalanceSheet";

import {
  Card,
  CardContent,
} from "@/components/ui/card";

import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";

import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

interface JournalEntry {
  entry_id: number;
  entry_date: string;
  account_name: string;
  debit?: number;
  credit?: number;
  description: string;
  entry_type: string;
}

export default function Home() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [entryType, setEntryType] = useState("All");
  const [filteredEntries, setFilteredEntries] = useState<JournalEntry[]>([]);
  const [summary, setSummary] = useState<any[]>([]);

  useEffect(() => {
    fetch("http://localhost:8000/journal_entries")
      .then((res) => res.json())
      .then((data) => setEntries(data))
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    fetch("http://localhost:8000/us_gaap_summary")
      .then((res) => res.json())
      .then((data) => setSummary(data))
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    if (entryType === "All") {
      setFilteredEntries(entries);
    } else {
      setFilteredEntries(entries.filter((e) => e.entry_type === entryType));
    }
  }, [entryType, entries]);

  const entryTypes = [...new Set(entries.map((e) => e.entry_type))];

  return (
    <main className="min-h-screen bg-gray-50 p-8 space-y-12">
      <h1 className="text-3xl font-bold text-gray-800">
        Journal Entry Management
      </h1>

      <section className="bg-white p-6 rounded shadow space-y-8">
        {/* Upload and Manual Entry */}
        <UploadJournal />
        <JournalTable />
      </section>

      <section className="bg-white p-6 rounded shadow">
        <Tabs defaultValue="journal" className="space-y-4">
          <TabsList>
            <TabsTrigger value="journal">Journal Entries</TabsTrigger>
            <TabsTrigger value="summary">Balance Sheet</TabsTrigger>
          </TabsList>

          {/* Journal Entries Table */}
          <TabsContent value="journal">
            <div className="mt-4 space-y-4">
              <Select onValueChange={(val) => setEntryType(val)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All</SelectItem>
                  {entryTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Table className="mt-4">
                <TableHeader>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Account</TableCell>
                    <TableCell>Debit</TableCell>
                    <TableCell>Credit</TableCell>
                    <TableCell>Description</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.map((entry) => (
                    <TableRow key={entry.entry_id}>
                      <TableCell>{entry.entry_id}</TableCell>
                      <TableCell>{entry.entry_date}</TableCell>
                      <TableCell>{entry.account_name}</TableCell>
                      <TableCell>
                        {entry.debit != null ? entry.debit.toFixed(2) : ""}
                      </TableCell>
                      <TableCell>
                        {entry.credit != null ? entry.credit.toFixed(2) : ""}
                      </TableCell>
                      <TableCell>{entry.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Balance Sheet Summary */}
          <TabsContent value="summary">
            <BalanceSheet/>
          </TabsContent>
        </Tabs>
      </section>
    </main>
  );
}
