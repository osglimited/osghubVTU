import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getTransactionById } from "@/lib/backend";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function TransactionDetailsPage() {
  const [, params] = useRoute("/transactions/:id");
  const id = params?.id || "";
  const [tx, setTx] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const data = await getTransactionById(id);
        if (!mounted) return;
        setTx(data || null);
      } catch {
        if (!mounted) return;
        setTx(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [id]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Transaction Details</h2>
          <p className="text-muted-foreground">Full information for transaction {id}</p>
        </div>
        <Link href="/transactions">
          <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
        </Link>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle>Summary</CardTitle>
          <CardDescription>Core fields and status.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <div className="p-2 text-sm text-muted-foreground">Loading...</div>
          ) : tx ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground text-sm">ID</span><div className="font-mono text-xs">{tx.id}</div></div>
                <div><span className="text-muted-foreground text-sm">User</span><div>{tx.user}</div></div>
                <div><span className="text-muted-foreground text-sm">Type</span><div>{tx.type}</div></div>
                <div><span className="text-muted-foreground text-sm">Amount</span><div>₦{Number(tx.amount || 0).toLocaleString()}</div></div>
                <div><span className="text-muted-foreground text-sm">Status</span><div>{tx.status}</div></div>
                <div><span className="text-muted-foreground text-sm">Created</span><div>{new Date(tx.createdAt ? (tx.createdAt._seconds ? tx.createdAt._seconds * 1000 : tx.createdAt) : Date.now()).toLocaleString()}</div></div>
              </div>
              <div className="mt-4">
                <h3 className="text-lg font-semibold">Provider Status</h3>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div><span className="text-muted-foreground text-sm">Status</span><div>{tx.providerStatus || '-'}</div></div>
                  <div><span className="text-muted-foreground text-sm">Error Code</span><div>{tx.providerErrorCode || '-'}</div></div>
                  <div className="col-span-2"><span className="text-muted-foreground text-sm">Error Message</span><div className="font-mono text-xs break-all">{tx.providerErrorMessage || '-'}</div></div>
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-lg font-semibold">Provider Raw</h3>
                <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">{JSON.stringify(tx.providerRaw || {}, null, 2)}</pre>
              </div>
            </>
          ) : (
            <div className="p-2 text-sm text-muted-foreground">Not found</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
