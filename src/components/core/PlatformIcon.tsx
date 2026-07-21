import React, { useState } from 'react';
import { Play, Film } from 'lucide-react';
import './StreamingList.css';

export const SITE_DOMAINS: Record<string, string> = {
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

export const PlatformLogoImage: React.FC<{ site: string; fallback: React.ReactNode; size?: number }> = ({ site, fallback, size }) => {
  const [imgError, setImgError] = useState(false);
  const domain = SITE_DOMAINS[site];
  const customIconUrl = SITE_ICONS[site];
  const iconUrl = customIconUrl || (domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : null);

  if (!iconUrl || imgError) {
    return <>{fallback}</>;
  }

  const style = size ? { width: size, height: size } : undefined;

  return (
    <img
      src={iconUrl}
      alt={site}
      className={`platform-favicon-img favicon-${site}`}
      style={style}
      onError={() => setImgError(true)}
    />
  );
};

export const getPlatformIcon = (site: string, size?: number) => {
  let fallback: React.ReactNode;
  const style = size ? { width: size, height: size, fontSize: size * 0.5 } : undefined;
  const iconSize = size ? size * 0.6 : 11;
  const ytSize = size ? size * 0.55 : 10;
  switch (site) {
    case 'gamer':
    case 'gamer_hk':
      fallback = (
        <span className="platform-icon gamer-icon" style={style}>
          <Play size={ytSize} fill="currentColor" />
        </span>
      );
      break;
    case 'netflix':
      fallback = <span className="platform-icon netflix-icon" style={style}>N</span>;
      break;
    case 'disneyplus':
      fallback = <span className="platform-icon disney-icon" style={style}>D+</span>;
      break;
    case 'prime':
    case 'prime_video':
    case 'amazon_prime_video':
      fallback = <span className="platform-icon prime-icon" style={style}>pv</span>;
      break;
    case 'bilibili':
    case 'bilibili_tw':
    case 'bilibili_hk_mo_tw':
    case 'bilibili_hk_mo':
      fallback = <span className="platform-icon bilibili-icon" style={style}>B</span>;
      break;
    case 'kktv':
      fallback = <span className="platform-icon kktv-icon" style={style}>K</span>;
      break;
    case 'linetv':
      fallback = <span className="platform-icon linetv-icon" style={style}>L</span>;
      break;
    case 'friday':
      fallback = <span className="platform-icon friday-icon" style={style}>f</span>;
      break;
    case 'myvideo':
      fallback = <span className="platform-icon myvideo-icon" style={style}>M</span>;
      break;
    case 'hamivideo':
      fallback = <span className="platform-icon hamivideo-icon" style={style}>H</span>;
      break;
    case 'iqiyi':
      fallback = <span className="platform-icon iqiyi-icon" style={style}>iQ</span>;
      break;
    case 'crunchyroll':
      fallback = <span className="platform-icon crunchy-icon" style={style}>C</span>;
      break;
    case 'youtube':
    case 'muse_tw':
    case 'muse_hk':
    case 'ani_one':
    case 'ani_one_asia':
    case 'tropics':
      fallback = <span className="platform-icon youtube-icon" style={style}><Play size={ytSize} fill="currentColor" /></span>;
      break;
    case 'viu':
      fallback = <span className="platform-icon viu-icon" style={style}>V</span>;
      break;
    case 'mytv':
      fallback = <span className="platform-icon mytv-icon" style={style}>my</span>;
      break;
    case 'abema':
      fallback = <span className="platform-icon abema-icon" style={style}>A</span>;
      break;
    case 'nicovideo':
      fallback = <span className="platform-icon nico-icon" style={style}>N</span>;
      break;
    case 'danime':
      fallback = <span className="platform-icon danime-icon" style={style}>d</span>;
      break;
    case 'unext':
      fallback = <span className="platform-icon unext-icon" style={style}>U</span>;
      break;
    default:
      fallback = <span className="platform-icon default-icon" style={style}><Film size={iconSize} /></span>;
      break;
  }
  return <PlatformLogoImage site={site} fallback={fallback} size={size} />;
};
