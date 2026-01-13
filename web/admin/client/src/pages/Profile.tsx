import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { auth } from "@/lib/firebase";

export default function ProfilePage() {
  const user = auth.currentUser || {};

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
              <span className="font-medium capitalize">{user.role || 'Super Admin'}</span>
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
                <Input defaultValue={user.displayName || "Admin User"} />
              </div>
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input defaultValue="08012345678" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input defaultValue={user.email} disabled className="bg-muted" />
            </div>
          </CardContent>
          <CardFooter className="bg-muted/30 border-t py-4">
            <Button>Save Changes</Button>
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
                <Input type="password" />
              </div>
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input type="password" />
              </div>
              <div className="space-y-2">
                <Label>Confirm Password</Label>
                <Input type="password" />
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/30 border-t py-4">
             <Button variant="outline">Update Password</Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
