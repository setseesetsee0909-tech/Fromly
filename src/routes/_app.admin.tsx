import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/formly/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, ShieldAlert, Eye, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/admin")({
  head: () => ({ meta: [{ title: "Админ — Formly" }] }),
  component: Admin,
});

interface SurveyRow {
  id: string;
  title: string;
  is_published: boolean;
  created_at: string;
  owner_id: string;
}
interface ProfileRow {
  user_id: string;
  display_name: string | null;
  created_at: string;
}

function Admin() {
  const { isAdmin, loading } = useAuth();
  const [surveys, setSurveys] = useState<SurveyRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [busy, setBusy] = useState(true);

  const load = async () => {
    const [s, p] = await Promise.all([
      supabase.from("surveys").select("id, title, is_published, created_at, owner_id").order("created_at", { ascending: false }),
      supabase.from("profiles").select("user_id, display_name, created_at").order("created_at", { ascending: false }),
    ]);
    setSurveys(s.data ?? []);
    setProfiles(p.data ?? []);
    setBusy(false);
  };

  useEffect(() => {
    if (!isAdmin) return;
    void load();
  }, [isAdmin]);

  const removeSurvey = async (s: SurveyRow) => {
    if (!confirm(`"${s.title}" устгах уу?`)) return;
    const { error } = await supabase.from("surveys").delete().eq("id", s.id);
    if (error) return toast.error(error.message);
    toast.success("Устгалаа");
    void load();
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  if (!isAdmin) {
    return (
      <Card className="mx-auto max-w-md p-8 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
        <h2 className="mt-3 text-lg font-semibold">Хандах эрхгүй</h2>
        <p className="mt-1 text-sm text-muted-foreground">Зөвхөн админ хэрэглэгч хандах боломжтой.</p>
        <Button asChild className="mt-4"><Link to="/dashboard">Буцах</Link></Button>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Админ самбар</h1>
        <p className="text-sm text-muted-foreground">Admin Panel</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Нийт хэрэглэгч</p>
          <p className="mt-1 text-3xl font-bold">{profiles.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Нийт судалгаа</p>
          <p className="mt-1 text-3xl font-bold">{surveys.length}</p>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold">Хэрэглэгчид</h2>
        {busy ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Нэр</TableHead>
                <TableHead>User ID</TableHead>
                <TableHead>Бүртгүүлсэн</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((p) => (
                <TableRow key={p.user_id}>
                  <TableCell className="font-medium">{p.display_name || "—"}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{p.user_id.slice(0, 8)}…</TableCell>
                  <TableCell className="text-sm">{new Date(p.created_at).toLocaleDateString("mn-MN")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold">Бүх судалгаа</h2>
        {busy ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Гарчиг</TableHead>
                <TableHead>Төлөв</TableHead>
                <TableHead>Огноо</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {surveys.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.title}</TableCell>
                  <TableCell>
                    <Badge variant={s.is_published ? "default" : "secondary"}>
                      {s.is_published ? "Нийт" : "Ноорог"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{new Date(s.created_at).toLocaleDateString("mn-MN")}</TableCell>
                  <TableCell>
                    <div className="flex gap-1.5">
                      <Button asChild size="sm" variant="outline">
                        <Link to="/surveys/$id/analytics" params={{ id: s.id }}>
                          <Eye className="mr-1.5 h-3.5 w-3.5" /> Үзэх
                        </Link>
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => removeSurvey(s)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}