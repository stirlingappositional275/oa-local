import React from 'react';
import { loginWithMicrosoft } from '../auth/MsalProvider';
import { t, getLang, toggleLang } from '../i18n';

export default function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center relative" style={{background:'linear-gradient(170deg,#1e1b4b,#312e81,#4338ca,#6366f1)'}}>
      {/* Language toggle */}
      <button onClick={toggleLang} className="absolute top-4 right-4 text-white/50 hover:text-white/80 text-xs font-medium transition-colors">
        {getLang() === 'zh' ? 'EN' : '中文'}
      </button>
      <div className="mx-4 w-full max-w-sm" style={{
        background:'rgba(255,255,255,0.92)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
        borderRadius:26, padding:'36px 28px', textAlign:'center',
        boxShadow:'0 24px 60px rgba(0,0,0,0.25), 0 0 0 0.5px rgba(255,255,255,0.2)'
      }}>
        <div style={{width:60,height:60,borderRadius:16,background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
          display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',fontSize:28,
          boxShadow:'0 8px 24px rgba(99,102,241,0.4)'}}>📋</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">{t('appName')}</h1>
        <p className="text-sm text-gray-400 mb-6">{t('login')}</p>

        <button onClick={loginWithMicrosoft} className="w-full flex items-center justify-center gap-2 text-white font-semibold rounded-xl py-3.5"
          style={{background:'#1d1d1f',boxShadow:'0 4px 14px rgba(0,0,0,0.12)'}}>
          <svg width="21" height="21" viewBox="0 0 21 21"><rect x="1" y="1" width="9" height="9" fill="#f25022"/><rect x="11" y="1" width="9" height="9" fill="#7fba00"/><rect x="1" y="11" width="9" height="9" fill="#00a4ef"/><rect x="11" y="11" width="9" height="9" fill="#ffb900"/></svg>
          {t('login')}
        </button>
        <p className="text-xs text-gray-400 mt-4">{t('loginFooter')}</p>
      </div>
    </div>
  );
}
