import { Button } from "@/components/ui/button";
import {
  listAdminUsers,
  removeAdminUser,
  updateStoreSettings,
  upsertAdminUser,
} from "@/lib/actions/admin";
import { requireAdminContext } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";

export default async function AdminSettingsPage() {
  const context = await requireAdminContext();

  const supabase = await createClient();
  const { data: storeSettings } = await supabase
    .from("store_settings")
    .select("hero_title,hero_subtitle")
    .eq("id", 1)
    .maybeSingle();

  const usersResult = await listAdminUsers();
  const users = usersResult.ok ? usersResult.data : [];

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Configuracoes da Loja</h2>
        <p className="text-sm text-muted-foreground">
          Hero da home e controle de acessos administrativos.
        </p>
      </div>

      <form
        action={async (formData) => {
          "use server";
          await updateStoreSettings({
            heroTitle: String(formData.get("heroTitle") ?? ""),
            heroSubtitle: String(formData.get("heroSubtitle") ?? ""),
          });
        }}
        className="space-y-3 rounded-xl border border-border p-4"
      >
        <input
          name="heroTitle"
          defaultValue={storeSettings?.hero_title ?? ""}
          placeholder="Titulo do hero"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          required
        />

        <textarea
          name="heroSubtitle"
          defaultValue={storeSettings?.hero_subtitle ?? ""}
          placeholder="Subtitulo do hero"
          className="min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          required
        />

        <Button type="submit">Salvar configuracoes</Button>
      </form>

      {context.role === "ADMIN" && (
        <>
          {!usersResult.ok && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              Nao foi possivel carregar usuarios administrativos:{" "}
              {usersResult.error}
            </p>
          )}

          <form
            action={async (formData) => {
              "use server";
              await upsertAdminUser({
                id: String(formData.get("id") ?? ""),
                email: String(formData.get("email") ?? ""),
                role: String(formData.get("role") ?? "STAFF"),
              });
            }}
            className="grid gap-3 rounded-xl border border-border p-4 md:grid-cols-3"
          >
            <input
              name="id"
              placeholder="UUID do usuario"
              required
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
            <input
              name="email"
              type="email"
              placeholder="Email"
              required
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
            <select
              name="role"
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              defaultValue="STAFF"
            >
              <option value="ADMIN">ADMIN</option>
              <option value="STAFF">STAFF</option>
            </select>
            <div className="md:col-span-3">
              <Button type="submit" variant="secondary">
                Adicionar ou atualizar admin
              </Button>
            </div>
          </form>

          <div className="space-y-2 rounded-xl border border-border p-4">
            <h3 className="font-medium">Usuarios administrativos</h3>
            {(users ?? []).map((user) => (
              <div
                key={user.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3"
              >
                <p className="text-sm">
                  {user.email} ({user.role})
                </p>

                {user.id !== context.userId && (
                  <form
                    action={async () => {
                      "use server";
                      await removeAdminUser({ id: user.id });
                    }}
                  >
                    <Button type="submit" size="sm" variant="outline">
                      Remover
                    </Button>
                  </form>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
