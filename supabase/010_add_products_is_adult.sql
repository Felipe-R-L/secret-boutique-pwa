-- Flag de conteúdo adulto por produto.
-- Default TRUE: todo produto cadastrado é considerado +18 até que o admin
-- desmarque. Produtos com is_adult = false aparecem no catálogo livre (SFW)
-- exibido a visitantes que se declaram menores de 18 anos.
alter table public.products
  add column if not exists is_adult boolean not null default true;
