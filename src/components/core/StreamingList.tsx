import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Menu, Play, Film, Clock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { StreamingPlatform, Anime } from '@/types';
import './StreamingList.css';

const GlobeIcon = ({ size = 13 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ display: 'inline-block', verticalAlign: 'middle', color: '#38bdf8' }}
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
    <path d="M2 12h20" />
  </svg>
);

interface StreamingListProps {
  streamings?: StreamingPlatform[];
  anime?: Anime;
}

const FREE_SITES = new Set([
  'gamer', 'gamer_hk', 'muse_tw', 'muse_hk',
  'ani_one', 'ani_one_asia', 'tropics', 'youtube',
  'linetv', 'abema', 'bilibili_tw', 'bilibili_hk_mo_tw', 'bilibili'
]);

const MAJOR_PAID_SITES = new Set([
  'netflix', 'disneyplus', 'prime', 'prime_video', 'amazon_prime_video', 'crunchyroll'
]);

const SITE_DOMAINS: Record<string, string> = {
  gamer: 'ani.gamer.com.tw',
  gamer_hk: 'ani.gamer.com.tw',
  netflix: 'www.netflix.com',
  disneyplus: 'www.disneyplus.com',
  prime: 'www.primevideo.com',
  prime_video: 'www.primevideo.com',
  amazon_prime_video: 'www.primevideo.com',
  bilibili: 'www.bilibili.com',
  bilibili_tw: 'www.bilibili.com',
  bilibili_hk_mo_tw: 'www.bilibili.com',
  bilibili_hk_mo: 'www.bilibili.com',
  kktv: 'www.kktv.me',
  linetv: 'www.linetv.tw',
  friday: 'video.friday.tw',
  myvideo: 'www.myvideo.net.tw',
  hamivideo: 'hamivideo.hinet.net',
  iqiyi: 'www.iq.com',
  crunchyroll: 'www.crunchyroll.com',
  youtube: 'www.youtube.com',
  muse_tw: 'www.youtube.com',
  muse_hk: 'www.youtube.com',
  ani_one: 'www.youtube.com',
  ani_one_asia: 'www.youtube.com',
  tropics: 'www.youtube.com',
  viu: 'www.viu.com',
  mytv: 'www.mytvsuper.com',
  abema: 'abema.tv',
  nicovideo: 'www.nicovideo.jp',
  danime: 'animestore.docomo.ne.jp',
  unext: 'video.unext.jp'
};

const SITE_ICONS: Record<string, string> = {};

const PlatformLogoImage: React.FC<{ site: string; fallback: React.ReactNode }> = ({ site, fallback }) => {
  const [imgError, setImgError] = useState(false);
  const domain = SITE_DOMAINS[site];
  const customIconUrl = SITE_ICONS[site];
  const iconUrl = customIconUrl || (domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : null);

  if (!iconUrl || imgError) {
    return <>{fallback}</>;
  }

  return (
    <img
      src={iconUrl}
      alt={site}
      className={`platform-favicon-img favicon-${site}`}
      onError={() => setImgError(true)}
    />
  );
};

export const StreamingList: React.FC<StreamingListProps> = ({ streamings, anime }) => {
  const { t, language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastOpenedTimeRef = useRef<number>(0);

  const formatPremiereDate = () => {
    if (!anime) return null;
    const sd = (anime as any).startDate;
    if (sd && typeof sd === 'object' && sd.year) {
      if (sd.month && sd.day) {
        const d = new Date(sd.year, sd.month - 1, sd.day);
        return d.toLocaleDateString(language === 'en' ? 'en-US' : language === 'ja' ? 'ja-JP' : 'zh-TW', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
      }
      return `${sd.year}`;
    }
    return null;
  };

  const premiereStr = formatPremiereDate() || anime?.yearSeason;

  useEffect(() => {
    const el = popoverRef.current;
    if (!el || !isOpen) return;

    const handleWheel = (e: WheelEvent) => {
      const list = el.querySelector('.streaming-popover-list') as HTMLElement | null;
      if (!list) {
        e.preventDefault();
        return;
      }

      const { scrollTop, scrollHeight, clientHeight } = list;
      const isScrollable = scrollHeight > clientHeight;
      if (!isScrollable) {
        e.preventDefault();
        return;
      }

      const isScrollingDown = e.deltaY > 0;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;
      const isAtTop = scrollTop <= 0;

      if ((isScrollingDown && isAtBottom) || (!isScrollingDown && isAtTop)) {
        e.preventDefault();
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, [isOpen]);

  if (!streamings || streamings.length === 0) {
    return null;
  }

  // 1. 合併重複網站 (特別是 動畫瘋 台灣與港澳合併為 台港澳)
  const mergedMap = new Map<string, StreamingPlatform>();
  streamings.forEach(st => {
    // 只要名稱是動畫瘋就統一用同一筆紀錄
    const key = st.name === '動畫瘋' ? 'gamer_merged' : `${st.site}_${st.url}`;
    if (mergedMap.has(key)) {
      const existing = mergedMap.get(key)!;
      if (st.name === '動畫瘋' && existing.region !== st.region) {
        existing.region = '台港澳';
      }
    } else {
      mergedMap.set(key, { ...st });
    }
  });

  const processedStreamings = Array.from(mergedMap.values());

  // 2. 三層級排序：免費(0) > 超級大串流訂閱制(1) > 在地付費平台(2)
  const sortedStreamings = processedStreamings.sort((a, b) => {
    const getTier = (site: string) => {
      if (FREE_SITES.has(site)) return 0;
      if (MAJOR_PAID_SITES.has(site)) return 1;
      return 2;
    };

    const tierA = getTier(a.site);
    const tierB = getTier(b.site);
    if (tierA !== tierB) return tierA - tierB;

    if (tierA === 1) {
      const getPlatformOrder = (site: string) => {
        if (site === 'netflix') return 1;
        if (site === 'disneyplus') return 2;
        return 3;
      };
      const orderA = getPlatformOrder(a.site);
      const orderB = getPlatformOrder(b.site);
      if (orderA !== orderB) return orderA - orderB;
    }

    const regionPriority: Record<string, number> = { '台灣': 1, '台港澳': 2, '港澳台': 3, '亞洲': 4, '全球': 5, '港澳': 6, '日本': 7 };
    return (regionPriority[a.region] || 99) - (regionPriority[b.region] || 99);
  });

  const openPopover = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const scrollY = window.scrollY || window.pageYOffset || 0;
      const scrollX = window.scrollX || window.pageXOffset || 0;

      const popoverWidth = 220;
      let left = scrollX + rect.right - popoverWidth;
      if (left < scrollX + 10) {
        left = scrollX + 10;
      }
      if (left + popoverWidth > scrollX + window.innerWidth - 10) {
        left = scrollX + Math.max(10, window.innerWidth - popoverWidth - 10);
      }

      const top = scrollY + rect.bottom + 4;

      setPopoverPos({ top, left });
      setIsOpen(true);
      lastOpenedTimeRef.current = Date.now();
    }
  };

  const handleMouseEnter = () => {
    openPopover();
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    // 將關閉延遲從 250ms 縮減至極短的 60ms (人類視覺無感知延遲)，既能支援滑鼠過渡到選單也能立刻消失
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 60);
  };

  const renderRegionDisplay = (region: string) => {
    switch (region) {
      case '台灣':
      case '台港澳':
      case '港澳台':
        return <span className="region-flag" title="Taiwan">TW</span>;
      case '港澳':
        return <span className="region-flag" title="Hong Kong">HK</span>;
      case '日本':
        return <span className="region-flag" title="Japan">JP</span>;
      case '大陸':
      case '中國':
        return <span className="region-flag" title="China">CN</span>;
      case '亞洲':
      case '全球':
      default:
        return (
          <span className="region-globe-wrapper" title="Global">
            <GlobeIcon size={14} />
          </span>
        );
    }
  };

  const getPlatformIcon = (site: string) => {
    let fallback: React.ReactNode;
    switch (site) {
      case 'gamer':
      case 'gamer_hk':
        fallback = (
          <span className="platform-icon gamer-icon">
            <Play size={10} fill="currentColor" />
          </span>
        );
        break;
      case 'netflix':
        fallback = <span className="platform-icon netflix-icon">N</span>;
        break;
      case 'disneyplus':
        fallback = <span className="platform-icon disney-icon">D+</span>;
        break;
      case 'prime':
      case 'prime_video':
      case 'amazon_prime_video':
        fallback = <span className="platform-icon prime-icon">pv</span>;
        break;
      case 'bilibili':
      case 'bilibili_tw':
      case 'bilibili_hk_mo_tw':
      case 'bilibili_hk_mo':
        fallback = <span className="platform-icon bilibili-icon">B</span>;
        break;
      case 'kktv':
        fallback = <span className="platform-icon kktv-icon">K</span>;
        break;
      case 'linetv':
        fallback = <span className="platform-icon linetv-icon">L</span>;
        break;
      case 'friday':
        fallback = <span className="platform-icon friday-icon">f</span>;
        break;
      case 'myvideo':
        fallback = <span className="platform-icon myvideo-icon">M</span>;
        break;
      case 'hamivideo':
        fallback = <span className="platform-icon hamivideo-icon">H</span>;
        break;
      case 'iqiyi':
        fallback = <span className="platform-icon iqiyi-icon">iQ</span>;
        break;
      case 'crunchyroll':
        fallback = <span className="platform-icon crunchy-icon">C</span>;
        break;
      case 'youtube':
      case 'muse_tw':
      case 'muse_hk':
      case 'ani_one':
      case 'ani_one_asia':
      case 'tropics':
        fallback = <span className="platform-icon youtube-icon"><Play size={10} fill="currentColor" /></span>;
        break;
      case 'viu':
        fallback = <span className="platform-icon viu-icon">V</span>;
        break;
      case 'mytv':
        fallback = <span className="platform-icon mytv-icon">my</span>;
        break;
      case 'abema':
        fallback = <span className="platform-icon abema-icon">A</span>;
        break;
      case 'nicovideo':
        fallback = <span className="platform-icon nico-icon">N</span>;
        break;
      case 'danime':
        fallback = <span className="platform-icon danime-icon">d</span>;
        break;
      case 'unext':
        fallback = <span className="platform-icon unext-icon">U</span>;
        break;
      default:
        fallback = <span className="platform-icon default-icon"><Film size={11} /></span>;
        break;
    }
    return <PlatformLogoImage site={site} fallback={fallback} />;
  };

  return (
    <div 
      className="streaming-circle-wrapper"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button 
        ref={buttonRef}
        type="button" 
        className={`streaming-circle-btn ${isOpen ? 'active' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          const now = Date.now();
          // 若為手機觸控設備剛由 mouseEnter 打開 (350ms 內)，忽略合成 click 關閉
          if (isOpen && now - lastOpenedTimeRef.current < 350) {
            return;
          }
          if (isOpen) {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            setIsOpen(false);
          } else {
            openPopover();
          }
        }}
        title={t('officialStreamingTitle')}
      >
        <Menu size={16} />
      </button>

      {isOpen && createPortal(
        <div 
          ref={popoverRef}
          className="streaming-popover glassmorphism"
          style={{ top: `${popoverPos.top}px`, left: `${popoverPos.left}px` }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="streaming-popover-header">
            <Menu size={14} />
            <span>{t('officialStreaming')} ({sortedStreamings.length})</span>
          </div>
          <div className="streaming-popover-list">
            {sortedStreamings.map((st, idx) => {
              const isFree = FREE_SITES.has(st.site);
              return (
                <a
                  key={`${st.site}-${idx}`}
                  href={st.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="streaming-popover-item"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="streaming-item-left">
                    {getPlatformIcon(st.site)}
                    <span className="streaming-item-name">{st.name}</span>
                  </div>
                  <div className="streaming-item-right">
                    {isFree && <span className="free-badge">{t('freeBadge')}</span>}
                    {renderRegionDisplay(st.region)}
                  </div>
                </a>
              );
            })}
          </div>
          {premiereStr && (
            <div className="streaming-popover-footer">
              <Clock size={12} />
              <span>{t('premiere')}: {premiereStr}</span>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
};
