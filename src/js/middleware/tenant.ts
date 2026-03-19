declare const __BRAND_NAME__: string;

export interface TenantConfig {
  id: string;
  name: string;
  logo?: string;
  primaryColor?: string;
  plan: 'starter' | 'professional' | 'enterprise';
  features: string[];
}

export interface TenantContext {
  tenantId: string;
  config: TenantConfig;
}

const PLAN_FEATURES: Record<string, string[]> = {
  starter: ['merge', 'split', 'rotate', 'compress', 'jpg-to-pdf'],
  professional: [
    'merge',
    'split',
    'rotate',
    'compress',
    'jpg-to-pdf',
    'ocr',
    'sign',
    'pdf-to-docx',
    'redact',
  ],
  enterprise: ['*'],
};

let tenantContext: TenantContext | null = null;

function extractTenantId(): string {
  const parts = window.location.hostname.split('.');
  // kunde.wirespice.com → 'kunde'; localhost / wirespice.com → 'default'
  if (parts.length >= 3) return parts[0];
  return 'default';
}

async function fetchTenantConfig(tenantId: string): Promise<TenantConfig> {
  const apiBase = (import.meta as any).env?.VITE_TENANT_API_URL as
    | string
    | undefined;

  if (apiBase && tenantId !== 'default') {
    try {
      const res = await fetch(`${apiBase}/tenants/${tenantId}/config`);
      if (res.ok) return await res.json();
      console.warn(
        `[tenant] API returned ${res.status} for tenant "${tenantId}"`
      );
    } catch (err) {
      console.warn(
        '[tenant] Failed to fetch tenant config, using defaults:',
        err
      );
    }
  }

  const defaultName =
    typeof __BRAND_NAME__ !== 'undefined' && __BRAND_NAME__
      ? __BRAND_NAME__
      : 'SwissPDF';

  return {
    id: tenantId,
    name: defaultName,
    plan: 'starter',
    features: PLAN_FEATURES.starter,
  };
}

function applyBranding(config: TenantConfig): void {
  if (config.name) {
    // Replace leading app name in <title> (e.g. "BentoPDF - Merge PDF" → "Acme - Merge PDF")
    document.title = document.title.replace(/^[^–\-]+[-–]/, `${config.name} -`);

    document.querySelectorAll('[data-brand-name]').forEach((el) => {
      (el as HTMLElement).textContent = config.name;
    });
  }

  if (config.logo) {
    document
      .querySelectorAll<HTMLImageElement>('[data-brand-logo]')
      .forEach((el) => {
        el.src = config.logo!;
      });
  }

  if (config.primaryColor) {
    document.documentElement.style.setProperty(
      '--color-primary',
      config.primaryColor
    );
  }
}

export async function initTenant(): Promise<TenantContext> {
  const tenantId = extractTenantId();
  const config = await fetchTenantConfig(tenantId);
  // Expand plan features if not explicitly set by API
  if (!config.features?.length) {
    config.features = PLAN_FEATURES[config.plan] ?? PLAN_FEATURES.starter;
  }
  tenantContext = { tenantId, config };
  applyBranding(config);
  return tenantContext;
}

export function getTenant(): TenantContext | null {
  return tenantContext;
}

/** Returns true if the current tenant's plan includes the given feature key. */
export function hasFeature(feature: string): boolean {
  if (!tenantContext) return false;
  const { features } = tenantContext.config;
  return features.includes('*') || features.includes(feature);
}
