"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell
} from "@/components/ui/table";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
} from "@/components/ui/tabs";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from "@/components/ui/select";
import BalanceSheet from "./BalanceSheet";

interface JournalEntry {
  entry_id: number;
  entry_date: string;
  account_name: string;
  debit?: number;
  credit?: number;
  description: string;
  entry_type: string;
}

export default function JournalEntriesUI() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [entryType, setEntryType] = useState("All");
  const [filteredEntries, setFilteredEntries] = useState<JournalEntry[]>([]);
  const [summary, setSummary] = useState({});

  // Fetch journal entries from backend
  useEffect(() => {
    fetch("http://localhost:8000/journal_entries")
      .then(res => res.json())
      .then(data => setEntries(data));
  }, []);

  // Fetch balance sheet summary from backend
  useEffect(() => {
    fetch("http://localhost:8000/us_gaap_summary")
      .then(res => res.json())
      .then(data => setSummary(data));
  }, []);

  // Filter entries by type
  useEffect(() => {
    if (entryType === "All") {
      setFilteredEntries(entries);
    } else {
      setFilteredEntries(entries.filter(e => e.entry_type === entryType));
    }
  }, [entryType, entries]);

  const entryTypes = [...new Set(entries.map(e => e.entry_type))];

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Journal Entries Viewer (US GAAP)</h1>

      <Tabs defaultValue="journal" className="space-y-4">
        <TabsList>
          <TabsTrigger value="journal">Journal Entries</TabsTrigger>
          <TabsTrigger value="summary">Balance Sheet</TabsTrigger>
        </TabsList>

        {/* Journal Entries Table */}
        <TabsContent value="journal">
          <Select onValueChange={(val) => setEntryType(val)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              {entryTypes.map((type) => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
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
              {filteredEntries.map(entry => (
                <TableRow key={entry.entry_id}>
                  <TableCell>{entry.entry_id}</TableCell>
                  <TableCell>{entry.entry_date}</TableCell>
                  <TableCell>{entry.account_name}</TableCell>
                  <TableCell>{entry.debit?.toFixed(2) ?? ""}</TableCell>
                  <TableCell>{entry.credit?.toFixed(2) ?? ""}</TableCell>
                  <TableCell>{entry.description}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        {/* Balance Sheet Summary */}
        <TabsContent value="summary">
          <BalanceSheet />
        </TabsContent>

      </Tabs>
    </div>
  );
}
