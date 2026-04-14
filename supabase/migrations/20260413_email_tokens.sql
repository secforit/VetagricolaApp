do $$
begin
  create type public.email_token_type as enum ('verification', 'password_reset');
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.email_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  email text not null,
  token text not null unique,
  type public.email_token_type not null,
  used boolean not null default false,
  expires_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists email_tokens_user_id_idx on public.email_tokens (user_id);
create index if not exists email_tokens_type_idx on public.email_tokens (type);
