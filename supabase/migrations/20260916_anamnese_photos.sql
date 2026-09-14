-- ============================================================================
-- Fotos de avaliação postural na anamnese (frente, costas, lateral E/D)
-- ============================================================================
-- Tiradas/enviadas pelo profissional durante a entrevista (não pelo aluno no
-- link público). Bucket PRIVADO — são fotos do corpo do aluno, dado sensível.
-- Acesso só via URL assinada (createSignedUrl), nunca link público direto.
--
-- Caminho do arquivo no storage: "{establishment_id}/{health_form_id}/{angulo}-{timestamp}.jpg"
-- — o primeiro segmento (establishment_id) é o que as policies conferem.
--
-- Rode este bloco INTEIRO no SQL Editor do Supabase.

-- Colunas com o caminho de cada foto (null = ainda não enviada)
alter table health_forms add column if not exists photo_frente text;
alter table health_forms add column if not exists photo_costas text;
alter table health_forms add column if not exists photo_lateral_esq text;
alter table health_forms add column if not exists photo_lateral_dir text;

-- Bucket privado (public = false)
insert into storage.buckets (id, name, public)
values ('anamnese-fotos', 'anamnese-fotos', false)
on conflict (id) do nothing;

-- Dono: acesso total às fotos dos próprios estabelecimentos
drop policy if exists "owner_all_anamnese_fotos" on storage.objects;
create policy "owner_all_anamnese_fotos" on storage.objects for all using (
  bucket_id = 'anamnese-fotos'
  and (storage.foldername(name))[1]::uuid in (select id from establishments where owner_id = auth.uid())
) with check (
  bucket_id = 'anamnese-fotos'
  and (storage.foldername(name))[1]::uuid in (select id from establishments where owner_id = auth.uid())
);

-- Superadmin: acesso total
drop policy if exists "admin_all_anamnese_fotos" on storage.objects;
create policy "admin_all_anamnese_fotos" on storage.objects for all using (
  bucket_id = 'anamnese-fotos' and is_super_admin()
) with check (
  bucket_id = 'anamnese-fotos' and is_super_admin()
);

-- Professor (login visualizador): também pode tirar/enviar e ver as fotos
-- da entrevista — mesmo critério já usado para o resto da anamnese.
drop policy if exists "member_read_anamnese_fotos" on storage.objects;
create policy "member_read_anamnese_fotos" on storage.objects for select using (
  bucket_id = 'anamnese-fotos' and is_member((storage.foldername(name))[1]::uuid)
);

drop policy if exists "member_write_anamnese_fotos" on storage.objects;
create policy "member_write_anamnese_fotos" on storage.objects for insert to authenticated with check (
  bucket_id = 'anamnese-fotos' and is_member((storage.foldername(name))[1]::uuid)
);

drop policy if exists "member_update_anamnese_fotos" on storage.objects;
create policy "member_update_anamnese_fotos" on storage.objects for update using (
  bucket_id = 'anamnese-fotos' and is_member((storage.foldername(name))[1]::uuid)
);

drop policy if exists "member_delete_anamnese_fotos" on storage.objects;
create policy "member_delete_anamnese_fotos" on storage.objects for delete using (
  bucket_id = 'anamnese-fotos' and is_member((storage.foldername(name))[1]::uuid)
);
