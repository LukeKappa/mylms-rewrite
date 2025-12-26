'use client';

import { useState, useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import '@/app/moodle-content.css';

import { ChevronDown, ChevronRight, ExternalLink, FileText, Link as LinkIcon, FileQuestion, MessageSquare, BookText, FolderOpen, Database, Calendar, ArrowUp } from 'lucide-react';
import { backendClient } from '@/lib/backendClient';
import { dbService } from '@/lib/indexedDB';
import { isMoodleUrl } from '@/config/moodle';

interface Activity {
  name: string;
  url: string;
  type: string;
  modname: string;
}

interface ActivityItemProps {
  activity: Activity;
}

const iconMap: Record<string, any> = {
  resource: FileText,
  assign: FileQuestion,
  quiz: FileQuestion,
  forum: MessageSquare,
  page: BookText,
  url: LinkIcon,
  folder: FolderOpen,
  data: Database,
  database: Database,
  attendance: Calendar,
  book: BookText,
  lesson: BookText
};

function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);

    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    const tocElement = document.getElementById('table-of-contents');
    if (tocElement) {
        tocElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
        const contentElement = document.querySelector('.activity-content');
        if (contentElement) {
            contentElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
      <button
        onClick={scrollToTop}
        className="bg-neutral-900/90 hover:bg-neutral-800 text-neutral-300 border border-neutral-700 hover:border-neutral-600 p-3 rounded-full shadow-lg backdrop-blur-sm transition-all duration-300 flex items-center gap-2 group"
        aria-label="Scroll to top"
      >
        <ArrowUp size={20} className="group-hover:-translate-y-1 transition-transform text-white" />
        <span className="text-sm font-medium pr-1">Back to Top</span>
      </button>
    </div>
  );
}

function renderMathInHtml(html: string): string {
  if (!html) return '';
  
  let processed = html;

  // First, decode HTML entities that might interfere with LaTeX
  // These often cause KaTeX parse errors
  processed = processed.replace(/&nbsp;/g, ' ');
  processed = processed.replace(/&amp;nbsp;/g, ' ');
  processed = processed.replace(/&amp;/g, '&');
  processed = processed.replace(/&lt;/g, '<');
  processed = processed.replace(/&gt;/g, '>');
  processed = processed.replace(/&quot;/g, '"');
  processed = processed.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)));
  
  // Fix common LaTeX issues from HTML encoding
  // Backslashes often get escaped
  processed = processed.replace(/\\\\([a-zA-Z])/g, '\\$1');

  // Helper function to safely render with KaTeX
  const safeRender = (tex: string, displayMode: boolean): string => {
    try {
      // Clean the tex string
      let cleanTex = tex
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ')
        .trim();
      
      return katex.renderToString(cleanTex, { 
        displayMode, 
        throwOnError: false,
        strict: false,
        trust: true,
        output: 'html'
      });
    } catch (e) {
      console.warn('KaTeX render failed:', e);
      return `<span class="math-fallback">${tex}</span>`;
    }
  };

  // Replace display math $$...$$
  processed = processed.replace(/\$\$([\s\S]+?)\$\$/g, (match, tex) => {
    return safeRender(tex, true);
  });

  // Replace inline math $...$ (be careful not to match currency)
  // Only match if there's actual math content (contains backslash, ^, _, or looks like math)
  processed = processed.replace(/([^\\$]|^)\$([^$\n]+?)\$/g, (match, prefix, tex) => {
    // Skip if it looks like currency (number followed by nothing else)
    if (/^\d+(\.\d+)?$/.test(tex.trim())) {
      return match;
    }
    return prefix + safeRender(tex, false);
  });

  // Replace \(...\) - inline math (allow any content including parentheses)
  processed = processed.replace(/\\\((.+?)\\\)/g, (match, tex) => {
    return safeRender(tex, false);
  });

  // Replace \[...\] - display math
  processed = processed.replace(/\\\[([\s\S]+?)\\\]/g, (match, tex) => {
    return safeRender(tex, true);
  });

  // Replace \begin{equation}...\end{equation}
  processed = processed.replace(/\\begin\{equation\}([\s\S]+?)\\end\{equation\}/g, (match, tex) => {
    return safeRender(tex.trim(), true);
  });

  // Replace \begin{align}...\end{align} and \begin{align*}...\end{align*}
  processed = processed.replace(/\\begin\{align\*?\}([\s\S]+?)\\end\{align\*?\}/g, (match, tex) => {
    return safeRender(`\\begin{aligned}${tex.trim()}\\end{aligned}`, true);
  });

  return processed;
}

// Generate a simple hash from a string to use as a unique ID
function getUniqueIdFromUrl(url: string): string {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

function processHtmlForTOC(html: string, uniquePrefix: string) {
  if (!html) return { html: '', toc: [] };

  const toc: { id: string; text: string; level: number }[] = [];
  let headingCount = 0;

  // Match h1-h6 tags to capture all heading levels
  const processedHtml = html.replace(/\<(h[1-6])([^\>]*)\>(.*?)\<\/\1\>/gi, (match, tag, attrs, content) => {
    const level = parseInt(tag.charAt(1));
    
    // Create a temporary div to properly extract text content from HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    const text = tempDiv.textContent?.trim() || '';
    
    if (!text) return match;

    // Use unique prefix to avoid ID collisions between different activities
    const id = `heading-${uniquePrefix}-${headingCount++}`;
    toc.push({ id, text, level });
    
    // Check if id already exists in attrs
    if (attrs.includes('id=')) {
      // Extract existing ID and use it (with prefix to ensure uniqueness)
      const idMatch = attrs.match(/id=["']([^"']+)["']/);
      if (idMatch) {
        const uniqueId = `${uniquePrefix}-${idMatch[1]}`;
        toc[toc.length - 1].id = uniqueId;
        return `<${tag} id="${uniqueId}"${attrs.replace(/id=["'][^"']+["']/, '')}>${content}</${tag}>`;
      }
    }
    
    // Add our ID to the tag
    return `<${tag} id="${id}"${attrs}>${content}</${tag}>`;
  });

  return { html: processedHtml, toc };
}

export function ActivityItem({ activity }: ActivityItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPrefetching, setIsPrefetching] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [toc, setToc] = useState<{ id: string; text: string; level: number }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState(activity.url);
  const prefetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasPrefetchedRef = useRef(false);

  const fetchContent = async (url: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Check IndexedDB first
      const cachedContent = await dbService.getActivity(url);
      if (cachedContent) {
        console.log('[ActivityItem] Cache hit (IndexedDB):', url);
        const { html, toc: newToc } = processHtmlForTOC(cachedContent, getUniqueIdFromUrl(url));
        setContent(html);
        setToc(newToc);
        setIsLoading(false);
        return;
      }

      // Get token from localStorage
      const token = localStorage.getItem('moodle_token');
      if (!token) {
        setError('Not authenticated');
        setIsLoading(false);
        return;
      }

      // Fetch from Rust backend (which cleans the HTML)
      console.log('[ActivityItem] Fetching from Rust backend:', url);
      const result = await backendClient.getActivityContent(token, url);
      
      if (!result.success || result.error) {
        setError(result.error || 'Failed to fetch content');
      } else if (result.content) {
        const { html, toc: newToc } = processHtmlForTOC(result.content, getUniqueIdFromUrl(url));
        setContent(html);
        setToc(newToc);
        
        // Save to IndexedDB (save cleaned content)
        dbService.saveActivity(url, result.content).catch((e: unknown) => console.error('Failed to save to DB:', e));
      }
    } catch (err) {
      console.error('[ActivityItem] Error:', err);
      setError('Failed to load content');
    } finally {
      setIsLoading(false);
    }
  };

  // Prefetch content on hover (with 200ms delay to avoid unnecessary fetches)
  const handleMouseEnter = () => {
    // Don't prefetch if we already have content or if already loading/prefetching
    if (content || isLoading || isPrefetching || hasPrefetchedRef.current) return;
    
    prefetchTimeoutRef.current = setTimeout(async () => {
      // Double-check we still need to prefetch
      if (content || isLoading || hasPrefetchedRef.current) return;
      
      hasPrefetchedRef.current = true;
      setIsPrefetching(true);
      
      try {
        // Check cache first
        const cachedContent = await dbService.getActivity(currentUrl);
        if (cachedContent) {
          const { html, toc: newToc } = processHtmlForTOC(cachedContent, getUniqueIdFromUrl(currentUrl));
          setContent(html);
          setToc(newToc);
          console.log('[Prefetch] Cache hit:', activity.name);
          return;
        }
        
        // Fetch from backend
        const token = localStorage.getItem('moodle_token');
        if (!token) return;
        
        console.log('[Prefetch] Starting:', activity.name);
        const result = await backendClient.getActivityContent(token, currentUrl);
        
        if (result.success && result.content) {
          const { html, toc: newToc } = processHtmlForTOC(result.content, getUniqueIdFromUrl(currentUrl));
          setContent(html);
          setToc(newToc);
          dbService.saveActivity(currentUrl, result.content).catch(console.error);
          console.log('[Prefetch] Complete:', activity.name);
        }
      } catch (e) {
        console.warn('[Prefetch] Failed:', e);
      } finally {
        setIsPrefetching(false);
      }
    }, 200); // 200ms delay before prefetching
  };
  
  const handleMouseLeave = () => {
    // Cancel pending prefetch if mouse leaves before delay
    if (prefetchTimeoutRef.current) {
      clearTimeout(prefetchTimeoutRef.current);
      prefetchTimeoutRef.current = null;
    }
  };

  const handleToggle = async () => {
    if (!isExpanded) {
      // Only fetch if we don't have content and aren't already loading/prefetching
      if (!content && !isLoading && !isPrefetching) {
        await fetchContent(currentUrl);
      }
    }
    
    setIsExpanded(!isExpanded);
  };

  const handleContentClick = async (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const link = target.closest('a');
    
    if (link && link.href) {
      // Check if it's a TOC link
      if (link.hash && link.hash.startsWith('#heading-')) {
        e.preventDefault();
        const id = link.hash.substring(1);
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
        return;
      }

      // Check if it's a Moodle link (internal navigation)
      if (isMoodleUrl(link.href)) {
        e.preventDefault();
        
        // Update current URL and fetch new content
        setCurrentUrl(link.href);
        await fetchContent(link.href);
        
        // Scroll to top of content
        const contentArea = e.currentTarget.querySelector('.activity-content');
        if (contentArea) {
          contentArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    }
  };

  const Icon = iconMap[activity.modname] || FileText;

  return (
    <div className="border-b border-neutral-800 last:border-b-0">
      {/* Activity Header - Clickable, prefetch on hover */}
      <div
        onClick={handleToggle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="flex items-center gap-4 p-4 hover:bg-neutral-800/50 transition-colors cursor-pointer group"
      >
        <div className="p-2 bg-neutral-800 rounded-lg text-neutral-400 group-hover:bg-white group-hover:text-black transition-colors flex-shrink-0">
          <Icon size={20} />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium">{activity.name}</p>
          <p className="text-xs text-neutral-500 uppercase tracking-wider">{activity.type}</p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <a
            href={activity.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-2 text-neutral-600 hover:text-neutral-400 transition-colors"
            title="Open in new tab"
          >
            <ExternalLink size={16} />
          </a>
          
          {isExpanded ? <ChevronDown size={20} className="text-neutral-400" /> : <ChevronRight size={20} className="text-neutral-400" />}
        </div>
      </div>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="border-t border-neutral-800/50" onClick={handleContentClick}>
          {isLoading ? (
            <div className="py-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              <p className="mt-2 text-neutral-500 text-sm">Loading content...</p>
            </div>
          ) : error ? (
            <div className="py-4 text-center text-red-400 text-sm">
              <p>{error}</p>
            </div>
          ) : content ? (
            <>
              <div className="relative">
                {toc.length > 0 && (
                  <div id="table-of-contents" className="mb-6 p-4 bg-neutral-800/50 rounded-lg border border-neutral-800">
                    <p className="text-sm font-medium text-neutral-400 mb-2 uppercase tracking-wider">Table of Contents</p>
                    <ul className="space-y-1">
                      {toc.map((item, idx) => (
                        <li key={`${item.id}-${idx}`} style={{ paddingLeft: `${(item.level - 1) * 0.75}rem` }}>
                          <a 
                            href={`#${item.id}`}
                            className="text-sm text-blue-400 hover:text-blue-300 hover:underline block py-0.5"
                          >
                            {item.text}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div 
                  className="html-content p-4 bg-neutral-900 w-full"
                  dangerouslySetInnerHTML={{ __html: renderMathInHtml(content) }}
                />
                <ScrollToTopButton />
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
