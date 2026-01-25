#!/usr/bin/env node

/**
 * Test script for AI Knowledge Query Edge Function
 * 
 * Usage: node test-ai-knowledge-query.js
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing environment variables');
  console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testOpenOSMode() {
  console.log('\n🧪 Test 1: OPEN_OS mode with detailed description');
  console.log('='.repeat(60));
  
  const { data, error } = await supabase.functions.invoke('ai-knowledge-query', {
    body: {
      text: "tela não liga e bateria não carrega",
      equipamento_tipo: "Celular",
      marca: "Samsung",
      modelo: "Galaxy S21",
      context: {
        mode: 'OPEN_OS',
      },
    },
  });

  if (error) {
    console.error('❌ Error:', error);
    if (error.context) {
      try {
        const errorText = await error.context.text();
        console.error('Detailed Error:', errorText);
      } catch (e) {
        console.error('Could not read error context');
      }
    }
    return false;
  }

  console.log('✅ Response received');
  console.log('Mode:', data.mode);
  console.log('Fallback reason:', data.meta?.fallback_reason || 'none');
  console.log('Used web:', data.meta?.used_web);
  console.log('Processing time:', data.meta?.processing_time_ms + 'ms');
  
  if (data.suggestions) {
    console.log('\n📋 Suggestions:');
    console.log('  Category:', data.suggestions.suggested_category);
    console.log('  Description:', data.suggestions.organized_description?.substring(0, 50) + '...');
    console.log('  Checklist items:', data.suggestions.initial_checklist?.length || 0);
    console.log('  Questions:', data.suggestions.clarification_questions?.length || 0);
    
    if (data.suggestions.initial_checklist?.length > 0) {
      console.log('\n  First checklist item:', data.suggestions.initial_checklist[0]);
    }
  } else {
    console.log('❌ No suggestions returned!');
    return false;
  }
  
  if (data.knowledge?.term_definitions?.length > 0) {
    console.log('\n📚 Term Definitions:');
    data.knowledge.term_definitions.forEach(term => {
      console.log(`  - ${term.term}:`);
      if (term.definition_web) {
        console.log(`    Web: ${term.definition_web.substring(0, 80)}...`);
        console.log(`    Source: ${term.definition_web_source || 'N/A'}`);
      }
      if (term.definition_internal) {
        console.log(`    Internal: ${term.definition_internal.substring(0, 80)}...`);
      }
    });
  }
  
  return true;
}

async function testShortText() {
  console.log('\n🧪 Test 2: OPEN_OS mode with short text');
  console.log('='.repeat(60));
  
  const { data, error } = await supabase.functions.invoke('ai-knowledge-query', {
    body: {
      text: "tela",
      equipamento_tipo: "Celular",
      context: {
        mode: 'OPEN_OS',
      },
    },
  });

  if (error) {
    console.error('❌ Error:', error);
    return false;
  }

  console.log('✅ Response received');
  
  if (data.suggestions) {
    console.log('✅ Suggestions present even with short text');
    console.log('  Category:', data.suggestions.suggested_category);
    console.log('  Checklist items:', data.suggestions.initial_checklist?.length || 0);
  } else {
    console.log('❌ No suggestions returned for short text!');
    return false;
  }
  
  return true;
}

async function testInOSMode() {
  console.log('\n🧪 Test 3: IN_OS mode (diagnostic)');
  console.log('='.repeat(60));
  
  const { data, error } = await supabase.functions.invoke('ai-knowledge-query', {
    body: {
      text: "equipamento não liga após queda",
      equipamento_tipo: "Notebook",
      marca: "Dell",
      modelo: "Inspiron 15",
      context: {
        mode: 'IN_OS',
        os_id: '00000000-0000-0000-0000-000000000000', // Fake UUID for testing
      },
    },
  });

  if (error) {
    console.error('❌ Error:', error);
    return false;
  }

  console.log('✅ Response received');
  console.log('Mode:', data.mode);
  
  if (data.diagnosis) {
    console.log('\n🔍 Diagnosis:');
    console.log('  Complexity:', data.diagnosis.complexity);
    console.log('  Estimated time:', data.diagnosis.estimated_time);
    console.log('  Probable causes:', data.diagnosis.probable_causes?.length || 0);
    console.log('  Suggested tests:', data.diagnosis.suggested_tests?.length || 0);
    
    if (data.diagnosis.probable_causes?.length > 0) {
      console.log('\n  Top cause:', data.diagnosis.probable_causes[0].description);
      console.log('  Probability:', data.diagnosis.probable_causes[0].probability + '%');
    }
  } else {
    console.log('❌ No diagnosis returned!');
    return false;
  }
  
  return true;
}

async function testWebEnrichment() {
  console.log('\n🧪 Test 4: Web enrichment');
  console.log('='.repeat(60));
  
  // First, check if WEB_ENABLED is true
  const { data: configData } = await supabase
    .from('ai_config')
    .select('config_value')
    .eq('config_key', 'WEB_ENABLED')
    .maybeSingle();
  
  console.log('WEB_ENABLED:', configData?.config_value || 'not set');
  
  const { data, error } = await supabase.functions.invoke('ai-knowledge-query', {
    body: {
      text: "problema no backlight e oxidação na placa",
      equipamento_tipo: "Notebook",
      context: {
        mode: 'OPEN_OS',
      },
    },
  });

  if (error) {
    console.error('❌ Error:', error);
    return false;
  }

  console.log('✅ Response received');
  console.log('Used web:', data.meta?.used_web);
  
  if (data.knowledge?.term_definitions?.length > 0) {
    console.log('\n📚 Found', data.knowledge.term_definitions.length, 'term definitions');
    
    const webDefinitions = data.knowledge.term_definitions.filter(t => t.definition_web);
    console.log('  With web definitions:', webDefinitions.length);
    
    if (webDefinitions.length > 0) {
      console.log('\n  Example:');
      console.log('  Term:', webDefinitions[0].term);
      console.log('  Source:', webDefinitions[0].definition_web_source || 'N/A');
    }
  }
  
  return true;
}

async function runAllTests() {
  console.log('🚀 Starting AI Knowledge Query Tests');
  console.log('Supabase URL:', SUPABASE_URL);
  console.log('='.repeat(60));
  
  const results = [];
  
  results.push(await testOpenOSMode());
  results.push(await testShortText());
  results.push(await testInOSMode());
  results.push(await testWebEnrichment());
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Results Summary');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${total - passed}/${total}`);
  
  if (passed === total) {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Check the output above for details.');
    process.exit(1);
  }
}

runAllTests().catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});
