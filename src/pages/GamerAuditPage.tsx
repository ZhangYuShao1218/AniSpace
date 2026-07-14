import React, { useState, useMemo } from 'react';
import { useAnime } from '@/contexts/AnimeContext';
import type { Anime } from '@/types';
import './GamerAuditPage.css';

interface WorkItem {
  id: string;
  titleZh: string;
  titleJa?: string;
  yearSeason?: string;
  url: string;
  sn: string;
  isVideoUrl: boolean;
  isExtra: boolean;
  cover?: string;
}

interface IPGroup {
  ipName: string;
  works: WorkItem[];
  hasDuplicateSn: boolean;
  duplicateSns: string[];
}

export const GamerAuditPage: React.FC = () => {
  const { allAnime } = useAnime();
  const [overrideData, setOverrideData] = useState<Record<string, any>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'duplicate' | 'refOnly'>('all');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  React.useEffect(() => {
    fetch('/custom_override.json')
      .then(res => res.json())
      .then(data => setOverrideData(data || {}))
      .catch(() => {});
  }, []);

  const ipGroups: IPGroup[] = useMemo(() => {
    if (!allAnime || allAnime.length === 0) return [];

    const getMasterIP = (m: Anime) => {
      const ov = overrideData[m.id];
      let t = (ov?.titleZh || m.titleZh || '').replace(/^【|】$/g, '').replace(/^(劇場版|電影版|OVA)\s*/, '').trim();
      
      const knownIPs = [
        '鬼滅之刃','進擊的巨人','刀劍神域','關於我轉生變成史萊姆這檔事','Re：從零開始的異世界生活','Re:從零開始的異世界生活',
        '為美好的世界獻上祝福！','出包王女','約會大作戰','哥布林殺手','無職轉生','歡迎來到實力至上主義的教室',
        '這個勇者明明超強卻過分慎重','輝夜姬想讓人告白','暮蟬悲鳴時','寒蟬鳴泣之時','一拳超人','心靈判官','PSYCHO-PASS',
        '暗殺教室','狂賭之淵','潮與虎','排球少年','我的英雄學院','魔法禁書目錄','科學超電磁砲','鶺鴒女神','信蜂',
        '問答魔法學院','K-ON！輕音部','夏目友人帳','魯邦三世','名偵探柯南','航海王','海賊王','死神','BLEACH',
        '火影忍者','銀魂','JoJo的奇妙冒險','JOJO的奇妙冒險','五等分的新娘','孤獨搖滾','我推的孩子','間諜家家酒',
        '水星的魔女','盾之勇者成名錄','OVERLORD','不時輕聲地以俄語遮羞的鄰座艾莉同學','拳願阿修羅','轉生就是劍',
        '我想成為影之強者！','魔王學院的不適任者','異世界悠閒農家','婚戒物語','賽馬娘','工作細胞','搖曳露營',
        '魔法少女小圓','庫洛魔法使','精靈寶可夢','數碼寶貝','遊戯王','遊戲王','幸運☆星','涼宮春日的憂鬱',
        'fate/stay night','fate/zero','fate/kaleid','女性向遊戲世界對路人角色很不友好','骸骨騎士大人異世界冒險中'
      ];

      for (const k of knownIPs) {
        if (t.toLowerCase().includes(k.toLowerCase())) {
          return k.replace('Re:從零開始的異世界生活', 'Re：從零開始的異世界生活');
        }
      }

      t = t.replace(/[\s\-_～]*(?:第[一二三四五六七八九十0-9]+[季期羽部分篇]|Season\s*[0-9]+|S[0-9]+|Part\s*[0-9]+|[0-9]+st|[0-9]+nd|[0-9]+rd|[0-9]+th|出題篇|解答篇|反擊篇|奪還篇|完結篇|總集篇|前篇|後篇|中篇|上篇|下篇|記憶篇|結界篇|特別篇|擴～爆發～|業|卒|煌|禮|解|II|III|IV|V|VI|Ⅱ|Ⅲ|Ⅳ|Ⅴ|Ⅵ|OAD|OVA)+(?:\s*-.*|\s*～.*|\s*:.*|\s*：.*|$)/gi, '').trim();
      if (t.includes(' - ') && t.split(' - ')[0].length >= 3) t = t.split(' - ')[0];
      if (t.includes('～') && t.split('～')[0].length >= 3) t = t.split('～')[0];
      if (t.includes('：') && t.split('：')[0].length >= 3) t = t.split('：')[0];
      if (t.includes(':') && t.split(':')[0].length >= 3) t = t.split(':')[0];
      return t.trim();
    };

    const map = new Map<string, WorkItem[]>();

    allAnime.forEach((m: Anime) => {
      const ov = overrideData[m.id];
      const gamer = m.streamings?.find((s: any) => s.site === 'gamer' || s.site === 'gamer_hk' || (s.name && s.name.includes('動畫瘋')));
      if (gamer && gamer.url) {
        const ipName = getMasterIP(m);
        if (!ipName) return;

        if (!map.has(ipName)) map.set(ipName, []);
        
        let sn = '';
        const snMatch = gamer.url.match(/sn=([0-9]+)/);
        if (snMatch) sn = snMatch[1];

        const isExtra = Boolean(
          ov && ((ov as any).extraStreamings || (ov as any).extraStreaming)?.some((e: any) => e.site === 'gamer' || e.url?.includes('gamer.com.tw'))
        );

        map.get(ipName)!.push({
          id: m.id,
          titleZh: ov?.titleZh || m.titleZh || '',
          titleJa: ov?.titleJa || m.titleJa || '',
          yearSeason: m.yearSeason || '',
          url: gamer.url,
          sn,
          isVideoUrl: gamer.url.includes('animeVideo.php'),
          isExtra,
          cover: ov?.coverImage || m.coverImageGamer || m.coverImageAniList || m.coverImage
        });
      }
    });

    const result: IPGroup[] = [];

    map.forEach((works, ipName) => {
      if (works.length > 1) {
        works.sort((a, b) => (b.yearSeason || '').localeCompare(a.yearSeason || ''));

        const snCounts = new Map<string, number>();
        works.forEach(w => {
          if (w.sn) snCounts.set(w.sn, (snCounts.get(w.sn) || 0) + 1);
        });

        const duplicateSns = Array.from(snCounts.entries())
          .filter(([sn, count]) => count > 1 && sn !== '')
          .map(([sn]) => sn);

        result.push({
          ipName,
          works,
          hasDuplicateSn: duplicateSns.length > 0,
          duplicateSns
        });
      }
    });

    return result.sort((a, b) => b.works.length - a.works.length || a.ipName.localeCompare(b.ipName));
  }, [allAnime, overrideData]);

  const filteredGroups = useMemo(() => {
    return ipGroups.filter(g => {
      const matchQuery = !searchQuery || 
        g.ipName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.works.some(w => w.titleZh.toLowerCase().includes(searchQuery.toLowerCase()) || w.id.includes(searchQuery));

      if (!matchQuery) return false;

      if (filterMode === 'duplicate') return g.hasDuplicateSn;
      if (filterMode === 'refOnly') return g.works.some(w => !w.isVideoUrl);
      return true;
    });
  }, [ipGroups, searchQuery, filterMode]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(text);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const totalWorks = useMemo(() => ipGroups.reduce((acc, g) => acc + g.works.length, 0), [ipGroups]);
  const duplicateIpCount = useMemo(() => ipGroups.filter(g => g.hasDuplicateSn).length, [ipGroups]);

  if (!allAnime || allAnime.length === 0) {
    return (
      <div className="audit-loading">
        <div className="spinner"></div>
        <p>正在載入並解析多季動畫授權清單...</p>
      </div>
    );
  }

  return (
    <div className="gamer-audit-container">
      <div className="audit-header">
        <div className="audit-header-badge">🛑 唯讀測試檢閱專頁（不會修改任何資料）</div>
        <h1 className="audit-title">巴哈動畫瘋 · 多季與系列 IP 播放連結手動檢驗表</h1>
        <p className="audit-subtitle">
          整理資料庫中所有有分季度、或一個 IP 底下擁有多部作品的動畫系列，顯示個別作品名稱與目前綁定的巴哈網址，點擊網址可立即開啟檢查。
        </p>

        <div className="audit-stats-grid">
          <div className="stat-card">
            <span className="stat-value">{ipGroups.length}</span>
            <span className="stat-label">多作品 IP 系列總數</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{totalWorks}</span>
            <span className="stat-label">系列作品總筆數</span>
          </div>
          <div className="stat-card warning">
            <span className="stat-value">{duplicateIpCount}</span>
            <span className="stat-label">含有相同 SN 連結之 IP (疑似錯綁)</span>
          </div>
        </div>

        <div className="audit-controls">
          <div className="audit-search-box">
            <input
              type="text"
              placeholder="搜尋 IP 系列名稱、作品標題或 ID..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="audit-clear-btn" onClick={() => setSearchQuery('')}>✕</button>
            )}
          </div>

          <div className="audit-filter-tabs">
            <button
              className={`audit-filter-tab ${filterMode === 'all' ? 'active' : ''}`}
              onClick={() => setFilterMode('all')}
            >
              全部多季系列 ({ipGroups.length})
            </button>
            <button
              className={`audit-filter-tab ${filterMode === 'duplicate' ? 'active' : ''}`}
              onClick={() => setFilterMode('duplicate')}
            >
              ⚠️ 疑似 SN 重複/錯綁 ({duplicateIpCount})
            </button>
            <button
              className={`audit-filter-tab ${filterMode === 'refOnly' ? 'active' : ''}`}
              onClick={() => setFilterMode('refOnly')}
            >
              🔄 包含舊版 Ref 網址 ({ipGroups.filter(g => g.works.some(w => !w.isVideoUrl)).length})
            </button>
          </div>
        </div>
      </div>

      <div className="audit-list">
        {filteredGroups.length === 0 ? (
          <div className="audit-empty-state">
            <p>找不到符合條件的多季系列或作品。</p>
          </div>
        ) : (
          filteredGroups.map(group => (
            <div key={group.ipName} className={`ip-group-card ${group.hasDuplicateSn ? 'has-duplicate' : ''}`}>
              <div className="ip-group-header">
                <div className="ip-title-area">
                  <h2 className="ip-title">{group.ipName}</h2>
                  <span className="work-count-badge">{group.works.length} 部作品</span>
                  {group.hasDuplicateSn && (
                    <span className="duplicate-alert-badge">
                      ⚠️ 有 {group.duplicateSns.length} 組 SN 被不同季度重複使用 ({group.duplicateSns.map(s => `sn=${s}`).join(', ')})
                    </span>
                  )}
                </div>
              </div>

              <div className="works-table-wrapper">
                <table className="works-table">
                  <thead>
                    <tr>
                      <th style={{ width: '8%' }}>ID</th>
                      <th style={{ width: '12%' }}>季度</th>
                      <th style={{ width: '32%' }}>個別作品名稱 (中文/日文)</th>
                      <th style={{ width: '12%' }}>狀態狀態</th>
                      <th style={{ width: '36%' }}>目前巴哈網址 (點擊直接前往)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.works.map(work => {
                      const isDuplicateSn = group.duplicateSns.includes(work.sn);
                      return (
                        <tr key={work.id} className={isDuplicateSn ? 'row-duplicate' : ''}>
                          <td>
                            <span className="work-id">{work.id.replace('anilist-', '')}</span>
                          </td>
                          <td>
                            <span className="work-season">{work.yearSeason || '未標註'}</span>
                          </td>
                          <td>
                            <div className="work-title-box">
                              <span className="title-zh">{work.titleZh}</span>
                              {work.titleJa && <span className="title-ja">{work.titleJa}</span>}
                            </div>
                          </td>
                          <td>
                            <div className="badges-flex">
                              {work.isExtra ? (
                                <span className="audit-badge badge-extra" title="寫入 custom_override 的永久防護連結">🔒 手動鎖定</span>
                              ) : (
                                <span className="audit-badge badge-auto" title="自動自 bangumi-data 或爬蟲對齊">🤖 自動同步</span>
                              )}
                              {isDuplicateSn && (
                                <span className="audit-badge badge-warn" title="多部作品使用完全相同的 SN 網址">⚠️ SN重複</span>
                              )}
                              {!work.isVideoUrl && (
                                <span className="audit-badge badge-ref" title="為 animeRef.php 參考轉向頁">🔄 Ref頁</span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="url-action-flex">
                              <a
                                href={work.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`gamer-url-link ${isDuplicateSn ? 'url-warn' : ''}`}
                                title="點擊在新分頁中前往巴哈動畫瘋檢驗"
                              >
                                {work.url}
                              </a>
                              <button
                                className="copy-url-btn"
                                onClick={() => copyToClipboard(work.url)}
                                title="複製網址"
                              >
                                {copiedUrl === work.url ? '✓ 已複製' : '📋 複製'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
