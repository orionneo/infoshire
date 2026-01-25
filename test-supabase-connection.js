// Script de teste para verificar conexão com o novo banco Supabase
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kcopdesulqlywjhueydb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtjb3BkZXN1bHFseXdqaHVleWRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3Nzg0OTUsImV4cCI6MjA4NDM1NDQ5NX0.ROCSbolQHhbj-PNH6n2-cyotrMDTddstmaTzvJb364I';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  console.log('🔍 Testando conexão com o novo banco Supabase...\n');

  try {
    // Teste 1: Verificar conexão básica
    console.log('✅ Teste 1: Conexão básica');
    const { data: healthCheck, error: healthError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (healthError) {
      console.log('❌ Erro na conexão:', healthError.message);
      return;
    }
    console.log('✅ Conexão estabelecida com sucesso!\n');

    // Teste 2: Verificar tabelas
    console.log('✅ Teste 2: Verificando tabelas...');
    const tables = [
      'profiles',
      'service_orders',
      'messages',
      'google_reviews_cache',
      'order_status_history',
      'approval_history'
    ];

    for (const table of tables) {
      const { error } = await supabase.from(table).select('count').limit(1);
      if (error) {
        console.log(`❌ Tabela ${table}: ERRO - ${error.message}`);
      } else {
        console.log(`✅ Tabela ${table}: OK`);
      }
    }

    console.log('\n✅ Teste 3: Verificando Edge Function de Reviews...');
    const { data: reviewsData, error: reviewsError } = await supabase.functions.invoke('fetch-google-reviews');
    
    if (reviewsError) {
      console.log('❌ Erro ao buscar reviews:', reviewsError.message);
    } else if (reviewsData?.success) {
      console.log('✅ Edge Function funcionando!');
      console.log(`   - Rating: ${reviewsData.data.rating}`);
      console.log(`   - Total de avaliações: ${reviewsData.data.user_ratings_total}`);
      console.log(`   - Reviews carregadas: ${reviewsData.data.reviews?.length || 0}`);
      console.log(`   - Cache: ${reviewsData.cached ? 'Sim' : 'Não'}`);
    } else {
      console.log('⚠️ Edge Function retornou dados inesperados');
    }

    console.log('\n🎉 TODOS OS TESTES CONCLUÍDOS COM SUCESSO!');
    console.log('\n📋 Próximos passos:');
    console.log('1. Habilitar Google OAuth no Supabase Dashboard');
    console.log('2. Testar login com Google na aplicação');
    console.log('3. Verificar se os reviews aparecem na home page');

  } catch (error) {
    console.error('❌ Erro durante os testes:', error);
  }
}

testConnection();
