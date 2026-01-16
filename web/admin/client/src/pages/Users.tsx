import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Search, UserPlus, Filter } from "lucide-react";
import { listUsers, promoteAdmin, suspendUser, deleteUser, updateUserPassword, debitWallet } from "@/lib/backend";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { InputGroup } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { createUser } from "@/lib/backend";
import { createAdmin } from "@/lib/backend";
import { useLocation } from "wouter";
import { Checkbox } from "@/components/ui/checkbox";
import { Input as RawInput } from "@/components/ui/input";

export default function UsersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const data = await listUsers(100);
        if (!mounted) return;
        setUsers(data);
      } catch (e) {
        // ignore
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const reloadUsers = async () => {
    setLoading(true);
    try {
      const data = await listUsers(100);
      setUsers(data);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(user =>
      String(user.displayName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(user.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(user.phone || '').includes(searchTerm)
    );
  }, [users, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">User Management</h2>
          <p className="text-muted-foreground">Manage and view all registered users.</p>
        </div>
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button className="shadow-lg shadow-primary/20">
                <UserPlus className="mr-2 h-4 w-4" />
                Add New User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
              </DialogHeader>
              <AddUserForm onDone={async () => { await reloadUsers(); }} />
            </DialogContent>
          </Dialog>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="shadow">
                <UserPlus className="mr-2 h-4 w-4" />
                Add Admin
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create Admin Account</DialogTitle>
              </DialogHeader>
              <AddAdminForm />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            A list of all users including their name, email, balance, and status.
          </CardDescription>
          <div className="flex items-center gap-2 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading users...</div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Wallet Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id} className="group">
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium group-hover:text-primary transition-colors">{user.displayName || user.fullName || user.email || user.uid}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{user.email || ''}</TableCell>
                  <TableCell>{user.phone || '-'}</TableCell>
                  <TableCell>{user.joinedAt ? new Date(user.joinedAt).toLocaleDateString() : '-'}</TableCell>
                  <TableCell className="font-medium">₦{Number(user.walletBalance || 0).toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={user.status === 'inactive' ? 'secondary' : 'default'} className={user.status !== 'inactive' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}>
                      {user.status === 'inactive' ? 'inactive' : 'active'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() => {
                            setLocation("/profile");
                          }}
                        >
                          View Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            const qs = new URLSearchParams({
                              uid: String(user.uid || user.id || ""),
                              email: String(user.email || "")
                            }).toString();
                            setLocation(`/transactions?${qs}`);
                          }}
                        >
                          View Transactions
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            const userId = String(user.email || user.uid || user.id || "");
                            const qs = new URLSearchParams({ userId }).toString();
                            setLocation(`/wallet?${qs}`);
                          }}
                        >
                          Fund Wallet
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={async () => {
                            try {
                              const res = await promoteAdmin({ uid: user.uid || user.id, email: user.email });
                              toast({ title: 'Promoted to Admin', description: res.email || user.email });
                              await reloadUsers();
                            } catch (e: any) {
                              toast({ title: 'Promotion Failed', description: e.message || 'Unable to promote', variant: 'destructive' });
                            }
                          }}
                        >
                          Make Admin
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={async () => {
                            try {
                              const res = await suspendUser({ uid: user.uid || user.id, email: user.email, suspend: !(user.status === 'inactive') });
                              toast({ title: res.disabled ? 'User Suspended' : 'User Reinstated', description: res.email || user.email });
                              await reloadUsers();
                            } catch (e: any) {
                              toast({ title: 'Suspend Failed', description: e.message || 'Unable to suspend', variant: 'destructive' });
                            }
                          }}
                        >
                          {user.status === 'inactive' ? 'Reinstate User' : 'Suspend User'}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={async () => {
                            const pwd = prompt('Enter new password for user');
                            if (!pwd) return;
                            try {
                              const res = await updateUserPassword({ uid: user.uid || user.id, email: user.email, password: pwd });
                              toast({ title: 'Password Updated', description: res.email || user.email });
                              await reloadUsers();
                            } catch (e: any) {
                              toast({ title: 'Update Failed', description: e.message || 'Unable to update', variant: 'destructive' });
                            }
                          }}
                        >
                          Change Password
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={async () => {
                            const amtStr = prompt('Enter amount to debit (₦)');
                            const amt = Number(amtStr || '0');
                            if (!amt || amt <= 0) return;
                            try {
                              const res = await debitWallet({ userId: user.email || user.uid || user.id, amount: amt, walletType: "main", description: "Admin debit" });
                              toast({ title: 'Wallet Debited', description: `New balance: ₦${Number(res.newBalance || 0).toLocaleString()}` });
                              await reloadUsers();
                            } catch (e: any) {
                              toast({ title: 'Debit Failed', description: e.message || 'Unable to debit', variant: 'destructive' });
                            }
                          }}
                        >
                          Debit Wallet
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={async () => {
                            const confirmDelete = confirm(`Delete user ${user.email}? This cannot be undone.`);
                            if (!confirmDelete) return;
                            try {
                              const res = await deleteUser({ uid: user.uid || user.id, email: user.email });
                              toast({ title: 'User Deleted', description: res.email || user.email });
                              await reloadUsers();
                            } catch (e: any) {
                              toast({ title: 'Delete Failed', description: e.message || 'Unable to delete', variant: 'destructive' });
                            }
                          }}
                        >
                          Remove User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AddUserForm({ onDone }: { onDone: () => void }) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [requireVerification, setRequireVerification] = useState(false);
  const [verificationLink, setVerificationLink] = useState<string | undefined>(undefined);
  const [redirectUrl, setRedirectUrl] = useState("https://osghub.com/login");
  return (
    <div className="space-y-4">
      <InputGroup>
        <Label>Email</Label>
        <Input placeholder="user@example.com" value={email} onChange={e => setEmail(e.target.value)} />
      </InputGroup>
      <InputGroup>
        <Label>Password</Label>
        <Input type="password" placeholder="At least 6 characters" value={password} onChange={e => setPassword(e.target.value)} />
      </InputGroup>
      <InputGroup>
        <Label>Display Name</Label>
        <Input placeholder="Full name" value={displayName} onChange={e => setDisplayName(e.target.value)} />
      </InputGroup>
      <InputGroup>
        <Label>Phone Number</Label>
        <Input placeholder="+234..." value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} />
      </InputGroup>
      <div className="flex items-center gap-3">
        <Checkbox id="requireVerification" checked={requireVerification} onCheckedChange={(v) => setRequireVerification(Boolean(v))} />
        <Label htmlFor="requireVerification">Require email verification</Label>
      </div>
      {requireVerification && (
        <InputGroup>
          <Label>Redirect URL</Label>
          <RawInput placeholder="https://osghub.com/login" value={redirectUrl} onChange={e => setRedirectUrl(e.target.value)} />
        </InputGroup>
      )}
      {verificationLink ? (
        <div className="space-y-2">
          <Label>Verification Link</Label>
          <div className="flex items-center gap-2">
            <RawInput readOnly value={verificationLink} />
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(verificationLink || "");
                toast({ title: "Link copied", description: "Verification link copied to clipboard" });
              }}
            >
              Copy
            </Button>
          </div>
        </div>
      ) : null}
      <div className="flex justify-end">
        <Button
          disabled={saving}
          onClick={async () => {
            if (!email || !password) {
              toast({ title: "Missing fields", description: "Email and password are required", variant: "destructive" });
              return;
            }
            setSaving(true);
            try {
              const res = await createUser({ email, password, displayName, phoneNumber, requireVerification, redirectUrl });
              toast({ title: "User Created", description: res.email || email });
              if (res.verificationLink) {
                setVerificationLink(res.verificationLink);
                toast({ title: "Verification Required", description: "Copy and send the verification link to the user" });
              } else {
                setVerificationLink(undefined);
              }
              onDone();
            } catch (e: any) {
              toast({ title: "Create Failed", description: e.message || "Unable to create", variant: "destructive" });
            } finally {
              setSaving(false);
            }
          }}
        >
          Create User
        </Button>
      </div>
    </div>
  );
}

function AddAdminForm() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  return (
    <div className="space-y-4">
      <InputGroup>
        <Label>Email</Label>
        <Input placeholder="admin@example.com" value={email} onChange={e => setEmail(e.target.value)} />
      </InputGroup>
      <InputGroup>
        <Label>Password</Label>
        <Input type="password" placeholder="At least 6 characters" value={password} onChange={e => setPassword(e.target.value)} />
      </InputGroup>
      <InputGroup>
        <Label>Display Name</Label>
        <Input placeholder="Admin name" value={displayName} onChange={e => setDisplayName(e.target.value)} />
      </InputGroup>
      <div className="flex justify-end">
        <Button
          disabled={saving}
          onClick={async () => {
            if (!email || !password) {
              toast({ title: "Missing fields", description: "Email and password are required", variant: "destructive" });
              return;
            }
            setSaving(true);
            try {
              const res = await createAdmin({ email, password, displayName });
              toast({ title: "Admin Created", description: res.email || email });
            } catch (e: any) {
              toast({ title: "Create Failed", description: e.message || "Unable to create", variant: "destructive" });
            } finally {
              setSaving(false);
            }
          }}
        >
          Create Admin
        </Button>
      </div>
    </div>
  );
}
