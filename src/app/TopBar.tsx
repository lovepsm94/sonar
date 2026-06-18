'use client';
import { useI18n } from './i18n/I18nContext';

export function TopBar() {
  const { lang, setLang } = useI18n();
  return (
    /*
      .topbar:
        position:absolute; top:52px; left:18px; right:18px; z-index:25;
        display:flex; align-items:center; justify-content:space-between;
        font-family:var(--font-mono); font-size:10px; letter-spacing:.18em;
        color:var(--muted); text-transform:uppercase;
    */
    <div className="app-topbar absolute top-[52px] left-[18px] right-[18px] z-[25] flex items-center justify-between font-mono text-[10px] tracking-[.18em] text-muted uppercase">
      <span>
        {/*
          .dot:
            width:6px; height:6px; border-radius:50%; background:var(--accent);
            box-shadow:0 0 8px var(--accent); display:inline-block; margin-right:6px;
            animation:pulse 2s ease-in-out infinite; vertical-align:middle;
        */}
        <span className="inline-block align-middle w-[6px] h-[6px] rounded-full bg-accent shadow-[0_0_8px_var(--accent)] mr-[6px] animate-pulse" />
        SONAR · P2P
      </span>
      {/*
        .lang:
          display:flex; border:1px solid var(--line); border-radius:999px;
          overflow:hidden; font-family:var(--font-mono); font-size:10px; letter-spacing:.12em;
        .lang button: background:transparent; border:0; color:var(--muted); padding:4px 9px;
          cursor:pointer; font:inherit; transition:.2s;
        .lang button.on: background:var(--accent); color:#04130c; font-weight:700;
      */}
      <div className="flex border border-line rounded-full overflow-hidden font-mono text-[10px] tracking-[.12em]">
        <button
          className={`bg-transparent border-0 text-muted px-[9px] py-[4px] cursor-pointer font-[inherit] transition-[background,color] duration-200${lang === 'vi' ? ' !bg-accent !text-[#04130c] font-bold' : ''}`}
          onClick={() => setLang('vi')}
        >VI</button>
        <button
          className={`bg-transparent border-0 text-muted px-[9px] py-[4px] cursor-pointer font-[inherit] transition-[background,color] duration-200${lang === 'en' ? ' !bg-accent !text-[#04130c] font-bold' : ''}`}
          onClick={() => setLang('en')}
        >EN</button>
      </div>
    </div>
  );
}
