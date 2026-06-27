import dotenv from 'dotenv';
import path from 'path';

// Load .env from server root
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

export interface Config {
  port: number;
  nodeEnv: string;
  // Tenant
  tenantId: string;
  tenantName: string;
  // MSAL
  msal: {
    clientId: string;
    tenantId: string;
    clientSecret: string;
    redirectUri: string;
    authority: string;
  };
  // JWT
  jwt: {
    secret: string;
    expiresIn: string;
  };
  // Database
  db: {
    encryptionKey: string;
    path: string;
  };
  // Upload
  upload: {
    dir: string;
    maxFileSize: number;
  };
  // Email
  email: {
    host: string;
    port: number;
    user: string;
    pass: string;
    from: string;
  };
  // Federation
  federation: {
    role: 'hub' | 'spoke';
    apiKey: string;
    parentUrl?: string;
  };
  // CORS
  corsOrigins: string[];
}

function requiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optionalEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

export function loadConfig(): Config {
  return {
    port: parseInt(optionalEnv('PORT', '3001'), 10),
    nodeEnv: optionalEnv('NODE_ENV', 'development'),

    tenantId: requiredEnv('TENANT_ID'),
    tenantName: optionalEnv('TENANT_NAME', '未命名租户'),

    msal: {
      clientId: requiredEnv('MSAL_CLIENT_ID'),
      tenantId: requiredEnv('MSAL_TENANT_ID'),
      clientSecret: requiredEnv('MSAL_CLIENT_SECRET'),
      redirectUri: requiredEnv('MSAL_REDIRECT_URI'),
      authority: `https://login.microsoftonline.com/${requiredEnv('MSAL_TENANT_ID')}`,
    },

    jwt: {
      secret: requiredEnv('JWT_SECRET'),
      expiresIn: optionalEnv('JWT_EXPIRES_IN', '24h'),
    },

    db: {
      encryptionKey: requiredEnv('DB_ENCRYPTION_KEY'),
      path: optionalEnv('DB_PATH', './data/oa-local.db'),
    },

    upload: {
      dir: optionalEnv('UPLOAD_DIR', './uploads'),
      maxFileSize: parseInt(optionalEnv('MAX_FILE_SIZE', '10485760'), 10),
    },

    email: {
      host: optionalEnv('SMTP_HOST', 'smtp.office365.com'),
      port: parseInt(optionalEnv('SMTP_PORT', '587'), 10),
      user: optionalEnv('SMTP_USER', ''),
      pass: optionalEnv('SMTP_PASS', ''),
      from: optionalEnv('EMAIL_FROM', 'OA审批系统'),
    },

    federation: {
      role: (optionalEnv('FEDERATION_ROLE', 'hub') as 'hub' | 'spoke'),
      apiKey: optionalEnv('FEDERATION_API_KEY', 'sk-change-me'),
      parentUrl: process.env['PARENT_URL'],
    },

    corsOrigins: optionalEnv('CORS_ORIGINS', 'http://localhost:5173')
      .split(',')
      .map(s => s.trim()),
  };
}

// Singleton config instance
let _config: Config | null = null;

export function getConfig(): Config {
  if (!_config) {
    _config = loadConfig();
  }
  return _config;
}

export default getConfig;
