-- =========================================================
--  ConsertaConnect — dados de exemplo (OPCIONAL)
--  Rode DEPOIS de criar uma conta pelo app.
--  Substitui os dados do usuário logado no momento da execução.
-- =========================================================

do $$
declare
  uid uuid;
  c1 uuid;
  c2 uuid;
  c3 uuid;
  o1 uuid;
  o2 uuid;
  o3 uuid;
begin
  -- Pega o usuário mais recente (o que você acabou de cadastrar)
  select id into uid from auth.users order by created_at desc limit 1;

  if uid is null then
    raise notice 'Nenhum usuário encontrado. Cadastre-se no app primeiro.';
    return;
  end if;

  -- Limpa dados anteriores desse usuário
  delete from public.ordens   where user_id = uid;
  delete from public.clientes where user_id = uid;

  -- ---------- Clientes ----------
  insert into public.clientes (user_id, nome, telefone, email, cpf_cnpj, endereco)
  values (uid, 'Maria Silva', '(11) 98876-5432', 'maria@email.com', '123.456.789-00', 'Rua das Flores, 120 — São Paulo/SP')
  returning id into c1;

  insert into public.clientes (user_id, nome, telefone, email, endereco)
  values (uid, 'João Pereira', '(11) 97654-3210', 'joao.pereira@email.com', 'Av. Paulista, 900 — São Paulo/SP')
  returning id into c2;

  insert into public.clientes (user_id, nome, telefone)
  values (uid, 'Ana Costa', '(21) 96543-2109')
  returning id into c3;

  -- ---------- Ordens ----------
  insert into public.ordens
    (user_id, cliente_id, aparelho, marca, modelo, imei, defeito,
     status, prioridade, valor_pecas, valor_mao_obra, previsao_em)
  values
    (uid, c1, 'iPhone 13', 'Apple', 'A2633', '356789012345678',
     'Tela trincada após queda. Touch funcionando parcialmente.',
     'em_reparo', 'alta', 480.00, 120.00, current_date + 2)
  returning id into o1;

  insert into public.ordens
    (user_id, cliente_id, aparelho, marca, modelo, defeito,
     status, prioridade, valor_pecas, valor_mao_obra)
  values
    (uid, c2, 'Galaxy S22', 'Samsung', 'SM-S901E',
     'Não carrega. Suspeita de conector de carga oxidado.',
     'aguardando_peca', 'normal', 85.00, 60.00)
  returning id into o2;

  insert into public.ordens
    (user_id, cliente_id, aparelho, marca, modelo, defeito,
     status, prioridade, valor_pecas, valor_mao_obra, entregue_em)
  values
    (uid, c3, 'Notebook Dell Inspiron', 'Dell', '15 3520',
     'Superaquecimento e desligamento. Limpeza + troca de pasta térmica.',
     'entregue', 'baixa', 45.00, 150.00, now())
  returning id into o3;

  -- ---------- Itens ----------
  insert into public.os_itens (os_id, descricao, qtd, valor_unit) values
    (o1, 'Display iPhone 13 original', 1, 480.00),
    (o2, 'Conector de carga USB-C', 1, 85.00),
    (o3, 'Pasta térmica', 1, 45.00);

  raise notice 'Dados de exemplo criados para o usuário %', uid;
end $$;
