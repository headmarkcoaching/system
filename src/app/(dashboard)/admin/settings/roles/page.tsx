import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import * as staffService from "@/lib/services/staff";

export default async function RolesPage() {
  const roles = await staffService.listRolesWithPermissions();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles & Permissions"
        description="Every role and the permissions seeded for it. Fine-grained permission editing arrives in a later phase — access today is enforced by role."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {roles.map((role) => (
          <Card key={role.id}>
            <CardHeader>
              <CardTitle>{role.name}</CardTitle>
              {role.description && <CardDescription>{role.description}</CardDescription>}
            </CardHeader>
            <CardContent>
              {role.rolePermissions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No specific permissions seeded — access is granted implicitly by role.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {role.rolePermissions.map((rp) => (
                    <Badge key={rp.id} variant="secondary">
                      {rp.permission.code}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
