import { supabase } from '@/db/supabase';

// ============================================
// VISITOR & SESSION MANAGEMENT
// ============================================

/**
 * Obter ou criar ID único do visitante (armazenado em localStorage)
 * Não contém PII, apenas UUID aleatório
 */
export function getOrCreateVisitorId(): string {
  const VISITOR_KEY = 'analytics_visitor_id';
  
  let visitorId = localStorage.getItem(VISITOR_KEY);
  
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    localStorage.setItem(VISITOR_KEY, visitorId);
  }
  
  return visitorId;
}

/**
 * Obter ou criar ID da sessão (armazenado em sessionStorage)
 * Nova sessão a cada vez que o navegador é fechado/aberto
 */
export function getSessionId(): string {
  const SESSION_KEY = 'analytics_session_id';
  
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  
  return sessionId;
}

// ============================================
// TRAFFIC SOURCE DETECTION
// ============================================

/**
 * Detectar origem do tráfego baseado em referrer e UTM
 */
export function detectTrafficSource(): string {
  const urlParams = new URLSearchParams(window.location.search);
  const utmSource = urlParams.get('utm_source')?.toLowerCase();
  const referrer = document.referrer.toLowerCase();

  // Verificar UTM source primeiro
  if (utmSource) {
    if (utmSource.includes('google')) return 'google';
    if (utmSource.includes('instagram') || utmSource.includes('ig')) return 'instagram';
    if (utmSource.includes('facebook') || utmSource.includes('fb')) return 'facebook';
    if (utmSource.includes('whatsapp') || utmSource.includes('wa')) return 'whatsapp';
    return 'other';
  }

  // Verificar referrer
  if (!referrer || referrer === '') return 'direct';
  
  if (referrer.includes('google.com') || referrer.includes('google.com.br')) return 'google';
  if (referrer.includes('instagram.com')) return 'instagram';
  if (referrer.includes('facebook.com') || referrer.includes('fb.com')) return 'facebook';
  if (referrer.includes('whatsapp.com') || referrer.includes('wa.me')) return 'whatsapp';
  if (referrer.includes('t.co') || referrer.includes('twitter.com')) return 'twitter';
  if (referrer.includes('linkedin.com')) return 'linkedin';
  
  // Se vier de outro domínio
  const currentDomain = window.location.hostname;
  if (!referrer.includes(currentDomain)) return 'other';
  
  return 'direct';
}

/**
 * Extrair parâmetros UTM da URL
 */
export function getUtmParams() {
  const urlParams = new URLSearchParams(window.location.search);
  
  return {
    utm_source: urlParams.get('utm_source') || null,
    utm_medium: urlParams.get('utm_medium') || null,
    utm_campaign: urlParams.get('utm_campaign') || null,
  };
}

/**
 * Detectar se é bot baseado em user agent
 */
export function isBot(): boolean {
  const userAgent = navigator.userAgent.toLowerCase();
  const botPatterns = [
    'bot', 'crawler', 'spider', 'scraper', 'curl', 'wget',
    'googlebot', 'bingbot', 'slurp', 'duckduckbot', 'baiduspider',
    'yandexbot', 'facebookexternalhit', 'whatsapp', 'telegram'
  ];
  
  return botPatterns.some(pattern => userAgent.includes(pattern));
}

/**
 * Detectar tipo de dispositivo
 */
export function getDeviceType(): string {
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(userAgent)) {
    return 'tablet';
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(userAgent)) {
    return 'mobile';
  }
  return 'desktop';
}

/**
 * Obter nome do navegador
 */
export function getBrowser(): string {
  const userAgent = navigator.userAgent;
  
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) return 'Chrome';
  if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
  if (userAgent.includes('Edg')) return 'Edge';
  if (userAgent.includes('Opera') || userAgent.includes('OPR')) return 'Opera';
  
  return 'Other';
}

/**
 * Obter geolocalização do visitante via IP
 * Usa API gratuita ip-api.com (45 requisições/minuto)
 */
export async function getGeolocation(): Promise<{ city: string | null; country: string | null }> {
  try {
    const response = await fetch('https://ipapi.co/json/', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('[ANALYTICS] Erro ao buscar geolocalização:', response.status);
      return { city: null, country: null };
    }

    const data = await response.json();

    return {
      city: data.city || null,
      country: data.country_name || null,
    };
  } catch (error) {
    console.error('[ANALYTICS] Erro ao buscar geolocalização:', error);
    return { city: null, country: null };
  }
}

// ============================================
// SESSION TRACKING
// ============================================

let sessionStartTime: number | null = null;
let lastActivityTime: number | null = null;
let durationUpdateInterval: NodeJS.Timeout | null = null;

/**
 * Iniciar rastreamento de sessão
 */
export async function trackSessionStart(): Promise<boolean> {
  try {
    // Verificar se já iniciou sessão
    const SESSION_STARTED_KEY = 'analytics_session_started';
    if (sessionStorage.getItem(SESSION_STARTED_KEY) === 'true') {
      return true; // Já iniciado
    }

    const sessionId = getSessionId();
    const visitorId = getOrCreateVisitorId();
    const sourceType = detectTrafficSource();
    const utmParams = getUtmParams();
    const deviceType = getDeviceType();
    const browser = getBrowser();
    const isBotUser = isBot();

    // Obter geolocalização (cidade e país)
    const location = await getGeolocation();

    // Inserir sessão
    const { error: sessionError } = await supabase
      .from('analytics_sessions')
      .insert({
        session_id: sessionId,
        visitor_id: visitorId,
        first_visit: new Date().toISOString(),
        last_activity: new Date().toISOString(),
        page_count: 1,
        duration_seconds: 0,
        is_bot: isBotUser,
        device_type: deviceType,
        browser: browser,
        city: location.city,
        country: location.country,
        referrer: document.referrer || null,
        user_agent: navigator.userAgent,
        page_entry: window.location.pathname,
      });

    if (sessionError) {
      console.error('[ANALYTICS] Erro ao inserir sessão:', sessionError);
      return false;
    }

    // Inserir origem de tráfego
    const { error: sourceError } = await supabase
      .from('analytics_sources')
      .insert({
        session_id: sessionId,
        source_type: sourceType,
        utm_source: utmParams.utm_source,
        utm_medium: utmParams.utm_medium,
        utm_campaign: utmParams.utm_campaign,
        referrer: document.referrer || null,
      });

    if (sourceError) {
      console.error('[ANALYTICS] Erro ao inserir origem:', sourceError);
    }

    // Marcar sessão como iniciada
    sessionStorage.setItem(SESSION_STARTED_KEY, 'true');
    sessionStartTime = Date.now();
    lastActivityTime = Date.now();

    // Iniciar heartbeat para atualizar duração
    startDurationHeartbeat();

    return true;
  } catch (error) {
    console.error('[ANALYTICS] Erro ao iniciar sessão:', error);
    return false;
  }
}

/**
 * Iniciar heartbeat para atualizar duração da sessão
 */
function startDurationHeartbeat() {
  // Limpar interval anterior se existir
  if (durationUpdateInterval) {
    clearInterval(durationUpdateInterval);
  }

  // Atualizar duração a cada 5 segundos quando aba está visível
  durationUpdateInterval = setInterval(() => {
    if (document.visibilityState === 'visible') {
      updateSessionDuration();
    }
  }, 5000);

  // Atualizar ao sair da página
  window.addEventListener('beforeunload', () => {
    updateSessionDuration();
  });

  // Atualizar quando aba fica visível novamente
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      lastActivityTime = Date.now();
    } else {
      updateSessionDuration();
    }
  });
}

/**
 * Atualizar duração da sessão
 */
async function updateSessionDuration() {
  if (!sessionStartTime || !lastActivityTime) return;

  const sessionId = getSessionId();
  const durationSeconds = Math.floor((Date.now() - sessionStartTime) / 1000);

  const { error } = await supabase
    .from('analytics_sessions')
    .update({
      duration_seconds: durationSeconds,
      last_activity: new Date().toISOString(),
    })
    .eq('session_id', sessionId);

  if (error) {
    console.error('[ANALYTICS] Erro ao atualizar duração:', error);
  }
}

// ============================================
// PAGE VIEW TRACKING
// ============================================

const trackedPages = new Set<string>();

/**
 * Rastrear visualização de página
 */
export async function trackPageView(path: string, title: string): Promise<boolean> {
  try {
    const sessionId = getSessionId();
    const visitorId = getOrCreateVisitorId();

    // Evitar duplicação na mesma sessão
    const pageKey = `${sessionId}-${path}`;
    if (trackedPages.has(pageKey)) {
      return true; // Já rastreado
    }

    const { error } = await supabase
      .from('analytics_pageviews')
      .insert({
        session_id: sessionId,
        visitor_id: visitorId,
        page_path: path,
        page_title: title,
        time_on_page: 0,
      });

    if (error) {
      console.error('[ANALYTICS] Erro ao rastrear pageview:', error);
      return false;
    }

    trackedPages.add(pageKey);

    // Atualizar contagem de páginas na sessão
    const { error: updateError } = await supabase.rpc('increment_page_count', {
      p_session_id: sessionId,
    });

    if (updateError) {
      console.error('[ANALYTICS] Erro ao incrementar page_count:', updateError);
    }

    return true;
  } catch (error) {
    console.error('[ANALYTICS] Erro ao rastrear pageview:', error);
    return false;
  }
}

// ============================================
// EVENT TRACKING
// ============================================

const trackedEvents = new Set<string>();

/**
 * Rastrear evento (clique em botão de contato, etc)
 */
export async function trackEvent(
  eventType: string,
  eventLabel?: string,
  pagePath?: string
): Promise<boolean> {
  try {
    const sessionId = getSessionId();
    const visitorId = getOrCreateVisitorId();

    // Evitar duplicação de eventos na mesma sessão
    const eventKey = `${sessionId}-${eventType}-${eventLabel || ''}`;
    if (trackedEvents.has(eventKey)) {
      return true; // Já rastreado
    }

    const { error } = await supabase
      .from('analytics_events')
      .insert({
        session_id: sessionId,
        visitor_id: visitorId,
        event_type: eventType,
        event_label: eventLabel || null,
        page_path: pagePath || window.location.pathname,
      });

    if (error) {
      console.error('[ANALYTICS] Erro ao rastrear evento:', error);
      return false;
    }

    trackedEvents.add(eventKey);
    return true;
  } catch (error) {
    console.error('[ANALYTICS] Erro ao rastrear evento:', error);
    return false;
  }
}

/**
 * Configurar rastreamento automático de cliques em links de contato
 */
export function setupClickTracking() {
  // Event delegation para capturar cliques em qualquer elemento
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    
    // Verificar se é link, botão ou elemento clicável
    const clickable = target.closest('a, button, [role="button"], [onclick]');
    if (!clickable) return;

    const href = clickable.getAttribute('href') || '';
    const dataEvent = clickable.getAttribute('data-analytics-event');
    const textContent = clickable.textContent?.toLowerCase() || '';
    const ariaLabel = clickable.getAttribute('aria-label')?.toLowerCase() || '';
    const title = clickable.getAttribute('title')?.toLowerCase() || '';
    
    // Combinar todos os textos para detecção
    const allText = `${textContent} ${ariaLabel} ${title}`.toLowerCase();

    // Rastrear cliques em WhatsApp
    if (
      href.includes('wa.me') || 
      href.includes('whatsapp') || 
      href.includes('api.whatsapp.com') ||
      dataEvent === 'whatsapp_click' ||
      allText.includes('whatsapp') ||
      allText.includes('zap')
    ) {
      trackEvent('whatsapp_click', 'WhatsApp Contact');
    }
    // Rastrear cliques em telefone
    else if (
      href.startsWith('tel:') || 
      dataEvent === 'phone_click' ||
      allText.includes('ligar') ||
      allText.includes('telefone') ||
      allText.includes('phone')
    ) {
      trackEvent('phone_click', 'Phone Contact');
    }
    // Rastrear cliques em email
    else if (
      href.startsWith('mailto:') || 
      dataEvent === 'email_click' ||
      allText.includes('email') ||
      allText.includes('e-mail')
    ) {
      trackEvent('email_click', 'Email Contact');
    }
    // Rastrear cliques em Instagram
    else if (
      href.includes('instagram.com') || 
      href.includes('instagr.am') ||
      dataEvent === 'instagram_click' ||
      allText.includes('instagram') ||
      allText.includes('insta')
    ) {
      trackEvent('instagram_click', 'Instagram Profile');
    }
    // Rastrear cliques em Facebook
    else if (
      href.includes('facebook.com') || 
      href.includes('fb.com') ||
      dataEvent === 'facebook_click' ||
      allText.includes('facebook')
    ) {
      trackEvent('facebook_click', 'Facebook Profile');
    }
    // Rastrear cliques em orçamento/agendamento
    else if (
      dataEvent === 'budget_click' ||
      allText.includes('orçamento') ||
      allText.includes('orcamento') ||
      allText.includes('solicitar') ||
      allText.includes('agendar') ||
      allText.includes('consulta') ||
      allText.includes('budget') ||
      allText.includes('quote')
    ) {
      trackEvent('budget_click', 'Budget Request');
    }
    // Rastrear cliques em login/área do cliente
    else if (
      href.includes('/login') ||
      href.includes('/client') ||
      allText.includes('login') ||
      allText.includes('entrar') ||
      allText.includes('área do cliente') ||
      allText.includes('minha conta')
    ) {
      trackEvent('login_click', 'Login Access');
    }
  });
}
