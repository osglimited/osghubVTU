import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { updateAdminProfile, changeAdminPassword } from "@/lib/backend";

export default function ProfilePage() {
  const user = auth.currentUser || {};
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState((user as any).displayName || "");
  const [phoneNumber, setPhoneNumber] = useState((user as any).phoneNumber || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const handleUpdateProfile = async () => {
    setIsUpdatingProfile(true);
    try {
      await updateAdminProfile({ displayName, phoneNumber });
      toast({ title: "Profile updated", description: "Your changes have been saved." });
    } catch (e: any) {
      toast({ title: "Update failed", description: e.message || "An error occurred", variant: "destructive" });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords mismatch", description: "New password and confirmation do not match.", variant: "destructive" });
      return;
    }
    setIsUpdatingPassword(true);
    try {
      await changeAdminPassword({ currentPassword, newPassword });
      toast({ title: "Password updated", description: "Your password has been changed successfully." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e: any) {
      toast({ title: "Update failed", description: e.message || "An error occurred", variant: "destructive" });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Admin Profile</h2>
        <p className="text-muted-foreground">Manage your account settings and preferences.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-none shadow-sm md:col-span-1">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 relative">
              <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                <AvatarImage src={(user as any).photoURL || ""} />
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground font-bold">
                  {String((user as any).displayName || (user as any).email || "A").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            <CardTitle>{(user as any).displayName || 'Admin User'}</CardTitle>
            <CardDescription>{(user as any).email || ''}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between py-2 border-b text-sm">
              <span className="text-muted-foreground">Role</span>
              <span className="font-medium capitalize">{(user as any).role || 'Super Admin'}</span>
            </div>
            <div className="flex justify-between py-2 border-b text-sm">
              <span className="text-muted-foreground">Status</span>
              <span className="font-medium text-emerald-600">Active</span>
            </div>
            <div className="flex justify-between py-2 text-sm">
              <span className="text-muted-foreground">Last Login</span>
              <span className="font-medium">Just now</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm md:col-span-2">
          <CardHeader>
            <CardTitle>Edit Profile</CardTitle>
            <CardDescription>Update your personal information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Admin User" />
              </div>
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="08012345678" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input value={(user as any).email || ""} disabled className="bg-muted" />
            </div>
          </CardContent>
          <CardFooter className="bg-muted/30 border-t py-4">
            <Button onClick={handleUpdateProfile} disabled={isUpdatingProfile}>
              {isUpdatingProfile ? "Saving..." : "Save Changes"}
            </Button>
          </CardFooter>
        </Card>

        <Card className="border-none shadow-sm md:col-span-3">
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>Change your password.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Current Password</Label>
                <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Confirm Password</Label>
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/30 border-t py-4">
             <Button onClick={handleChangePassword} disabled={isUpdatingPassword} variant="outline">
               {isUpdatingPassword ? "Updating..." : "Update Password"}
             </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

