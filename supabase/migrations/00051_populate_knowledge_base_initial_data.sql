-- Populate knowledge base with common repair scenarios
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Get first admin user to attribute cases
  SELECT id INTO admin_user_id
  FROM profiles
  WHERE role = 'admin'
  ORDER BY created_at
  LIMIT 1;

  -- Add common repair scenarios from technical knowledge
  INSERT INTO ai_documented_cases (
    created_by,
    title,
    equipment_type,
    brand,
    problem_description,
    solution_description,
    tags,
    difficulty_level,
    estimated_time_minutes,
    estimated_cost,
    notes,
    is_active,
    is_verified,
    verified_by,
    verified_at
  )
  SELECT 
    admin_user_id,
    title,
    equipment_type,
    brand,
    problem_description,
    solution_description,
    tags,
    difficulty_level,
    estimated_time_minutes,
    estimated_cost,
    notes,
    true,
    true,
    admin_user_id,
    now()
  FROM (VALUES
    -- Notebooks
    ('Notebook não liga - LED pisca', 'Notebook', 'Dell', 
     'Notebook não liga, LED de energia pisca 3 vezes e apaga. Cliente relatou que estava funcionando normalmente até o dia anterior.',
     'Problema identificado: módulo de memória RAM desencaixado. Solução: Remoção e reencaixe correto dos módulos de RAM. Limpeza dos contatos com borracha. Teste de POST bem-sucedido. Equipamento ligando normalmente.',
     ARRAY['não liga', 'ram', 'memória', 'led piscando']::TEXT[],
     'easy', 15, 0.00,
     'Sempre verificar encaixe da RAM em casos de não ligar com LED piscando. Padrão de 3 piscadas geralmente indica problema de memória.'),
    
    ('Notebook superaquecendo e desligando', 'Notebook', 'HP',
     'Notebook desliga sozinho após 10-15 minutos de uso. Ventilador fazendo barulho alto. Cliente usa para trabalho e jogos.',
     'Diagnóstico: Sistema de refrigeração obstruído com poeira e pasta térmica ressecada. Solução: Desmontagem completa, limpeza do cooler e dissipador, aplicação de pasta térmica de qualidade, teste de stress. Temperaturas normalizadas (CPU: 45°C idle, 75°C load).',
     ARRAY['superaquecimento', 'desliga sozinho', 'cooler', 'pasta térmica']::TEXT[],
     'medium', 60, 80.00,
     'Recomendado limpeza preventiva a cada 6-12 meses dependendo do ambiente de uso.'),
    
    ('Tela de notebook quebrada', 'Notebook', 'Lenovo',
     'Tela LCD com rachaduras após queda. Display não mostra imagem, mas notebook liga (LED aceso e ventilador funcionando).',
     'Substituição do painel LCD. Verificação de cabo flat e conectores. Teste com tela externa confirmou funcionamento da GPU. Instalação de novo painel LCD compatível. Calibração de cores e teste de dead pixels.',
     ARRAY['tela quebrada', 'lcd', 'display', 'queda']::TEXT[],
     'hard', 120, 450.00,
     'Sempre testar com monitor externo antes de confirmar troca de tela. Verificar se é apenas o LCD ou se o digitalizador também foi danificado.'),

    ('Notebook lento - Windows travando', 'Notebook', 'Asus',
     'Notebook extremamente lento. Windows demora mais de 5 minutos para iniciar. Travamentos constantes ao abrir programas. Cliente usa para trabalho com planilhas e navegação.',
     'Diagnóstico: HD mecânico com setores ruins e fragmentação severa. Solução: Upgrade para SSD 240GB, clonagem do sistema, limpeza de arquivos temporários, desinstalação de programas desnecessários. Performance melhorou drasticamente (boot em 20 segundos).',
     ARRAY['lentidão', 'travando', 'hd', 'upgrade', 'ssd']::TEXT[],
     'medium', 75, 250.00,
     'SSD é o upgrade mais impactante para performance. Sempre verificar SMART status do HD em casos de lentidão.'),

    ('Notebook não reconhece bateria', 'Notebook', 'Acer',
     'Notebook só funciona conectado na tomada. Ícone mostra "Nenhuma bateria detectada". Bateria tem menos de 1 ano de uso.',
     'Diagnóstico: Conector da bateria oxidado. Limpeza dos contatos com álcool isopropílico e escova antiestática. Reset do EC (Embedded Controller). Atualização do BIOS. Bateria reconhecida e carregando normalmente.',
     ARRAY['bateria', 'não reconhece', 'conector', 'oxidação']::TEXT[],
     'easy', 25, 0.00,
     'Sempre tentar limpeza e reset do EC antes de condenar bateria ou placa-mãe.'),

    -- Smartphones
    ('iPhone não carrega - porta Lightning suja', 'Smartphone', 'Apple',
     'iPhone não carrega mais. Cliente tentou vários cabos e carregadores diferentes. Bateria em 15%.',
     'Inspeção da porta Lightning revelou acúmulo de sujeira e fiapos. Limpeza cuidadosa com palito de madeira e álcool isopropílico. Teste de carregamento bem-sucedido. Orientação ao cliente sobre limpeza preventiva.',
     ARRAY['não carrega', 'porta lightning', 'limpeza', 'carregamento']::TEXT[],
     'easy', 20, 50.00,
     'Problema muito comum. Sempre verificar porta de carregamento antes de diagnosticar problema de bateria ou placa.'),
    
    ('Samsung tela azul após atualização', 'Smartphone', 'Samsung',
     'Smartphone apresenta tela azul após atualização do sistema. Não passa da logo da Samsung. Cliente não consegue acessar dados.',
     'Boot em modo recovery. Limpeza de cache do sistema. Tentativa de reparo do sistema via Smart Switch falhou. Realizado factory reset via recovery mantendo dados em cartão SD. Reinstalação de apps. Sistema funcionando normalmente.',
     ARRAY['tela azul', 'bootloop', 'atualização', 'recovery']::TEXT[],
     'medium', 45, 100.00,
     'Sempre tentar limpeza de cache antes de factory reset. Orientar cliente sobre backup antes de atualizações.'),

    ('Smartphone molhou - não liga', 'Smartphone', 'Motorola',
     'Celular caiu na água. Cliente tentou ligar imediatamente. Agora não liga mais, não carrega, sem sinais de vida.',
     'Desmontagem completa. Identificado curto-circuito na placa. Limpeza ultrassônica com álcool isopropílico. Secagem em estufa 40°C por 24h. Substituição de componentes danificados (chip de carga). Teste completo de funções. Equipamento recuperado.',
     ARRAY['dano líquido', 'molhou', 'água', 'curto-circuito', 'oxidação']::TEXT[],
     'hard', 180, 280.00,
     'Orientar cliente a NUNCA tentar ligar equipamento molhado. Remover bateria imediatamente se possível. Tempo é crítico para recuperação.'),

    ('Xiaomi bateria viciada - desliga em 30%', 'Smartphone', 'Xiaomi',
     'Smartphone desliga sozinho quando bateria marca 30-40%. Após desligar, só liga conectado no carregador. Bateria com 2 anos de uso.',
     'Diagnóstico: Bateria com desgaste natural (ciclos de carga excedidos). Substituição por bateria original. Calibração do sistema de gerenciamento de energia. Teste de autonomia: 6 horas de uso misto.',
     ARRAY['bateria', 'desliga sozinho', 'viciada', 'calibração']::TEXT[],
     'medium', 40, 120.00,
     'Baterias têm vida útil de 2-3 anos. Orientar cliente sobre ciclos de carga e boas práticas.'),

    ('iPhone tela preta - backlight queimado', 'Smartphone', 'Apple',
     'iPhone liga (vibra ao receber chamadas) mas tela permanece preta. Ao iluminar com lanterna, é possível ver imagem muito fraca.',
     'Diagnóstico: Backlight da tela queimado. Substituição do display completo (LCD + backlight + digitalizador). Teste de todas as funções. Calibração do True Tone. Tela funcionando perfeitamente.',
     ARRAY['tela preta', 'backlight', 'display', 'troca de tela']::TEXT[],
     'hard', 90, 580.00,
     'Teste da lanterna confirma problema de backlight. Em iPhones, necessário trocar display completo.'),

    -- Desktops
    ('PC não liga - fonte queimada', 'Desktop', NULL,
     'Computador não liga. Sem LED, sem ventilador, completamente morto. Cliente relatou queda de energia antes do problema.',
     'Teste de fonte com multímetro: sem tensão. Fonte ATX queimada (capacitores estufados visíveis). Substituição por fonte de 500W 80 Plus. Teste de todos os componentes. Sistema funcionando normalmente. Recomendado uso de nobreak.',
     ARRAY['não liga', 'fonte queimada', 'queda de energia', 'capacitor']::TEXT[],
     'easy', 30, 180.00,
     'Sempre verificar fonte primeiro em casos de PC morto. Investir em nobreak previne 90% dos problemas de fonte.'),

    ('PC reiniciando sozinho - superaquecimento', 'Desktop', NULL,
     'Computador reinicia aleatoriamente durante uso, especialmente em jogos. Às vezes congela com tela azul. Gabinete muito quente ao toque.',
     'Diagnóstico: CPU superaquecendo (95°C em load). Cooler com poeira e pasta térmica ressecada. Limpeza completa do sistema, troca de pasta térmica, reorganização de cabos para melhor fluxo de ar. Temperaturas normalizadas (65°C em load).',
     ARRAY['reinicia sozinho', 'superaquecimento', 'tela azul', 'cooler']::TEXT[],
     'medium', 50, 60.00,
     'Superaquecimento é causa comum de reinicializações. Monitorar temperaturas com HWMonitor.'),

    ('PC com tela azul - memória RAM defeituosa', 'Desktop', NULL,
     'Computador apresenta telas azuis frequentes com diferentes códigos de erro. Problema começou após instalação de novo módulo de RAM.',
     'Teste com Memtest86: múltiplos erros detectados no novo módulo. Remoção do módulo defeituoso. Teste de estabilidade por 24h sem erros. Orientação sobre garantia do módulo.',
     ARRAY['tela azul', 'ram', 'memória', 'memtest']::TEXT[],
     'easy', 35, 0.00,
     'Sempre testar RAM com Memtest86 em casos de instabilidade. Testar módulos individualmente.'),

    ('PC não dá vídeo - placa de vídeo com problema', 'Desktop', NULL,
     'Computador liga (ventoinhas giram, LEDs acendem) mas não aparece imagem no monitor. Sem beeps. Monitor testado em outro PC funciona.',
     'Diagnóstico: Placa de vídeo não está sendo detectada. Limpeza dos contatos do slot PCIe e da placa. Teste em outro slot PCIe: mesmo problema. Teste com outra placa de vídeo: funcionou. Placa de vídeo defeituosa (GPU queimada). Recomendada substituição.',
     ARRAY['não dá vídeo', 'placa de vídeo', 'gpu', 'sem imagem']::TEXT[],
     'medium', 45, 0.00,
     'Sempre testar com outra placa de vídeo ou vídeo onboard para confirmar diagnóstico.'),

    -- Tablets
    ('iPad tela não responde ao toque', 'Tablet', 'Apple',
     'iPad Pro tela não responde ao toque após queda. Display mostra imagem normalmente mas digitalizador não funciona.',
     'Diagnóstico: Digitalizador danificado, LCD intacto. Substituição do conjunto tela + digitalizador. Calibração do touch. Teste de sensibilidade em todos os pontos. Aplicação de película de vidro temperado.',
     ARRAY['tela', 'touch', 'digitalizador', 'não responde']::TEXT[],
     'hard', 150, 680.00,
     'Em iPads, geralmente é necessário trocar o conjunto completo. Trabalho delicado devido à cola e risco de quebrar o LCD.'),

    ('Tablet não liga - bateria descarregada profundamente', 'Tablet', 'Samsung',
     'Tablet Galaxy Tab não liga, não carrega, LED não acende. Cliente deixou guardado por 6 meses sem usar.',
     'Diagnóstico: Bateria em descarga profunda (0V). Carregamento forçado com fonte de bancada por 30 minutos. Após recuperação inicial, carregamento normal por 4 horas. Tablet ligando e funcionando. Orientação sobre armazenamento.',
     ARRAY['não liga', 'bateria', 'descarga profunda', 'não carrega']::TEXT[],
     'medium', 60, 80.00,
     'Baterias em descarga profunda podem ser recuperadas com carregamento forçado. Orientar sobre armazenamento com 50% de carga.')

  ) AS common_cases(title, equipment_type, brand, problem_description, solution_description, tags, difficulty_level, estimated_time_minutes, estimated_cost, notes)
  WHERE NOT EXISTS (
    SELECT 1 FROM ai_documented_cases
    WHERE ai_documented_cases.title = common_cases.title
  );

END $$;